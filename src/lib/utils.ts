console.log("Loaded utils FROM:", import.meta.url);
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ---------------------------------------------
// 🔹 UI Utility Function (keep this)
// ---------------------------------------------
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------
// 🔹 BACKEND BASE URL (your ngrok)
// ---------------------------------------------
export const BASE_URL = "https://twilio-translation-backend.onrender.com";
console.log("BASE_URL:", BASE_URL);

// Basic GET helper
export async function apiGet(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
  });
  console.log("res",res)

  if (!res.ok) {
    console.error(`GET ${endpoint} failed`, await res.text());
    throw new Error(`GET ${endpoint} failed`);
  }
  return res.json();
}

// Basic POST helper
export async function apiPost(endpoint: string, data: any) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.error(`POST ${endpoint} failed`, await res.text());
    throw new Error(`POST ${endpoint} failed`);
  }
  return res.json();
}

// ---------------------------------------------
// 🔹 ROOM APIs
// ---------------------------------------------

// Create a new room
export function createRoom(language: string) {
  const creatorName = localStorage.getItem("username") || "User";
  return apiPost("/create-room", { creatorLanguage: language, creatorName });
}


// Join an existing room
export function joinRoom(roomId: string, language: string) {
  const participantName = localStorage.getItem("username") || "User";
  return apiPost("/join-room", { roomId, participantLanguage: language, participantName });
}


// ---------------------------------------------
// 🔹 TWILIO VOICE TOKEN
// ---------------------------------------------
export function getVoiceToken() {
  return apiGet("/voice-token");
}

// ---------------------------------------------
// 🔹 REAL-TIME TRANSLATION POLLING
// ---------------------------------------------
export function getTranslations(
  roomId: string,
  userType: string,
  since: number
) {
  return apiGet(
    `/get-translations?roomId=${roomId}&userType=${userType}&since=${since}`
  );
}

// ---------------------------------------------
// 🔹 AUDIO UPLOAD FOR STT
// ---------------------------------------------
export async function uploadAudio(formData: FormData) {
  const res = await fetch(`${BASE_URL}/upload-audio`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    console.error("Audio upload failed", await res.text());
    throw new Error("Audio upload failed");
  }
  return res.json();
}
