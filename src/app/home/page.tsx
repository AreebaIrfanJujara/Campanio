"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useActivity } from "@/context/ActivityContext";

export default function HomePage() {
  const { userProfile, speak, theme, voiceGuidanceActive, setVoiceGuidanceActive, toggleTheme } = useAccessibility();
  const { activities } = useActivity();
  const [hazardAlert, setHazardAlert] = useState<boolean>(false);

  const modules = [
    {
      title: "Read Text (OCR)",
      desc: "Scan document text or street signs to read aloud",
      href: "/home/ocr",
      icon: "photo_camera",
      bgColor: "bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Narrate Environment",
      desc: "Real-time AI camera narration of your room",
      href: "/home/scene-desc",
      icon: "center_focus_strong",
      bgColor: "bg-teal-500/10 hover:bg-teal-500/15 border-teal-500/20",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      title: "Live Captions",
      desc: "Transcribe surrounding voices in real time",
      href: "/home/captions",
      icon: "closed_caption",
      bgColor: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Speak For Me",
      desc: "Keyboard card presets to communicate aloud",
      href: "/home/type-to-speak",
      icon: "record_voice_over",
      bgColor: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Live Translation",
      desc: "Translate speech, scans, or text on the fly",
      href: "/home/translation",
      icon: "translate",
      bgColor: "bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Conversation Mode",
      desc: "Split-pane dialogue assistance screen",
      href: "/home/conversation",
      icon: "forum",
      bgColor: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Explore Room",
      desc: "Do a slow sweep to build a map description",
      href: "/home/explore",
      icon: "explore",
      bgColor: "bg-pink-500/10 hover:bg-pink-500/15 border-pink-500/20",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
  ];

  const triggerHazardAlert = () => {
    setHazardAlert(true);
    speak("Caution! Step down detected ahead. Please check your footing.", true);
    if (typeof window !== "undefined") {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const dismissHazardAlert = () => {
    setHazardAlert(false);
    speak("Hazard alert dismissed.", true);
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
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

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-stack-md max-w-4xl mx-auto w-full">
      {/* Hazard Alert Banner (framer-motion animation) */}
      <AnimatePresence>
        {hazardAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="bg-red-600 text-white rounded-2xl p-5 flex items-center justify-between border-2 border-white shadow-2xl z-20"
          >
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-4xl mt-1">warning</span>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-wider">Hazard Detected</h3>
                <p className="text-lg font-bold">Step down detected 3 steps ahead. Take caution.</p>
              </div>
            </div>
            <button
              onClick={dismissHazardAlert}
              className="bg-white text-red-600 font-extrabold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors shadow-lg cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-primary to-secondary rounded-3xl p-6 text-white shadow-lg relative overflow-hidden min-h-[160px] flex flex-col justify-between">
        {/* Toggle Voice Shortcut inside Card */}
        <button
          onClick={handleToggleVoiceMode}
          aria-label={voiceGuidanceActive ? "Disable voice guidance" : "Enable voice guidance"}
          className={`absolute top-4 right-4 w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center cursor-pointer transition-colors ${
            voiceGuidanceActive ? "bg-white text-primary" : "bg-black/25 text-white"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">
            {voiceGuidanceActive ? "volume_up" : "volume_off"}
          </span>
        </button>

        <div>
          <h2 className="text-3xl font-extrabold font-display-ocr">
            {getGreeting()}, {userProfile.name}
          </h2>
          <p className="text-white/80 text-lg mt-1">What can I help you do today?</p>
        </div>

        <div className="flex items-center gap-2 mt-4 bg-white/10 rounded-full px-4 py-1.5 w-max">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-sm capitalize">{userProfile.preset} Mode Active</span>
        </div>
      </div>

      {/* Bento Grid layout: 2 cols on tablet/desktop, 1 col on mobile */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            onClick={() => speak(`Opening ${mod.title}`)}
            className={`flex flex-col items-start bg-surface border-2 ${mod.bgColor} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden text-left cursor-pointer`}
            style={{
              minHeight: userProfile.preset === "motor" ? "180px" : "150px",
            }}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`${mod.iconColor} transition-transform group-hover:scale-110`}>
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {mod.icon}
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-1">{mod.title}</h3>
            <p className="text-base text-on-surface-variant leading-relaxed max-w-sm">{mod.desc}</p>
          </Link>
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

      {/* Quick Actions Row at bottom */}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={triggerHazardAlert}
          className="flex-grow h-12 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-xl">warning</span>
          Simulate Hazard
        </button>

        <button
          onClick={handleToggleVoiceMode}
          className={`flex-grow h-12 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-2 ${
            voiceGuidanceActive
              ? "bg-primary text-white border-primary"
              : "bg-surface text-on-surface border-outline hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined text-xl">record_voice_over</span>
          {voiceGuidanceActive ? "Voice Narration ON" : "Voice Narration OFF"}
        </button>

        <button
          onClick={() => {
            const nextHC = theme === "standard";
            speak(nextHC ? "High contrast enabled" : "Standard theme enabled", true);
            toggleTheme();
          }}
          className="flex-grow h-12 bg-surface text-on-surface border-2 border-outline hover:bg-surface-container-low font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">visibility</span>
          Toggle High Contrast
        </button>
      </div>
    </div>
  );
}
