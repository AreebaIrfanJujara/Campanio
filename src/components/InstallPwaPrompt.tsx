"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOffline } from "@/context/OfflineContext";
import { useAccessibility } from "@/context/AccessibilityContext";

export const InstallPwaPrompt: React.FC = () => {
  const { isInstallable, isInstalled, installPWA, showInstallBanner, dismissInstallPrompt } = useOffline();
  const { speak } = useAccessibility();

  const handleInstall = async () => {
    speak("Opening application installation prompt", true);
    await installPWA();
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("companio_install_dismissed", "true");
    } catch {}
    dismissInstallPrompt();
  };

  return (
    <AnimatePresence>
      {isInstallable && !isInstalled && showInstallBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          role="region"
          aria-label="Install Companio Application"
          className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-surface border-2 border-primary rounded-2xl p-4 shadow-2xl z-40 flex items-center justify-between gap-3 text-on-surface"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
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
              className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-xl text-sm cursor-pointer active:scale-95 shadow-md transition-all"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer active:scale-90 transition-transform"
              aria-label="Dismiss install banner"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
