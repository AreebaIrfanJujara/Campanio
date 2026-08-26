"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function NotFound() {
  const { speak } = useAccessibility();

  useEffect(() => {
    speak("Page not found. Use the button below to return to the home screen.", true);
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8 px-margin-edge text-center text-on-surface">
      <div className="text-8xl font-black text-primary opacity-20">404</div>
      <h1 className="text-4xl font-extrabold font-display-ocr text-on-surface">Page Not Found</h1>
      <p className="text-xl text-on-surface-variant max-w-md leading-relaxed">
        The page you are looking for doesn't exist or has moved.
      </p>
      <Link
        href="/home"
        onClick={() => speak("Navigating back to home screen")}
        className="h-[56px] px-8 bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined">home</span>
        Return to Home
      </Link>
    </div>
  );
}
