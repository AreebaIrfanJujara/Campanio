"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "./ToastContext";
import { useAccessibility } from "./AccessibilityContext";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface OfflineContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  installPWA: () => Promise<boolean>;
  serviceWorkerReady: boolean;
  dismissInstallPrompt: () => void;
  showInstallBanner: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const { speak } = useAccessibility();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState<boolean>(false);

  // Initialize online/offline state & listen to network events
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      addToast("Back online — Cloud AI enabled", "success");
      speak("Internet connection restored. Back online.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast("You are offline — Core accessibility tools active", "warning");
      speak("Internet connection lost. Switched to offline mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [addToast, speak]);

  // Register Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (registration.active) {
          setServiceWorkerReady(true);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                addToast("Companio updated for offline use", "info");
              }
            });
          }
        });
      } catch (err) {
        console.error("Service worker registration failed:", err);
      }
    };

    // Register on window load
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, [addToast]);

  // PWA Install Prompt handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already in standalone mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      try {
        const dismissed = localStorage.getItem("companio_install_dismissed");
        if (dismissed === "true") {
          setShowInstallBanner(false);
        } else {
          setShowInstallBanner(true);
        }
      } catch {
        setShowInstallBanner(false);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem("companio_install_dismissed", "true");
      } catch {}
      addToast("Companio installed successfully!", "success");
      speak("Companio has been installed to your device.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [addToast, speak]);

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      addToast("Install is not available right now. You can add Companio to home screen from browser menu.", "info");
      speak("To install Companio, tap your browser menu and choose Add to Home Screen.", true);
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setShowInstallBanner(false);
        setDeferredPrompt(null);
        try {
          localStorage.setItem("companio_install_dismissed", "true");
        } catch {}
        return true;
      }
      return false;
    } catch (e) {
      console.error("Install prompt error:", e);
      return false;
    }
  }, [deferredPrompt, addToast, speak]);

  const dismissInstallPrompt = useCallback(() => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem("companio_install_dismissed", "true");
    } catch {}
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isInstallable,
        isInstalled,
        installPWA,
        serviceWorkerReady,
        dismissInstallPrompt,
        showInstallBanner,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};
