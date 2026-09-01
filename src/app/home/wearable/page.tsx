"use client";

import React, { useState } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { wearableBridge, HapticPatternType } from "@/lib/wearableBridge";
import { useToast } from "@/context/ToastContext";

export default function WearablePage() {
  const { speak } = useAccessibility();
  const { addToast } = useToast();

  const [paired, setPaired] = useState<boolean>(true);
  const [lastHaptic, setLastHaptic] = useState<string>("None");
  const [watchMessage, setWatchMessage] = useState<string>("Companio Watch Sync Active");

  const handleTestHaptic = (type: HapticPatternType, label: string) => {
    wearableBridge.triggerHaptic(type);
    setLastHaptic(label);
    setWatchMessage(`Haptic Pulse: ${label}`);
    speak(`Testing ${label} vibration pattern on connected wearable.`, true);
    addToast(`Haptic: ${label}`, "info");
  };

  const handleWristTrigger = (action: string) => {
    wearableBridge.triggerHaptic("tap");
    if (action === "sos") {
      wearableBridge.triggerHaptic("sos");
      speak("Wrist SOS alert triggered!", true);
      addToast("Wrist SOS activated!", "error");
    } else if (action === "read_aloud") {
      speak("Reading latest screen captions on wrist display.", true);
      addToast("Watch sync updated", "success");
    }
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-2xl mx-auto w-full text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div>
          <h1 className="text-3xl font-bold font-display-ocr">Wearable Companion</h1>
          <p className="text-sm text-on-surface-variant font-semibold">Smartwatch bridge & haptic accessibility</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${paired ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`}></span>
          <span className="text-xs font-bold text-on-surface">{paired ? "Paired" : "Disconnected"}</span>
        </div>
      </div>

      {/* Interactive Smartwatch Simulator */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-64 h-64 rounded-full bg-black border-8 border-zinc-800 shadow-2xl p-4 flex flex-col items-center justify-between text-white relative ring-4 ring-primary/30">
          {/* Top Status */}
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-primary">watch</span>
            <span>Companio OS</span>
          </div>

          {/* Center Display */}
          <div className="text-center px-3">
            <span className="text-xs text-emerald-400 font-mono font-bold block mb-1">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <p className="text-sm font-extrabold leading-snug text-zinc-100">
              {watchMessage}
            </p>
            {lastHaptic !== "None" && (
              <span className="inline-block mt-2 bg-primary/30 text-primary font-bold text-[10px] px-2 py-0.5 rounded-full border border-primary/50">
                Pattern: {lastHaptic}
              </span>
            )}
          </div>

          {/* Bottom SOS Trigger */}
          <button
            onClick={() => handleWristTrigger("sos")}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[10px] font-black shadow-lg cursor-pointer active:scale-90 transition-transform mb-1"
            title="Wrist SOS Button"
          >
            SOS
          </button>
        </div>
        <span className="text-xs text-on-surface-variant font-semibold mt-3">Smartwatch Peripheral Preview (WearOS / Apple Watch)</span>
      </div>

      {/* Haptic Test Patterns */}
      <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
        <h2 className="text-base font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
          Test Haptic Vibration Signals
        </h2>
        <p className="text-sm text-on-surface-variant">
          Silent tactile signals allow deaf and low-vision users to perceive navigation turns and hazard warnings without looking at the screen.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTestHaptic("hazard", "Hazard Warning (Double Burst)")}
            className="p-4 rounded-2xl bg-surface border-2 border-outline-variant hover:border-amber-500 text-left font-bold cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <span className="material-symbols-outlined">warning</span>
              <span>Hazard Alert</span>
            </div>
            <span className="text-xs text-on-surface-variant block font-normal">2 rapid warning vibration bursts</span>
          </button>

          <button
            onClick={() => handleTestHaptic("sos", "Emergency SOS (Morse)")}
            className="p-4 rounded-2xl bg-surface border-2 border-outline-variant hover:border-red-500 text-left font-bold cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <span className="material-symbols-outlined">emergency</span>
              <span>Emergency SOS</span>
            </div>
            <span className="text-xs text-on-surface-variant block font-normal">3 short, 3 long, 3 short pulses</span>
          </button>

          <button
            onClick={() => handleTestHaptic("nav_turn", "Navigation Turn Alert")}
            className="p-4 rounded-2xl bg-surface border-2 border-outline-variant hover:border-primary text-left font-bold cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center gap-2 text-primary mb-1">
              <span className="material-symbols-outlined">turn_right</span>
              <span>Wayfinding Turn</span>
            </div>
            <span className="text-xs text-on-surface-variant block font-normal">Directional navigation pulse</span>
          </button>

          <button
            onClick={() => handleTestHaptic("caption_alert", "New Speech Tap")}
            className="p-4 rounded-2xl bg-surface border-2 border-outline-variant hover:border-emerald-500 text-left font-bold cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="material-symbols-outlined">closed_caption</span>
              <span>Caption Tap</span>
            </div>
            <span className="text-xs text-on-surface-variant block font-normal">Subtle tap when speaker speaks</span>
          </button>
        </div>
      </section>
    </div>
  );
}
