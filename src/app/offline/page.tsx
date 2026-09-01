"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/context/ToastContext";

export default function OfflinePage() {
  const { speak } = useAccessibility();
  const { addToast } = useToast();
  const [quickInput, setQuickInput] = useState("");

  const emergencyPresets = [
    "I need assistance urgently.",
    "Please call for help.",
    "I need a doctor.",
    "Please stay with me.",
  ];

  const handleSpeak = (text: string) => {
    if (!text.trim()) return;
    speak(text, true);
    addToast("Spoke text out loud", "success");
  };

  const handleRetry = () => {
    speak("Checking connection and reloading", true);
    window.location.reload();
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-2xl mx-auto w-full text-on-surface">
      {/* Offline Status Header */}
      <div className="bg-surface-container rounded-3xl p-6 border-2 border-amber-500/40 flex flex-col gap-4 text-center items-center shadow-lg">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border-2 border-amber-500/30">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            cloud_off
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black font-display-ocr">You Are Offline</h1>
          <p className="text-base text-on-surface-variant max-w-md">
            Companio is built offline-first. Your local speech synthesizer, emergency phraseboards, live captioning, and local translations remain completely active.
          </p>
        </div>

        <button
          onClick={handleRetry}
          className="px-6 py-3 bg-primary hover:bg-primary-container text-white font-bold text-base rounded-xl flex items-center gap-2 cursor-pointer shadow active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          Retry Connection
        </button>
      </div>

      {/* Instant Offline Speak Box */}
      <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
        <h2 className="text-xl font-bold border-b border-outline-variant pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">record_voice_over</span>
          Instant Offline Speech
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSpeak(quickInput);
                setQuickInput("");
              }
            }}
            placeholder="Type anything to speak aloud..."
            className="flex-grow h-14 px-4 rounded-xl border-2 border-outline bg-surface text-lg font-bold font-display-ocr focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => {
              handleSpeak(quickInput);
              setQuickInput("");
            }}
            className="h-14 px-5 bg-primary text-white font-bold rounded-xl flex items-center justify-center cursor-pointer active:scale-95 shadow"
          >
            <span className="material-symbols-outlined text-2xl">volume_up</span>
          </button>
        </div>

        {/* Emergency Presets */}
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs uppercase font-black text-red-500 tracking-wider">Emergency Shortcuts</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {emergencyPresets.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleSpeak(phrase)}
                className="p-3 bg-surface border-2 border-red-500/30 text-red-600 dark:text-red-400 hover:border-red-500 rounded-xl font-bold text-sm text-left flex items-center justify-between cursor-pointer active:scale-95 transition-all"
              >
                <span>{phrase}</span>
                <span className="material-symbols-outlined text-base">play_circle</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Available Offline Modules */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-on-surface">Offline-Ready Assistive Modules</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/home/type-to-speak"
            className="p-4 bg-surface-container rounded-2xl border border-outline-variant hover:border-primary flex flex-col gap-1 text-left transition-all"
          >
            <span className="material-symbols-outlined text-primary text-2xl">record_voice_over</span>
            <span className="font-bold text-base text-on-surface">Speak For Me</span>
            <span className="text-xs text-on-surface-variant">Full AAC board & custom presets</span>
          </Link>

          <Link
            href="/home/captions"
            className="p-4 bg-surface-container rounded-2xl border border-outline-variant hover:border-primary flex flex-col gap-1 text-left transition-all"
          >
            <span className="material-symbols-outlined text-emerald-600 text-2xl">closed_caption</span>
            <span className="font-bold text-base text-on-surface">Live Captions</span>
            <span className="text-xs text-on-surface-variant">Speech to text & sound alerts</span>
          </Link>

          <Link
            href="/home/translation"
            className="p-4 bg-surface-container rounded-2xl border border-outline-variant hover:border-primary flex flex-col gap-1 text-left transition-all"
          >
            <span className="material-symbols-outlined text-purple-600 text-2xl">translate</span>
            <span className="font-bold text-base text-on-surface">Local Translation</span>
            <span className="text-xs text-on-surface-variant">Offline phrasebook in 8 languages</span>
          </Link>

          <Link
            href="/home"
            className="p-4 bg-surface-container rounded-2xl border border-outline-variant hover:border-primary flex flex-col gap-1 text-left transition-all"
          >
            <span className="material-symbols-outlined text-blue-600 text-2xl">dashboard</span>
            <span className="font-bold text-base text-on-surface">Main Dashboard</span>
            <span className="text-xs text-on-surface-variant">Access all accessibility tools</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
