"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";

export const TopAppBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, speak, wakeWordActive, setIsAssistantOpen, toggleSidebar } = useAccessibility();
  const { isOnline, isInstallable, isInstalled, installPWA } = useOffline();

  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);

  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    const handleVisibility = () => {
      setIsWindowFocused(document.visibilityState === "visible");
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Don't render TopAppBar on the splash screen
  if (pathname === "/") return null;

  const showBackButton = pathname !== "/home" && pathname !== "/sign-in";

  const handleBack = () => {
    speak("Going back");
    router.back();
  };

  const handleToggleTheme = () => {
    const nextLabels: Record<string, string> = {
      standard: "Dark mode activated",
      dark: "High contrast mode activated",
      "high-contrast": "Standard mode activated",
    };
    speak(nextLabels[theme] ?? "Theme changed", true);
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
    <header className="w-full top-0 sticky shadow-sm z-40 bg-surface border-b border-outline-variant transition-colors">
      <div className="w-full max-w-7xl px-4 md:px-8 mx-auto flex items-center justify-between h-16">
        {/* Left side: Menu button + Back Button + Logo */}
        <div className="flex items-center gap-2.5">
          {/* Menu Drawer Toggle Button */}
          <button
            onClick={() => {
              speak("Opening navigation sidebar", true);
              toggleSidebar();
            }}
            aria-label="Open navigation menu sidebar"
            title="Navigation Menu"
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          {showBackButton && (
            <button
              onClick={handleBack}
              aria-label="Go back"
              className="flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-surface-container text-on-surface-variant active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined font-semibold text-2xl">arrow_back</span>
            </button>
          )}

          {/* Brand Wordmark & Icon */}
          <Link
            href="/home"
            onClick={() => speak("Companio accessibility suite", true)}
            className="flex items-center gap-2 font-semibold text-2xl text-primary tracking-tight font-display-ocr focus-visible:outline-none cursor-pointer"
            aria-label="Companio Wordmark"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-2xl">accessibility_new</span>
            </div>
            <span className="hidden sm:inline">Companio</span>
          </Link>

          {/* Online/Offline Status Indicator Pill */}
          <button
            onClick={handleStatusClick}
            aria-label={isOnline ? "Online status: Connected" : "Offline status: Local mode active"}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border cursor-pointer transition-colors shrink-0 ${
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

        {/* Right side controls: Wake Word Status + Voice Assistant + SOS Trigger + Install + Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Wake-Word Indicator */}
          {wakeWordActive && isWindowFocused && !["/home/captions", "/home/conversation"].includes(pathname) && (
            <div
              role="status"
              aria-label="Wake word listening active. Say 'Hi Companio' anytime."
              title="Wake word active: Say 'Hi Companio'"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                mic
              </span>
              <span className="hidden lg:inline">"Hi Companio"</span>
            </div>
          )}

          <button
            onClick={() => {
              speak("Voice assistant activated");
              setIsAssistantOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-all cursor-pointer active:scale-95"
            aria-label="Open voice assistant"
          >
            <span className="material-symbols-outlined text-lg">mic</span>
            <span>Assistant</span>
          </button>

          {pathname !== "/emergency" && (
            <Link
              href="/emergency"
              onClick={() => speak("Opening Emergency Assistance")}
              className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-transform"
              aria-label="Trigger Emergency Assistance"
              title="Emergency SOS"
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                sos
              </span>
              <span>SOS</span>
            </Link>
          )}

          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              aria-label="Install Companio as application"
              title="Install App"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">install_mobile</span>
            </button>
          )}

          <button
            onClick={handleToggleTheme}
            aria-label={
              theme === "standard"
                ? "Switch to dark mode"
                : theme === "dark"
                ? "Switch to high contrast mode"
                : "Switch to standard mode"
            }
            title="Cycle theme: Light → Dark → High Contrast"
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-surface-container text-on-surface-variant active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === "dark" ? "dark_mode" : theme === "high-contrast" ? "contrast" : "light_mode"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
