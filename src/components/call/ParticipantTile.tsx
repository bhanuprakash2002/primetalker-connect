// src/components/call/ParticipantTile.tsx
import React from "react";
import MicLevel from "./MicLevel";
import { Mic, MicOff } from "lucide-react";

export default function ParticipantTile({
  name,
  isLocal = false,
  muted = false,
  level = 0,
}: {
  name: string;
  isLocal?: boolean;
  muted?: boolean;
  level?: number;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-md">
      {/* Dark audio/video placeholder */}
      <div className="h-56 flex items-center justify-center">
        <div className="text-slate-300 text-lg">{isLocal ? "You" : name}</div>
      </div>

      {/* Overlay bottom bar */}
      <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between bg-black/30 px-4 py-2 rounded-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-slate-700 flex items-center justify-center text-sm">{name.split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
          <div className="text-sm">
            <div className="font-medium text-white">{name} {isLocal ? "(You)" : ""}</div>
            <div className="text-xs text-slate-300">{muted ? <span className="inline-flex items-center gap-1"><MicOff size={12}/>Muted</span> : <span className="inline-flex items-center gap-1"><Mic size={12}/>Speaking</span>}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MicLevel level={level} />
        </div>
      </div>
    </div>
  );
}
