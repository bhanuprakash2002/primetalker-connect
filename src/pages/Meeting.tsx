// src/pages/Meeting.tsx
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { joinRoom } from "@/lib/utils";
import { BASE_URL } from "@/lib/utils";


import {
  Mic,
  MicOff,
  Phone,
  Users,
  MessageSquare,
  Settings,
  Globe,
  Volume2,
  VolumeX,
} from "lucide-react";

import ParticipantTile from "@/components/call/ParticipantTile";
import ControlBar from "@/components/call/ControlBar";
import RightPanel from "@/components/call/RightPanel";

import { getVoiceToken, getTranslations } from "@/lib/utils";

/**
 * Meeting (Zoom-dark) — backend-driven participant detection
 * - Detects remote participant presence via GET /room-info?roomId=...
 *   (server exposes this route). :contentReference[oaicite:2]{index=2}
 *
 * - Preserves your Twilio Device flow and polling logic (unchanged). :contentReference[oaicite:3]{index=3}
 */

const POLL_INTERVAL = 1500; // transcription poll
const ROOMINFO_POLL = 2000; // poll for partner join before/after connect

export default function Meeting() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const role = localStorage.getItem("role") || "caller";
  const myLanguage = localStorage.getItem("myLanguage") || "en";

  // general UI state
  const [status, setStatus] = useState("Click Start to Join");
  const [started, setStarted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isTranslationOn, setIsTranslationOn] = useState(true);

  const myName = localStorage.getItem("username") || "You";
