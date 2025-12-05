// src/components/call/RightPanel.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RightPanel({
  transcripts,
  onClose,
  isTranslationOn,
  toggleTranslation,
}: {
  transcripts: any[];
  onClose: () => void;
  isTranslationOn: boolean;
  toggleTranslation: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="text-lg font-semibold">Live Translation</div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{isTranslationOn ? "On" : "Off"}</Badge>
          <Button variant="ghost" onClick={onClose}><X /></Button>
        </div>
      </div>

      <div className="p-4 overflow-auto flex-1 space-y-3">
        {transcripts.length === 0 && <div className="text-slate-400">No translations yet</div>}
        {transcripts.map((t: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-slate-800/60">
            <div className="flex justify-between items-center mb-1">
              <div className="font-medium">{t.userType === localStorage.getItem("role") ? "You" : "Partner"}</div>
              <Badge variant="outline">{t.sourceLang} → {t.targetLang}</Badge>
            </div>
            <div className="text-xs text-slate-300 italic mb-1">{t.originalText}</div>
            <div className="text-sm">{t.translatedText}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800">
        <div className="flex gap-2">
          <Button size="sm" onClick={toggleTranslation} variant={isTranslationOn ? "default" : "outline"}>
            {isTranslationOn ? "Pause Translation" : "Resume Translation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
