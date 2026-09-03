"use client";

import React, { useState } from "react";
import { useOffline } from "@/context/OfflineContext";
import { useToast } from "@/context/ToastContext";
import { useAccessibility } from "@/context/AccessibilityContext";

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useOffline();
  const { addToast } = useToast();
  const { speak } = useAccessibility();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);

  // If online or manually dismissed for this session, don't show
  if (isOnline || dismissed) return null;

  const handleCheckConnection = async () => {
    setChecking(true);
    speak("Testing connection...", true);

    try {
      const response = await fetch("/favicon.svg?t=" + Date.now(), { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        addToast("Connection restored!", "success");
        speak("Connection restored. You are online.", true);
      } else {
        addToast("Still offline — Core tools remain ready", "info");
        speak("Still offline. Local speech, translation, and captions are active.", true);
      }
    } catch {
      addToast("Still offline — Core tools remain ready", "info");
      speak("Still offline. Local tools are fully functional.", true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-zinc-950 px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-sm font-semibold transition-all animate-slide-up z-50 sticky top-0 border-b border-amber-600"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="material-symbols-outlined text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          cloud_off
        </span>
        <span className="truncate">
          <strong className="font-extrabold">Offline Mode:</strong> Speech, Speak For Me, Captions & Local Translation active without internet.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCheckConnection}
          disabled={checking}
          className="px-3 py-1 bg-black/15 hover:bg-black/25 text-black font-bold rounded-lg text-xs cursor-pointer active:scale-95 transition-transform"
          aria-label="Test connection"
        >
          {checking ? "Checking..." : "Test Connection"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg hover:bg-black/15 flex items-center justify-center cursor-pointer text-black"
          aria-label="Dismiss offline banner"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
};
