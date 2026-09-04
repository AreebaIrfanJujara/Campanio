"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAccessibility } from "@/context/AccessibilityContext";

export const SidebarNav: React.FC = () => {
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen, speak, userProfile, setIsAssistantOpen } = useAccessibility();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, setIsSidebarOpen]);

  // Handle drag to dismiss
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -300) {
      setIsSidebarOpen(false);
    }
  };

  const navSections = [
    {
      title: "Core Features",
      items: [
        { href: "/home", label: "Home Dashboard", icon: "home" },
        { href: "/home/captions", label: "Live Captions", icon: "closed_caption" },
        { href: "/home/type-to-speak", label: "Speak For Me", icon: "record_voice_over" },
        { href: "/home/ocr", label: "Read Text (OCR)", icon: "photo_camera" },
        { href: "/home/scene-desc", label: "Narrate Environment", icon: "center_focus_strong" },
        { href: "/home/translation", label: "Live Translation", icon: "translate" },
        { href: "/home/conversation", label: "Conversation Mode", icon: "forum" },
        { href: "/home/explore", label: "Explore Room", icon: "explore" },
        { href: "/home/currency", label: "Currency & Products", icon: "payments" },
        { href: "/home/indoor-nav", label: "Indoor Wayfinding", icon: "near_me" },
        { href: "/home/wearable", label: "Wearable Companion", icon: "watch" },
      ],
    },
    {
      title: "Settings & Safety",
      items: [
        { href: "/settings", label: "Settings", icon: "settings" },
        { href: "/emergency", label: "Emergency SOS", icon: "sos", isEmergency: true },
        { href: "/privacy", label: "Privacy & Data", icon: "security" },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Draggable Sidebar Panel */}
          <motion.aside
            ref={sidebarRef}
            drag="x"
            dragConstraints={{ left: -320, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="relative w-80 max-w-[85vw] h-full bg-surface text-on-surface shadow-2xl border-r border-outline-variant flex flex-col z-10 select-none overflow-hidden touch-none"
          >
            {/* Top Header */}
            <div className="p-5 border-b border-outline-variant flex items-center justify-between bg-surface-container/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-2xl">accessibility_new</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold font-display-ocr text-primary tracking-tight">
                    Companio
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium">Navigation Menu</p>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-all cursor-pointer"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
              </button>
            </div>

            {/* User Profile Pill */}
            <div className="px-5 py-3.5 bg-surface-container-low/60 border-b border-outline-variant/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-bold text-on-surface block leading-tight">{userProfile.name}</span>
                  <span className="text-xs text-on-surface-variant capitalize font-medium">{userProfile.preset} Mode</span>
                </div>
              </div>
              <button
                onClick={() => {
                  speak("Voice assistant activated");
                  setIsAssistantOpen(true);
                  setIsSidebarOpen(false);
                }}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-base">mic</span>
                <span>Assistant</span>
              </button>
            </div>

            {/* Scrollable Navigation Links */}
            <div className="flex-grow overflow-y-auto px-3 py-4 flex flex-col gap-5 touch-pan-y">
              {navSections.map((sec) => (
                <div key={sec.title} className="flex flex-col gap-1">
                  <span className="px-3 text-[11px] font-black uppercase tracking-wider text-on-surface-variant/70">
                    {sec.title}
                  </span>
                  {sec.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          speak(`Navigating to ${item.label}`);
                          setIsSidebarOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                          isActive
                            ? "bg-primary text-white shadow-md font-extrabold"
                            : item.isEmergency
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                            : "text-on-surface hover:bg-surface-container hover:text-primary active:scale-[0.98]"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-2xl ${
                            isActive
                              ? "text-white"
                              : item.isEmergency
                              ? "text-red-600 dark:text-red-400"
                              : "text-on-surface-variant"
                          }`}
                          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Drag Handle Indicator on Right Edge */}
            <div
              className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-14 rounded-full bg-outline-variant/60 pointer-events-none"
              aria-hidden="true"
            />

            {/* Bottom Footer */}
            <div className="p-4 border-t border-outline-variant text-center bg-surface-container/30 text-xs text-on-surface-variant font-medium">
              <span>Swipe left or tap backdrop to close</span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
