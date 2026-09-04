"use client";

/**
 * In-app wake word listener ("Hi Companio" / "Hey Companio").
 * 
 * SCOPE & LIMITATIONS:
 * Browsers and web standards do NOT support background wake-word activation when the browser
 * is closed, the phone is locked, or another application/tab is focused. This hook operates
 * EXCLUSIVELY while the Companio web app tab is open and active in the foreground.
 * It must not be mistaken for OS-level assistants like Hey Siri or Google Assistant.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";

interface UseWakeWordOptions {
  enabled: boolean;
  pathname?: string;
  onWake: () => void;
}

const WAKE_TRIGGER_PHRASES = [
  "hi companio",
  "hey companio",
  "ok companio",
  "okay companio",
  "hello companio",
  // Phonetic & common speech-recognition misinterpretations
  "hi company",
  "hey company",
  "ok company",
  "okay company",
  "hello company",
  "hi companion",
  "hey companion",
  "ok companion",
  "okay companion",
];

// Pages with dedicated, continuous speech recognition that must never conflict
const CONFLICT_ROUTES = ["/home/captions", "/home/conversation"];

export function useWakeWord({ enabled, pathname = "", onWake }: UseWakeWordOptions) {
  const { isAssistantOpen } = useAccessibility();
  const [isListeningForWake, setIsListeningForWake] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimestampsRef = useRef<number[]>([]);
  const isWakingRef = useRef<boolean>(false);

  const onWakeRef = useRef(onWake);
  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  const stopWakeListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListeningForWake(false);
  }, []);

  useEffect(() => {
    // Check SpeechRecognition support
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListeningForWake(false);
      return;
    }

    // Condition guards: Disable if setting is off, assistant is open, route conflicts, or tab is hidden
    const isConflictRoute = CONFLICT_ROUTES.includes(pathname);
    const shouldListen = enabled && !isAssistantOpen && !isConflictRoute;

    if (!shouldListen) {
      stopWakeListening();
      return;
    }

    isManuallyStoppedRef.current = false;
    isWakingRef.current = false;

    const startRecognition = () => {
      if (isManuallyStoppedRef.current || isWakingRef.current) return;
      if (document.visibilityState === "hidden") return;

      // Rate limit restart on rapid error loops (max 5 errors in 10s)
      const now = Date.now();
      errorTimestampsRef.current = errorTimestampsRef.current.filter((t) => now - t < 10000);
      if (errorTimestampsRef.current.length >= 5) {
        console.warn("[WakeWord] Too many recognition errors. Pausing auto-restart for 15s.");
        setIsListeningForWake(false);
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          errorTimestampsRef.current = [];
          if (!isManuallyStoppedRef.current && enabled && !isAssistantOpen) {
            startRecognition();
          }
        }, 15000);
        return;
      }

      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
          setIsListeningForWake(true);
        };

        recognition.onresult = (event: any) => {
          if (isWakingRef.current) return;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            
            // Check all alternatives if present
            const matched = WAKE_TRIGGER_PHRASES.some((phrase) => {
              for (let alt = 0; alt < event.results[i].length; alt++) {
                const altText = event.results[i][alt]?.transcript?.toLowerCase()?.trim() || "";
                if (altText.includes(phrase)) return true;
              }
              return transcript.includes(phrase);
            });

            if (matched) {
              isWakingRef.current = true;
              isManuallyStoppedRef.current = true;
              
              // Immediately stop recognition to free browser speech engine for assistant
              try {
                recognition.abort();
              } catch {}
              recognitionRef.current = null;
              setIsListeningForWake(false);

              // Small delay to guarantee the speech engine instance is released before assistant opens
              setTimeout(() => {
                onWakeRef.current();
              }, 150);
              return;
            }
          }
        };

        recognition.onerror = (event: any) => {
          // Ignore harmless "no-speech" or "aborted" events
          if (event.error !== "no-speech" && event.error !== "aborted") {
            errorTimestampsRef.current.push(Date.now());
          }
        };

        recognition.onend = () => {
          setIsListeningForWake(false);
          recognitionRef.current = null;

          // Auto-restart after silence if still in active listening state
          if (
            !isManuallyStoppedRef.current &&
            !isWakingRef.current &&
            enabled &&
            !isAssistantOpen &&
            !CONFLICT_ROUTES.includes(pathname) &&
            document.visibilityState !== "hidden"
          ) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              startRecognition();
            }, 300);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("[WakeWord] Error starting recognition:", err);
        errorTimestampsRef.current.push(Date.now());
        setIsListeningForWake(false);
      }
    };

    // Listen to tab visibility state to avoid unnecessary mic polling in background
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
          recognitionRef.current = null;
        }
        setIsListeningForWake(false);
      } else if (shouldListen && !isManuallyStoppedRef.current) {
        startRecognition();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startRecognition();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopWakeListening();
    };
  }, [enabled, pathname, isAssistantOpen, stopWakeListening]);

  return { isListeningForWake };
}
