"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Soundwave } from "@/components/Soundwave";

export default function WelcomePage() {
  const router = useRouter();
  const { speak } = useAccessibility();

  // Speak welcome message on mount
  useEffect(() => {
    speak("Welcome to Companio. Tap anywhere on the screen to begin setup.", true);
  }, []);

  const handleTapToBegin = () => {
    speak("Beginning setup. Opening permissions request screen.", true);
    router.push("/permission-mic");
  };

  return (
    <button
      onClick={handleTapToBegin}
      className="w-full min-h-screen relative flex flex-col items-center justify-between p-margin-edge bg-gradient-to-br from-[#3b5edb] to-[#006b5d] text-white border-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] focus-visible:ring-inset z-10 text-left"
      aria-label="Welcome screen. Tap anywhere to begin setup."
    >
      {/* Top spacing */}
      <div className="h-1/4 w-full"></div>

      {/* Center Content: Logo & Soundwave */}
      <div className="flex flex-col items-center justify-center gap-8 z-20">
        {/* Companio Wordmark */}
        <h1 className="font-semibold text-5xl text-white tracking-tight font-display-ocr drop-shadow-md">
          Companio
        </h1>

        {/* Animated Soundwave Icon */}
        <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl relative">
          {/* Inner pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse-ring"></div>
          <Soundwave color="bg-white" size="lg" />
        </div>
      </div>

      {/* Bottom Caption Overlay */}
      <div className="w-full max-w-md mx-auto mb-10 z-20">
        <div className="bg-[#313030]/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/10 text-center flex flex-col items-center">
          <span className="material-symbols-outlined text-[#ffd400] mb-4 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            record_voice_over
          </span>
          <p className="text-2xl font-bold text-white mb-2 font-display-ocr">
            Hi, I'm Companio.
          </p>
          <p className="text-lg text-zinc-300 mb-6">
            I'll guide you by voice.
          </p>

          {/* Explicit action cue */}
          <div className="inline-flex items-center gap-2 bg-primary px-6 py-3 rounded-full text-base font-semibold text-white animate-bounce mt-4 shadow-lg">
            <span>Tap anywhere to begin</span>
            <span className="material-symbols-outlined text-xl">touch_app</span>
          </div>
        </div>
      </div>

      {/* Abstract decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none"></div>
    </button>
  );
}
