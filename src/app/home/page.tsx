"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAccessibility, PresetType } from "@/context/AccessibilityContext";
import { useActivity } from "@/context/ActivityContext";
import { wearableBridge } from "@/lib/wearableBridge";

interface HazardScenario {
  id: string;
  title: string;
  desc: string;
  distance: string;
  icon: string;
  color: string;
}

const HAZARD_SCENARIOS: HazardScenario[] = [
  {
    id: "stairs",
    title: "Critical: Drop-Off / Stairs Ahead",
    desc: "Step down detected 3 feet ahead. Stop and verify your footing.",
    distance: "3 ft",
    icon: "stairs",
    color: "bg-red-600 border-red-400",
  },
  {
    id: "slippery",
    title: "Warning: Slippery / Wet Floor",
    desc: "Liquid spill detected directly on walking path. Slow down and maintain balance.",
    distance: "5 ft",
    icon: "water_drop",
    color: "bg-amber-600 border-amber-400",
  },
  {
    id: "overhead",
    title: "Alert: Low Overhead Clearance",
    desc: "Low-hanging obstacle at 5.5 feet. Lower your head or step to the right.",
    distance: "4 ft",
    icon: "warning",
    color: "bg-orange-600 border-orange-400",
  },
  {
    id: "motion",
    title: "Caution: Approaching Fast Motion",
    desc: "Cyclist or fast motion detected from left. Step back onto the walkway.",
    distance: "8 ft",
    icon: "directions_bike",
    color: "bg-red-700 border-red-500",
  },
  {
    id: "barrier",
    title: "Alert: Construction Barrier",
    desc: "Direct path blocked. Walking space clear to the right.",
    distance: "6 ft",
    icon: "construction",
    color: "bg-amber-700 border-amber-500",
  },
];

