"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { speak, voiceGuidanceActive } = useAccessibility();

  useEffect(() => {
    console.error("Application error boundary caught:", error);
    if (voiceGuidanceActive) {
      speak("Something went wrong. Tap try again, or go back to home.", true);
    }
  }, [error, speak, voiceGuidanceActive]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-margin-edge text-center text-on-surface">
      <div className="w-20 h-20 rounded-full bg-error/10 text-error flex items-center justify-center border-2 border-error/20 shadow-lg">
        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          error
        </span>
      </div>
      <h1 className="text-3xl font-extrabold font-display-ocr text-on-surface">
        Something went wrong
      </h1>
      <p className="text-lg text-on-surface-variant max-w-md leading-relaxed">
        An unexpected error occurred while loading this page. You can try reloading or return to the main dashboard.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mt-2">
        <button
          onClick={() => reset()}
          className="flex-1 h-[56px] px-6 bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          Try Again
        </button>

        <Link
          href="/home"
          onClick={() => speak("Navigating back to home screen")}
          className="flex-1 h-[56px] px-6 bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-xl">home</span>
          Go to Home
        </Link>
      </div>
    </div>
  );
}
