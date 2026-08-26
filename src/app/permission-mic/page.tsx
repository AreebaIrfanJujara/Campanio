"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function PermissionMicPage() {
  const router = useRouter();
  const { speak, userProfile } = useAccessibility();
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  const requestMicrophone = async () => {
    setStatus("requesting");
    speak("Requesting microphone permissions. Please allow access on your browser popup.", true);

    try {
      // Query browser audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop stream tracks immediately
      stream.getTracks().forEach((track) => track.stop());
      
      setStatus("granted");
      speak("Microphone permission granted successfully. Let's enter the home dashboard.", true);
      
      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatus("denied");
      speak("Permission was denied. You can still use Companio, but speech features will be mocked.", true);
      
      setTimeout(() => {
        router.push("/home");
      }, 2000);
    }
  };

  const handleSkip = () => {
    speak("Skipping permission. Opening home dashboard.", true);
    router.push("/home");
  };

  return (
    <div className="flex-grow flex flex-col justify-center items-center max-w-md mx-auto w-full px-margin-edge py-stack-lg gap-8 text-center">
      {/* Visual illustration of microphone */}
      <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center relative">
        <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          mic
        </span>
        {status === "requesting" && (
          <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-60"></div>
        )}
      </div>

      {/* Info Block */}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-on-surface">Enable Voice Assistant</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Companio uses your microphone to transcribe surrounding speech in real time, and let you communicate with the voice helper.
        </p>
      </div>

      {/* Permission Feedback */}
      {status === "granted" && (
        <div className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 font-bold py-2 px-4 rounded-full border border-green-500/30">
          <span className="material-symbols-outlined">check_circle</span>
          Access Granted
        </div>
      )}
      {status === "denied" && (
        <div className="flex items-center gap-2 bg-red-500/10 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded-full border border-red-500/30">
          <span className="material-symbols-outlined">cancel</span>
          Access Denied
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full mt-4">
        <button
          onClick={requestMicrophone}
          disabled={status === "requesting" || status === "granted"}
          className="w-full h-[56px] rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-container disabled:bg-outline/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          style={{
            minHeight: userProfile.preset === "motor" ? "72px" : "56px",
          }}
        >
          <span className="material-symbols-outlined">settings_voice</span>
          {status === "requesting" ? "Requesting..." : "Enable Microphone"}
        </button>

        <button
          onClick={handleSkip}
          disabled={status === "requesting" || status === "granted"}
          className="w-full h-[56px] rounded-xl bg-surface-container border-2 border-outline hover:bg-surface-container-high active:scale-[0.98] text-on-surface-variant font-bold text-lg transition-all flex items-center justify-center cursor-pointer"
          style={{
            minHeight: userProfile.preset === "motor" ? "72px" : "56px",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
