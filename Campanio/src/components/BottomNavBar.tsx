"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsAssistantOpen, speak, theme } = useAccessibility();

  // Hide bottom navbar on splash/welcome, sign-in, create-account, permission-mic, and profile-setup pages
  const excludedPaths = ["/", "/sign-in", "/create-account", "/permission-mic", "/profile-setup"];
  if (excludedPaths.includes(pathname)) return null;

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    const baseClass = "flex flex-col items-center justify-center pt-2 w-1/5 hover:bg-surface-container-high active:bg-primary-container/20 transition-all h-full";
    if (isActive) {
      return `${baseClass} text-primary border-t-4 border-primary`;
    }
    return `${baseClass} text-on-surface-variant`;
  };

  const handleNavClick = (path: string, label: string) => {
    speak(`Navigating to ${label}`);
  };

  const handleAssistantClick = () => {
    setIsAssistantOpen(true);
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full z-30 flex justify-around items-end px-gutter pb-safe bg-surface border-t-2 border-outline-variant shadow-[0px_-4px_20px_rgba(0,0,0,0.12)] h-[72px] transition-colors">
      {/* Home */}
      <Link
        href="/home"
        onClick={() => handleNavClick("/home", "Home")}
        className={getLinkClass("/home")}
        aria-label="Home page"
      >
        <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
          home
        </span>
        <span className="font-label-md text-xs font-semibold">Home</span>
      </Link>

      {/* Assistant Link Tab */}
      <button
        onClick={() => {
          speak("Opening voice assistant");
          handleAssistantClick();
        }}
        className="flex flex-col items-center justify-center pt-2 w-1/5 hover:bg-surface-container-high active:bg-primary-container/20 transition-all h-full"
        aria-label="Open assistant overlay"
      >
        <span className="material-symbols-outlined mb-1">hearing</span>
        <span className="font-label-md text-xs font-semibold">Assistant</span>
      </button>

      {/* Floating Center Mic Button */}
      <div className="w-1/5 flex justify-center relative h-full">
        <button
          onClick={() => {
            speak("Voice assistant activated");
            handleAssistantClick();
          }}
          aria-label="Activate voice assistant"
          className="absolute -top-6 flex items-center justify-center w-[80px] h-[80px] bg-primary text-on-primary rounded-full shadow-lg group z-40 hover:scale-105 active:scale-95 transition-transform"
        >
          <div className="absolute inset-0 bg-primary rounded-full animate-pulse-ring group-hover:animate-none"></div>
          <span className="material-symbols-outlined text-4xl relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>
            mic
          </span>
        </button>
      </div>

      {/* Captions */}
      <Link
        href="/home/captions"
        onClick={() => handleNavClick("/home/captions", "Live Captions")}
        className={getLinkClass("/home/captions")}
        aria-label="Live captions page"
      >
        <span className="material-symbols-outlined mb-1">closed_caption</span>
        <span className="font-label-md text-xs font-semibold">Captions</span>
      </Link>

      {/* Settings */}
      <Link
        href="/settings"
        onClick={() => handleNavClick("/settings", "Settings")}
        className={getLinkClass("/settings")}
        aria-label="Settings page"
      >
        <span className="material-symbols-outlined mb-1">settings</span>
        <span className="font-label-md text-xs font-semibold">Settings</span>
      </Link>
    </nav>
  );
};
