"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function PermissionMicPage() {
  const router = useRouter();
  const { speak, userProfile } = useAccessibility();
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  const requestMicrophoneAndCamera = async () => {
    setStatus("requesting");
    speak("Requesting microphone and camera permissions. Please allow access on your browser prompt.", true);

    try {
      // Request both audio and video stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      
      setStatus("granted");
      speak("Permissions granted successfully. Proceeding to choose your accessibility profile.", true);
      
      setTimeout(() => {
        router.push("/profile-setup");
      }, 1200);
    } catch {
      // If combined fails, try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((t) => t.stop());
        setStatus("granted");
        speak("Microphone permission granted. Proceeding to profile setup.", true);
        setTimeout(() => {
          router.push("/profile-setup");
        }, 1200);
      } catch {
        setStatus("denied");
        speak("Permission was denied. You can still use text and manual features. Proceeding to profile setup.", true);
        setTimeout(() => {
          router.push("/profile-setup");
        }, 1500);
      }
    }
  };

  const handleSkip = () => {
    speak("Skipping permissions for now. Opening accessibility profile setup.", true);
    router.push("/profile-setup");
  };

  return (
    <div className="flex-grow flex flex-col justify-center items-center w-full px-margin-edge py-stack-lg gap-8 text-center">
      {/* Visual illustration */}
      <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center relative shadow-lg">
        <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          perm_camera_mic
        </span>
        {status === "requesting" && (
          <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-60"></div>
        )}
      </div>

      {/* Info Block */}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-on-surface">Enable Voice & Vision</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Companio uses your microphone and camera to read physical text, narrate obstacles, and transcribe speech in real time.
        </p>
      </div>

      {/* Permission Feedback */}
      {status === "granted" && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 font-bold py-2 px-4 rounded-full border border-green-500/30 animate-slide-up">
          <span className="material-symbols-outlined">check_circle</span>
          Access Granted
        </div>
      )}
      {status === "denied" && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 bg-red-500/10 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded-full border border-red-500/30 animate-slide-up">
          <span className="material-symbols-outlined">cancel</span>
          Access Denied (Manual Mode Active)
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full mt-4">
        <button
          onClick={requestMicrophoneAndCamera}
          disabled={status === "requesting" || status === "granted"}
          className="w-full h-[56px] rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-container disabled:bg-outline/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          style={{
            minHeight: userProfile.preset === "motor" ? "72px" : "56px",
          }}
        >
          <span className="material-symbols-outlined">verified</span>
          {status === "requesting" ? "Requesting..." : "Allow Mic & Camera"}
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
