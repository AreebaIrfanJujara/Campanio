"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";

export const TopAppBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, speak } = useAccessibility();
  const { isOnline, isInstallable, isInstalled, installPWA } = useOffline();

  // Don't render TopAppBar on the splash screen
  if (pathname === "/") return null;

  const showBackButton = pathname !== "/home" && pathname !== "/sign-in";

  const handleBack = () => {
    speak("Going back");
    router.back();
  };

  const handleToggleTheme = () => {
    const isHC = theme === "high-contrast";
    speak(isHC ? "Standard mode activated" : "High contrast mode activated", true);
    toggleTheme();
  };

  const handleStatusClick = () => {
    if (isOnline) {
      speak("You are currently online. Cloud AI features and real-time syncing are enabled.", true);
    } else {
      speak("You are currently offline. Core features like Speech, Speak For Me, Live Captions, and Local Translations are running offline.", true);
    }
  };

  const handleInstallClick = async () => {
    speak("Opening application installation prompt", true);
    await installPWA();
  };

  return (
    <header className="bg-surface dark:bg-background w-full top-0 sticky shadow-sm z-40 bg-surface-container-low dark:bg-surface-container-lowest flex items-center justify-between h-touch-target-min px-margin-edge border-b border-outline-variant transition-transform duration-200">
      {/* Left side: Back Button or spacer */}
      {showBackButton ? (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-primary-container/10 text-on-surface-variant active:scale-95 transition-transform duration-200 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined font-semibold text-2xl">arrow_back</span>
        </button>
      ) : (
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">accessibility_new</span>
          </div>
        </div>
      )}

      {/* Center: Brand name + Network Status Pill */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => speak("Companio accessibility suite", true)}
          className="font-semibold text-2xl text-primary tracking-tight font-display-ocr focus-visible:outline-none cursor-pointer"
          aria-label="Companio Wordmark"
        >
          Companio
        </button>

        {/* Online/Offline Status Indicator Pill */}
        <button
          onClick={handleStatusClick}
          aria-label={isOnline ? "Online status: Connected" : "Offline status: Local mode active"}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border cursor-pointer transition-colors ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25 animate-pulse"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-amber-500"
            }`}
          ></span>
          <span>{isOnline ? "Online" : "Offline"}</span>
        </button>
      </div>

      {/* Right side controls: Install Button (if available) + High Contrast Toggle */}
      <div className="flex items-center gap-1 shrink-0">
        {isInstallable && !isInstalled && (
          <button
            onClick={handleInstallClick}
            aria-label="Install Companio as application"
            title="Install App"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">install_mobile</span>
          </button>
        )}

        <button
          onClick={handleToggleTheme}
          aria-label="Toggle visual high contrast mode"
          title="Toggle High Contrast"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-primary-container/10 text-on-surface-variant active:scale-95 transition-transform duration-200 cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">visibility</span>
        </button>
      </div>
    </header>
  );
};