const [partnerName, setPartnerName] = useState("Partner");


  // transcripts
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const sinceRef = useRef(Date.now());
  const poller = useRef<number | null>(null);

  // Twilio device + connection refs (kept as your original)
  const deviceRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);

  // room-info: does a partner exist?
  const [partnerJoined, setPartnerJoined] = useState(false);

  // local mic meter (basic)
  const [localLevel, setLocalLevel] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterRaf = useRef<number | null>(null);

  // -------------------------
  // HELPERS: fetch room-info from backend
  // -------------------------
 const fetchRoomInfo = useCallback(async () => {
  try {
    if (!roomId) return;

    const res = await fetch(`${BASE_URL}/room-info?roomId=${roomId}`);

    if (res.status === 404) {
      endCall();
      return;
    }

    const json = await res.json();

    setPartnerJoined(Boolean(json.participantLanguage));

    // Set partner's name:
    setPartnerName(
      role === "caller" ? json.receiverName : json.callerName
    );

  } catch (err) {
    console.warn("room-info fetch failed", err);
  }
}, [roomId, role]);



  // poll room-info every ROOMINFO_POLL while started (or before connect)
  useEffect(() => {
    if (!started) return;
    // run immediately then interval
    fetchRoomInfo();
    const id = window.setInterval(fetchRoomInfo, ROOMINFO_POLL);
    return () => window.clearInterval(id);
  }, [started, fetchRoomInfo]);

  // -------------------------
  // Twilio SDK loader
  // -------------------------
  function loadTwilioSDK(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).Twilio?.Device) {
        resolve((window as any).Twilio);
        return;
      }
      const urls = [
        "https://cdn.jsdelivr.net/npm/@twilio/voice-sdk@2.11.0/dist/twilio.min.js",
        "https://unpkg.com/@twilio/voice-sdk@2.11.0/dist/twilio.min.js",
      ];
      let i = 0;
      const tryLoad = () => {
        if (i >= urls.length) return reject("Failed to load Twilio");
        const s = document.createElement("script");
        s.src = urls[i++];
        s.async = true;
        s.onload = () => {
          const Tw = (window as any).Twilio;
          if (Tw?.Device) resolve(Tw);
          else tryLoad();
        };
        s.onerror = tryLoad;
        document.body.appendChild(s);
      };
      tryLoad();
    });
  }

  // -------------------------
  // Local mic meter
  // -------------------------
  async function startLocalMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        for (let k = 0; k < buf.length; k++) sum += buf[k];
        const avg = sum / buf.length;
        const lvl = Math.min(100, Math.round((avg / 255) * 100));
        setLocalLevel(lvl);
        meterRaf.current = requestAnimationFrame(tick);
      };
      meterRaf.current = requestAnimationFrame(tick);
    } catch (err) {
      // user blocked mic or not available
      setLocalLevel(0);
    }
  }

  function stopLocalMeter() {
    if (meterRaf.current) cancelAnimationFrame(meterRaf.current);
    meterRaf.current = null;
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalLevel(0);
  }

  // -------------------------
  // Twilio init + connect flow (keeps your prior implementation)
  // -------------------------
  async function startTwilio() {
    try {
      setStatus("Loading Twilio…");
      const Twilio = await loadTwilioSDK();

      setStatus("Fetching token…");
      const tokenRes: any = await getVoiceToken();
      if (!tokenRes?.token) throw new Error("Missing token");

      const Device = Twilio.Device;
      const device = new Device(tokenRes.token, { codecPreferences: ["opus", "pcmu"] });
      deviceRef.current = device;

      setStatus("Registering…");

      device.on("registered", () => {
        setStatus("Device Ready");
        startCall();
      });

      device.on("connect", (conn: any) => {
  connectionRef.current = conn;
  setStatus("Connected");
  startPolling();
  startLocalMeter();

  // Listen for backend force-disconnect
  conn.on("messageReceived", (msg: any) => {
    try {
      const data = JSON.parse(msg.data);

      if (data.event === "force-disconnect") {
        console.log("⚠️ Forced disconnect from backend:", data.reason);
        endCall();
      }
    } catch {}
  });
});


      device.on("disconnect", () => {
  connectionRef.current = null;
  setStatus("Call Ended");
  stopPolling();
  stopLocalMeter();

  // 🔥 Notify backend user has left
  if (roomId) {
    fetch(`${BASE_URL}/leave-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, userType: role }),
    }).catch(console.error);
  }

  setPartnerJoined(false);
});


      device.on("error", (err: any) => {
        console.error("Device error", err);
        setStatus("Device Error");
      });

      await device.register();
    } catch (err) {
      console.error("StartTwilio error", err);
      setStatus("Init Error");
    }
  }

  // -------------------------
  // Start / end call (same as before)
  // -------------------------
  function startCall() {
    if (!deviceRef.current || !roomId) return;
    setStatus("Connecting…");
    try {
      const conn = deviceRef.current.connect({
        params: {
          roomId,
          userType: role,
          myLanguage,
        },
      });
      connectionRef.current = conn;
    } catch (err) {
      console.error("Call connect error", err);
      setStatus("Connection Failed");
    }
  }

async function endCall() {
  try {
    // Notify backend first (so it can notify the other participant)
    if (roomId) {
      try {
        await fetch(`${BASE_URL}/leave-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, userType: role }),
        });
      } catch (e) { console.warn("leave-room failed", e); }
    }

    // Then disconnect local device
    connectionRef.current?.disconnect?.();
    deviceRef.current?.disconnectAll?.();

  } catch (e) {
    console.warn("endCall error", e);
  } finally {
    setPartnerJoined(false);
    stopPolling();
    stopLocalMeter();
    navigate("/rooms");
  }
}


  // -------------------------
  // Translation polling (unchanged)
  // -------------------------
  async function poll() {
    try {
      const data: any = await getTranslations(roomId!, role, sinceRef.current);
      const items = data?.translations || [];
      if (items.length > 0) {
        setTranscripts((prev) => [...prev, ...items]);
        sinceRef.current = Date.now();
      }
    } catch (err) {
      console.error("Poll error", err);
    }
  }

  function startPolling() {
    if (poller.current) return;
    poller.current = window.setInterval(() => {
      if (isTranslationOn) poll();
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (poller.current) window.clearInterval(poller.current);
    poller.current = null;
  }

  // -------------------------
  // Toggle Mute (defensive)
  // -------------------------
  function toggleMute() {
    try {
      const conn = connectionRef.current;
      if (conn && typeof conn.mute === "function") {
        conn.mute(!isAudioOn);
      } else if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isAudioOn ? false : true));
      }
    } catch (e) {
      console.warn("toggleMute error", e);
    }
    setIsAudioOn((s) => !s);
  }

  // -------------------------
  // Toggle speaker (practical fallback: set volume on audio elements)
  // -------------------------
  function toggleSpeaker() {
    setIsSpeakerOn((s) => {
      const next = !s;
      // find any <audio> elements (Twilio may create them) and set volume
      const audios = Array.from(document.querySelectorAll("audio")) as HTMLAudioElement[];
      audios.forEach((a) => {
        try {
          a.volume = next ? 1 : 0;
        } catch {}
      });
      return next;
    });
  }

  // -------------------------
  // Clean up on unmount
  // -------------------------
  useEffect(() => {
    return () => {
      stopPolling();
      stopLocalMeter();
      try {
        deviceRef.current?.disconnectAll?.();
      } catch {}
    };
  }, []);

  // ----------------------------------------------------
