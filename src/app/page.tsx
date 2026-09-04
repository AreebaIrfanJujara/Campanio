"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Soundwave } from "@/components/Soundwave";

export default function WelcomePage() {
  const router = useRouter();
  const { speak } = useAccessibility();

  // Browsers require a user gesture before allowing speechSynthesis audio — this call may silently no-op on a cold load with zero prior interaction. The tap handler below is the guaranteed-to-work path.
  useEffect(() => {
    speak("Welcome to Companio. Tap anywhere on the screen to begin setup.", true);
  }, [speak]);

  const handleTapToBegin = () => {
    speak("Beginning setup. Opening permissions request screen.", true);
    router.push("/permission-mic");
  };

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      onClick={handleTapToBegin}
      className="w-full h-full min-h-[580px] flex-grow relative flex flex-col items-center justify-between p-6 bg-gradient-to-br from-[#3b5edb] to-[#006b5d] text-white border-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] focus-visible:ring-inset z-10 text-left overflow-hidden select-none"
      aria-label="Welcome screen. Tap anywhere to begin setup."
    >
      {/* Top spacing */}
      <div className="h-8 w-full"></div>

      {/* Center Content: Logo & Soundwave */}
      <motion.div
        initial={{ scale: 0.9, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="flex flex-col items-center justify-center gap-7 z-20 my-auto"
      >
        {/* Companio Wordmark */}
        <h1 className="font-semibold text-5xl text-white tracking-tight font-display-ocr drop-shadow-md">
          Companio
        </h1>

        {/* Animated Soundwave Icon */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-2xl relative"
        >
          {/* Inner pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse-ring"></div>
          <Soundwave color="bg-white" size="lg" />
        </motion.div>
      </motion.div>

      {/* Bottom Caption Overlay */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.2 }}
        className="w-full mb-3 z-20"
      >
        <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-outline-variant/30 text-center flex flex-col items-center transition-transform">
          <span className="material-symbols-outlined text-primary mb-3 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            record_voice_over
          </span>
          <p className="text-2xl font-bold text-on-surface mb-1.5 font-display-ocr">
            Hi, I'm Companio.
          </p>
          <p className="text-lg text-on-surface-variant mb-5">
            I'll guide you by voice.
          </p>

          {/* Explicit action cue */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 bg-primary px-7 py-3.5 rounded-full text-base font-semibold text-white animate-bounce shadow-lg"
          >
            <span>Tap anywhere to begin</span>
            <span className="material-symbols-outlined text-xl">touch_app</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Abstract decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-teal-300/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] rounded-full bg-indigo-500/25 blur-[120px] pointer-events-none"></div>
    </motion.button>
  );
}