export default function HomePage() {
  const { userProfile, applyPreset, speak, theme, voiceGuidanceActive, setVoiceGuidanceActive, toggleTheme } = useAccessibility();
  const { activities } = useActivity();
  const [activeHazard, setActiveHazard] = useState<HazardScenario | null>(null);
  const [hazardIndex, setHazardIndex] = useState<number>(0);

  const allModules = [
    {
      title: "Read Text (OCR)",
      desc: "Scan document text or street signs to read aloud & translate",
      href: "/home/ocr",
      icon: "photo_camera",
      badgeBg: "bg-indigo-500/15 dark:bg-indigo-400/20",
      iconColor: "text-indigo-600 dark:text-indigo-300",
      borderColor: "hover:border-indigo-500/50",
    },
    {
      title: "Narrate Environment",
      desc: "Real-time AI camera narration of your surroundings & hazards",
      href: "/home/scene-desc",
      icon: "center_focus_strong",
      badgeBg: "bg-teal-500/15 dark:bg-teal-400/20",
      iconColor: "text-teal-600 dark:text-teal-300",
      borderColor: "hover:border-teal-500/50",
    },
    {
      title: "Live Captions",
      desc: "Instant speech transcription of surrounding voices",
      href: "/home/captions",
      icon: "closed_caption",
      badgeBg: "bg-emerald-500/15 dark:bg-emerald-400/20",
      iconColor: "text-emerald-600 dark:text-emerald-300",
      borderColor: "hover:border-emerald-500/50",
    },
    {
      title: "Speak For Me",
      desc: "Instant AAC cards & voice keyboard to communicate aloud",
      href: "/home/type-to-speak",
      icon: "record_voice_over",
      badgeBg: "bg-amber-500/15 dark:bg-amber-400/20",
      iconColor: "text-amber-600 dark:text-amber-300",
      borderColor: "hover:border-amber-500/50",
    },
    {
      title: "Live Translation",
      desc: "Translate voice speech, camera scans, or typed text",
      href: "/home/translation",
      icon: "translate",
      badgeBg: "bg-purple-500/15 dark:bg-purple-400/20",
      iconColor: "text-purple-600 dark:text-purple-300",
      borderColor: "hover:border-purple-500/50",
    },
    {
      title: "Conversation Mode",
      desc: "Split-screen dual dialogue assistance screen",
      href: "/home/conversation",
      icon: "forum",
      badgeBg: "bg-blue-500/15 dark:bg-blue-400/20",
      iconColor: "text-blue-600 dark:text-blue-300",
      borderColor: "hover:border-blue-500/50",
    },
    {
      title: "Explore Room",
      desc: "Slow sweep room scanner to build spatial layout",
      href: "/home/explore",
      icon: "explore",
      badgeBg: "bg-pink-500/15 dark:bg-pink-400/20",
      iconColor: "text-pink-600 dark:text-pink-300",
      borderColor: "hover:border-pink-500/50",
    },
    {
      title: "Currency & Products",
      desc: "Banknote denomination reader & price scanner",
      href: "/home/currency",
      icon: "payments",
      badgeBg: "bg-cyan-500/15 dark:bg-cyan-400/20",
      iconColor: "text-cyan-600 dark:text-cyan-300",
      borderColor: "hover:border-cyan-500/50",
    },
    {
      title: "Indoor Wayfinding",
      desc: "Step-by-step room and corridor navigation",
      href: "/home/indoor-nav",
      icon: "near_me",
      badgeBg: "bg-lime-500/15 dark:bg-lime-400/20",
      iconColor: "text-lime-600 dark:text-lime-300",
      borderColor: "hover:border-lime-500/50",
    },
    {
      title: "Wearable Bridge",
      desc: "Smartwatch companion & tactile haptic alerts",
      href: "/home/wearable",
      icon: "watch",
      badgeBg: "bg-violet-500/15 dark:bg-violet-400/20",
      iconColor: "text-violet-600 dark:text-violet-300",
      borderColor: "hover:border-violet-500/50",
    },
    {
      title: "Emergency SOS",
      desc: "1-tap GPS broadcast, siren & emergency dispatch",
      href: "/emergency",
      icon: "sos",
      badgeBg: "bg-red-500/15 dark:bg-red-400/20",
      iconColor: "text-red-600 dark:text-red-300",
      borderColor: "hover:border-red-500/50",
    },
  ];

  // Dynamically tailor module order & spotlights based on active accessibility preset
  const getOrderedModules = () => {
    const orderMap: Record<PresetType, string[]> = {
      visual: [
        "/home/scene-desc",
        "/home/ocr",
        "/home/currency",
        "/home/explore",
        "/home/indoor-nav",
        "/home/type-to-speak",
        "/home/translation",
        "/home/captions",
        "/home/conversation",
        "/home/wearable",
        "/emergency",
      ],
      hearing: [
        "/home/captions",
        "/home/conversation",
        "/home/translation",
        "/home/wearable",
        "/home/type-to-speak",
        "/home/ocr",
        "/home/scene-desc",
        "/home/currency",
        "/home/explore",
        "/home/indoor-nav",
        "/emergency",
      ],
      motor: [
        "/home/type-to-speak",
        "/home/wearable",
        "/emergency",
        "/home/captions",
        "/home/conversation",
        "/home/ocr",
        "/home/scene-desc",
        "/home/translation",
        "/home/currency",
        "/home/explore",
        "/home/indoor-nav",
      ],
      standard: [
        "/home/ocr",
        "/home/scene-desc",
        "/home/captions",
        "/home/type-to-speak",
        "/home/translation",
        "/home/conversation",
        "/home/explore",
        "/home/currency",
        "/home/indoor-nav",
        "/home/wearable",
        "/emergency",
      ],
    };

    const targetOrder = orderMap[userProfile.preset] || orderMap.standard;
    return targetOrder
      .map((href) => allModules.find((m) => m.href === href))
      .filter(Boolean) as typeof allModules;
  };

  const modules = getOrderedModules();

  const triggerHazardSimulation = () => {
    const nextIdx = (hazardIndex + 1) % HAZARD_SCENARIOS.length;
    setHazardIndex(nextIdx);
    const scenario = HAZARD_SCENARIOS[nextIdx];
    setActiveHazard(scenario);

    // 1. Spoken voice alert
    speak(`Warning! ${scenario.title}. ${scenario.desc}`, true);

    // 2. Web Audio Context dual-frequency acoustic alarm
    if (typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);
        }
      } catch (e) {
        console.warn("AudioContext alarm failed:", e);
      }
    }

    // 3. Haptic vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    // 4. Wearable bridge dispatch
    wearableBridge.triggerHaptic("hazard");
  };

  const dismissHazardAlert = () => {
    setActiveHazard(null);
    speak("Hazard alert dismissed.", true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleToggleVoiceMode = () => {
    const nextVal = !voiceGuidanceActive;
    setVoiceGuidanceActive(nextVal);
    speak(nextVal ? "Voice mode activated." : "Voice mode deactivated.", true);
  };

  const handlePresetChange = (preset: PresetType) => {
    applyPreset(preset);
  };

  return (
    <div className="flex-grow flex flex-col gap-6 w-full">
      {/* Multi-Sensory Hazard Alert Banner */}
      <AnimatePresence>
        {activeHazard && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 140, damping: 15 }}
            role="alert"
            aria-live="assertive"
            className={`${activeHazard.color} text-white rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 shadow-2xl z-30 animate-pulse`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activeHazard.icon}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider">{activeHazard.title}</h3>
                  <span className="px-2.5 py-0.5 bg-white/25 rounded-full text-xs font-black uppercase tracking-widest">
                    {activeHazard.distance}
                  </span>
                </div>
                <p className="text-base md:text-lg font-bold mt-1 leading-snug">{activeHazard.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={triggerHazardSimulation}
                className="bg-white/20 hover:bg-white/30 text-white font-extrabold px-4 py-2.5 rounded-xl transition-colors cursor-pointer border border-white/30"
                title="Test next hazard scenario"
              >
                Next Hazard
              </button>
              <button
                onClick={dismissHazardAlert}
                className="bg-white text-black font-extrabold px-5 py-2.5 rounded-xl hover:bg-surface-container transition-colors shadow-lg cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Welcome Card — Adaptive to active disability mode */}
      <div className="bg-gradient-to-br from-[#1943c2] via-[#214cb5] to-[#005a4e] dark:from-[#11245e] dark:via-[#153154] dark:to-[#002f28] border border-white/15 dark:border-primary/20 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden min-h-[190px] flex flex-col justify-between">
        {/* Toggle Voice Shortcut inside Card */}
        <button
          onClick={handleToggleVoiceMode}
          aria-label={voiceGuidanceActive ? "Disable voice guidance" : "Enable voice guidance"}
          className={`absolute top-5 right-5 w-12 h-12 rounded-2xl border border-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95 ${
            voiceGuidanceActive ? "bg-white text-[#1943c2]" : "bg-black/30 text-white hover:bg-black/40"
          }`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {voiceGuidanceActive ? "volume_up" : "volume_off"}
          </span>
        </button>

        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display-ocr text-white drop-shadow-sm">
            {getGreeting()}, {userProfile.name}
          </h2>
          <p className="text-white/85 text-lg md:text-xl mt-1.5 font-medium">
            {userProfile.preset === "visual" && "Visual companion mode active — Camera AI & voice narration prioritized."}
            {userProfile.preset === "hearing" && "Hearing companion mode active — Live captions & vibration alerts prioritized."}
            {userProfile.preset === "motor" && "Motor companion mode active — Large 76px touch targets & speech cards enabled."}
            {userProfile.preset === "standard" && "Universal accessibility dashboard ready."}
          </p>
        </div>

        {/* Quick Profile Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/15">
          <span className="text-xs uppercase font-extrabold tracking-wider text-white/70 mr-1">Profile Mode:</span>
          {(["visual", "hearing", "motor", "standard"] as PresetType[]).map((p) => {
            const isActive = userProfile.preset === p;
            return (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer border ${
                  isActive
                    ? "bg-white text-[#1943c2] border-white shadow-md scale-105"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                }`}
              >
                {p === "visual" ? "👁️ Visual" : p === "hearing" ? "🦻 Hearing" : p === "motor" ? "✋ Motor" : "⚙️ Standard"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adaptive Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {modules.map((mod, idx) => (
          <motion.div
            key={mod.href}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.02 }}
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col h-full"
          >
            <Link
              href={mod.href}
              onClick={() => speak(`Opening ${mod.title}`)}
              className={`flex flex-col items-start bg-surface border-2 border-outline-variant ${mod.borderColor} hover:shadow-xl rounded-3xl p-6 shadow-sm transition-all group relative overflow-hidden text-left cursor-pointer h-full justify-between`}
              style={{
                minHeight: userProfile.preset === "motor" ? "190px" : "160px",
              }}
            >
              <div className="flex items-center justify-between w-full mb-4">
                <div className={`w-14 h-14 rounded-2xl ${mod.badgeBg} flex items-center justify-center ${mod.iconColor} transition-transform group-hover:scale-110 duration-200 shadow-sm border border-transparent`}>
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {mod.icon}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:bg-primary/20 group-hover:translate-x-1 transition-all duration-200">
                  <span className="material-symbols-outlined text-xl">
                    chevron_right
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-on-surface mb-1.5 group-hover:text-primary transition-colors">{mod.title}</h3>
                <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">{mod.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Recent Activity section */}
      <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-on-surface">Recent Activity</h3>
          <span className="text-sm text-on-surface-variant font-semibold">{activities.length} items</span>
        </div>
        <div className="flex flex-col gap-3">
          {activities.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-base text-on-surface-variant">No recent activity. Start using a feature to see it here.</p>
            </div>
          ) : (
            activities.slice(0, 5).map((activity) => {
              const timeAgo = getTimeAgo(activity.timestamp);
              return (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">{activity.icon}</span>
                    <div>
                      <span className="font-semibold text-base block text-on-surface">{activity.title}</span>
                      <span className="text-xs text-on-surface-variant">{timeAgo}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={triggerHazardSimulation}
          className="flex-grow h-14 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-base"
        >
          <span className="material-symbols-outlined text-2xl">warning</span>
          Simulate Hazard ({activeHazard ? "Next" : "Test"})
        </button>

        <button
          onClick={handleToggleVoiceMode}
          className={`flex-grow h-14 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-2 text-base ${
            voiceGuidanceActive
              ? "bg-primary text-white border-primary"
              : "bg-surface text-on-surface border-outline hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">record_voice_over</span>
          {voiceGuidanceActive ? "Voice Narration ON" : "Voice Narration OFF"}
        </button>

        <button
          onClick={() => {
            const nextLabels: Record<string, string> = {
              standard: "Dark mode activated",
              dark: "High contrast mode activated",
              "high-contrast": "Standard mode activated",
            };
            speak(nextLabels[theme] ?? "Theme changed", true);
            toggleTheme();
          }}
          className="flex-grow h-14 bg-surface text-on-surface border-2 border-outline hover:bg-surface-container-low font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer text-base"
        >
          <span className="material-symbols-outlined text-2xl">
            {theme === "dark" ? "dark_mode" : theme === "high-contrast" ? "contrast" : "light_mode"}
          </span>
          {theme === "dark" ? "Dark Mode" : theme === "high-contrast" ? "High Contrast" : "Light Mode"}
        </button>
      </div>
    </div>
  );
}