// AUTO JOIN BACKEND AS PARTICIPANT
// ----------------------------------------------------
useEffect(() => {
  if (started && role === "receiver" && roomId) {
    joinRoom(roomId, myLanguage)
      .then(() => console.log("Receiver joined room successfully"))
      .catch((err) => console.error("joinRoom failed:", err));
  }
}, [started, role, roomId, myLanguage]);


  // -------------------------
  // Participants: show "You" always. Show Partner only if partnerJoined === true
  // -------------------------
const participantsToRender = [
  { id: "you", name: myName, isLocal: true, muted: !isAudioOn, level: localLevel },

  ...(partnerJoined
    ? [
        {
          id: "partner",
          name: partnerName,
          isLocal: false,
          muted: false,
          level: 0,
        },
      ]
    : []),
];


  // -------------------------
  // UI: pre-join view
  // -------------------------
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-xl w-full text-center space-y-6">
          <h1 className="text-3xl font-semibold">Join Meeting</h1>
          <p className="text-slate-300">Room: {roomId} • {role} • {myLanguage}</p>
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => {
                setStarted(true);
                // start polling room info immediately so UI reacts faster
                fetchRoomInfo();
                startTwilio();
              }}
            >
              Start Meeting
            </Button>
          </div>
          <p className="text-slate-400 mt-2">{status}</p>
        </div>
      </div>
    );
  }

  // -------------------------
  // Main Zoom-dark UI
  // -------------------------
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold">PrimeTalker Meeting</div>
            <div className="text-sm text-slate-400">Room: {roomId}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-slate-800 text-slate-200">{status}</Badge>
          <Button variant="ghost" onClick={() => setSidebarOpen((s) => !s)} className="text-slate-200">
            <Users />
          </Button>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {participantsToRender.length === 0 ? (
              <div className="text-slate-400">Waiting for participants...</div>
            ) : (
              participantsToRender.map((p) => (
                <ParticipantTile
                  key={p.id}
                  name={p.name}
                  isLocal={p.isLocal}
                  muted={p.muted}
                  level={p.level}
                />
              ))
            )}
          </div>

          {/* If partner not joined show a centered waiting hint */}
          {!partnerJoined && (
            <div className="mt-8 text-center text-slate-400">Waiting for partner to join…</div>
          )}
        </main>

        <aside className={`w-96 border-l border-slate-800 bg-slate-900 transition-transform ${sidebarOpen ? "translate-x-0" : "translate-x-full"} relative`}>
          <RightPanel
            transcripts={transcripts}
            onClose={() => setSidebarOpen(false)}
            isTranslationOn={isTranslationOn}
            toggleTranslation={() => setIsTranslationOn((s) => !s)}
          />
        </aside>
      </div>

      {/* Floating control bar */}
      <div className="fixed left-0 right-0 bottom-6 flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-slate-800/80 backdrop-blur rounded-3xl px-6 py-3 flex items-center gap-6 shadow-2xl border border-slate-700">
          <ControlBar
            isAudioOn={isAudioOn}
            isSpeakerOn={isSpeakerOn}
            onToggleMute={toggleMute}
            onToggleSpeaker={toggleSpeaker}
            onEndCall={endCall}
          />
        </div>
      </div>
    </div>
  );
}
