"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { TopAppBar } from "@/components/TopAppBar";
import { BottomNavBar } from "@/components/BottomNavBar";
import { SidebarNav } from "@/components/SidebarNav";
import { VoiceAssistantOverlay } from "@/components/VoiceAssistantOverlay";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useWakeWord } from "@/lib/hooks/useWakeWord";

const MAIN_SWIPE_ROUTES = [
  "/home",
  "/home/captions",
  "/home/type-to-speak",
  "/home/ocr",
  "/home/scene-desc",
  "/home/translation",
  "/home/conversation",
  "/home/explore",
  "/home/currency",
  "/home/indoor-nav",
  "/home/wearable",
  "/settings",
];

const ROUTE_DESCRIPTIONS: Record<string, string> = {
  "/": "Welcome to Companio. Tap anywhere to begin setup.",
  "/sign-in": "Sign in page. Please enter your credentials.",
  "/create-account": "Create account page. Register a new profile.",
  "/profile-setup": "Accessibility profile setup wizard.",
  "/permission-mic": "Microphone access request page.",
  "/home": "Home dashboard. Select an assistive module.",
  "/home/ocr": "Read text module. Point camera at text to read aloud.",
  "/home/scene-desc": "Scene description module. Point camera at room to narrate.",
  "/home/captions": "Live captioning module. Speak near microphone to transcribe.",
  "/home/type-to-speak": "Speak for me module. Type or select quick buttons to talk.",
  "/home/translation": "Live translation module. Select text, voice, or camera mode to translate.",
  "/home/conversation": "Conversation mode. Split screen layout for chatting with others.",
  "/home/explore": "Explore mode. Do a slow sweep with your camera to map obstacles.",
  "/home/currency": "Currency and product recognition module.",
  "/home/indoor-nav": "Indoor wayfinding module. Room and corridor guidance.",
  "/home/wearable": "Wearable smart companion module.",
  "/emergency": "Emergency SOS assistance page. Broadcast location or trigger siren.",
  "/settings": "Settings and accessibility control panel.",
  "/privacy": "Privacy policy and zero-retention data protection.",
  "/offline": "Offline mode and local storage status.",
};

export const AppLayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { voiceGuidanceActive, speak, wakeWordActive, setIsAssistantOpen } = useAccessibility();

  // In-app wake word listener ("Hi Companio" / "Hey Companio")
  useWakeWord({
    enabled: wakeWordActive,
    pathname,
    onWake: () => {
      setIsAssistantOpen(true);
      speak("Yes? I'm listening.", true);
    },
  });

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isMouseDown = useRef<boolean>(false);
  const mouseStartX = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  // Voice narration on route change
  useEffect(() => {
    const routeText = ROUTE_DESCRIPTIONS[pathname] || `Navigated to ${pathname.replace("/home/", "").replace("/", " ")}`;
    if (routeText) {
      speak(routeText, true);
    }
  }, [pathname, speak]);

  // Swipe navigation logic
  const handleSwipeChange = (direction: "left" | "right") => {
    const currentIndex = MAIN_SWIPE_ROUTES.indexOf(pathname);
    if (currentIndex === -1) return;

    if (direction === "left") {
      // Swiping left goes to next route
      if (currentIndex < MAIN_SWIPE_ROUTES.length - 1) {
        const nextRoute = MAIN_SWIPE_ROUTES[currentIndex + 1];
        const nextDesc = ROUTE_DESCRIPTIONS[nextRoute] || "Next page";
        speak(`Swiped to ${nextDesc}`, true);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(30);
        }
        router.push(nextRoute);
      }
    } else if (direction === "right") {
      // Swiping right goes to previous route
      if (currentIndex > 0) {
        const prevRoute = MAIN_SWIPE_ROUTES[currentIndex - 1];
        const prevDesc = ROUTE_DESCRIPTIONS[prevRoute] || "Previous page";
        speak(`Swiped to ${prevDesc}`, true);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(30);
        }
        router.push(prevRoute);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Verify it was a horizontal swipe rather than vertical scroll
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        handleSwipeChange("left");
      } else {
        handleSwipeChange("right");
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle primary button and ignore if interacting with form inputs/buttons
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a, mark")) return;
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    mouseStartY.current = e.clientY;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDown.current || mouseStartX.current === null || mouseStartY.current === null) {
      isMouseDown.current = false;
      return;
    }
    const diffX = e.clientX - mouseStartX.current;
    const diffY = e.clientY - mouseStartY.current;

    if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        handleSwipeChange("left");
      } else {
        handleSwipeChange("right");
      }
    }
    isMouseDown.current = false;
    mouseStartX.current = null;
    mouseStartY.current = null;
  };

  // Adjust container class to handle bottom nav bar padding and layout sizing
  const isNavVisible = !["/", "/sign-in", "/create-account", "/permission-mic", "/profile-setup"].includes(pathname);
  const isCenteredAuthFlow = ["/", "/sign-in", "/create-account", "/permission-mic", "/profile-setup"].includes(pathname);

  return (
    <div
      className={`min-h-screen flex flex-col bg-background text-on-background transition-colors ${isNavVisible ? "pb-[88px] md:pb-6" : ""} select-none`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <TopAppBar />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className={
            isCenteredAuthFlow
              ? "w-full max-w-xl mx-auto my-auto p-4 md:p-8 flex-grow flex flex-col justify-center min-h-0"
              : "w-full max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6 flex-grow flex flex-col min-h-0"
          }
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <BottomNavBar />
      <SidebarNav />
      <VoiceAssistantOverlay />
    </div>
  );
};
