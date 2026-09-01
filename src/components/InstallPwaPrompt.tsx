"use client";

import React from "react";
import { useOffline } from "@/context/OfflineContext";
import { useAccessibility } from "@/context/AccessibilityContext";

export const InstallPwaPrompt: React.FC = () => {
  const { isInstallable, isInstalled, installPWA, showInstallBanner, dismissInstallPrompt } = useOffline();
  const { speak } = useAccessibility();

  if (!isInstallable || isInstalled || !showInstallBanner) return null;

  const handleInstall = async () => {
    speak("Opening application installation prompt", true);
    await installPWA();
  };

  return (
    <div
      role="region"
      aria-label="Install Companio Application"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-surface-container-highest/95 backdrop-blur-md border-2 border-primary rounded-2xl p-4 shadow-2xl z-40 flex items-center justify-between gap-3 text-on-surface animate-slide-up"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shrink-0 shadow">
          <span className="material-symbols-outlined text-2xl">install_mobile</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-base text-on-surface truncate">Install Companio App</span>
          <span className="text-xs text-on-surface-variant leading-tight">Use offline anytime with 1 tap</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-xl text-sm cursor-pointer active:scale-95 shadow transition-all"
        >
          Install
        </button>
        <button
          onClick={dismissInstallPrompt}
          className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer"
          aria-label="Dismiss install banner"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
};
