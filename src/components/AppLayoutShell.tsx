"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { TopAppBar } from "./TopAppBar";
import { BottomNavBar } from "./BottomNavBar";
import { VoiceAssistantOverlay } from "./VoiceAssistantOverlay";
import { useAccessibility } from "@/context/AccessibilityContext";

export const AppLayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { voiceGuidanceActive, speak } = useAccessibility();

  // Voice narration on route change (Accessibility guideline)
  useEffect(() => {
    if (!voiceGuidanceActive) return;

    let routeText = "";
    if (pathname === "/") routeText = "Welcome to Companio. Tap anywhere to begin setup.";
    else if (pathname === "/sign-in") routeText = "Sign in page. Please enter your credentials.";
    else if (pathname === "/create-account") routeText = "Create account page.";
    else if (pathname === "/profile-setup") routeText = "Accessibility profile setup wizard.";
    else if (pathname === "/permission-mic") routeText = "Microphone access request page.";
    else if (pathname === "/home") routeText = "Home dashboard. Select an assistive module.";
    else if (pathname === "/home/ocr") routeText = "Read text module. Point camera at text to read aloud.";
    else if (pathname === "/home/scene-desc") routeText = "Scene description module. Point camera at room to narrate.";
    else if (pathname === "/home/captions") routeText = "Live captioning module. Speak near microphone to transcribe.";
    else if (pathname === "/home/type-to-speak") routeText = "Speak for me module. Type or select quick buttons to talk.";
    else if (pathname === "/home/translation") routeText = "Live translation module. Select text, voice, or camera mode to translate.";
    else if (pathname === "/home/conversation") routeText = "Conversation mode. Split screen layout for chatting with others.";
    else if (pathname === "/home/explore") routeText = "Explore mode. Do a slow sweep with your camera to map obstacles.";
    else if (pathname === "/settings") routeText = "Advanced settings control panel.";

    if (routeText) {
      speak(routeText);
    }
  }, [pathname, voiceGuidanceActive]);

  // Adjust container class to handle bottom nav bar padding
  const isNavVisible = !["/", "/sign-in", "/create-account", "/permission-mic", "/profile-setup"].includes(pathname);

  return (
    <div className={`min-h-screen flex flex-col ${isNavVisible ? "pb-[92px]" : ""}`}>
      <TopAppBar />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className="flex-grow flex flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <BottomNavBar />
      <VoiceAssistantOverlay />
    </div>
  );
};
