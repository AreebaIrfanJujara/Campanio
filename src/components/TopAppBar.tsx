"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";

export const TopAppBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, speak } = useAccessibility();

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

  return (
    <header className="bg-surface dark:bg-background w-full top-0 sticky shadow-sm z-40 bg-surface-container-low dark:bg-surface-container-lowest flex items-center justify-between h-touch-target-min px-margin-edge border-b border-outline-variant transition-transform duration-200">
      {showBackButton ? (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center w-touch-target-min h-touch-target-min rounded-full hover:bg-primary-container/10 text-on-surface-variant active:scale-95 transition-transform duration-200"
        >
          <span className="material-symbols-outlined font-semibold text-2xl">arrow_back</span>
        </button>
      ) : (
        <div className="w-touch-target-min h-touch-target-min" />
      )}

      <button
        onClick={() => speak("Companio accessibility suite home", true)}
        className="font-semibold text-2xl text-primary tracking-tight font-display-ocr focus-visible:outline-none"
        aria-label="Companio Wordmark"
      >
        Companio
      </button>

      <button
        onClick={handleToggleTheme}
        aria-label="Toggle visual high contrast mode"
        className="flex items-center justify-center w-touch-target-min h-touch-target-min rounded-full hover:bg-primary-container/10 text-on-surface-variant active:scale-95 transition-transform duration-200"
      >
        <span className="material-symbols-outlined text-2xl">visibility</span>
      </button>
    </header>
  );
};
