"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";
import { CompanioAPI } from "@/lib/api";
import { Soundwave } from "./Soundwave";

interface HistoryEntry {
  role: string;
  content: string;
}

export const VoiceAssistantOverlay: React.FC = () => {
  const { isAssistantOpen, setIsAssistantOpen, speak, stopSpeaking } = useAccessibility();
  const { isOnline } = useOffline();

  const [status, setStatus] = useState<string>("Tap microphone to ask Companio");
  const [transcript, setTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [responseHtml, setResponseHtml] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [responseSource, setResponseSource] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);

  // Escape key and initial focus handling
  useEffect(() => {
    if (!isAssistantOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAssistantOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const timer = setTimeout(() => {
      if (micButtonRef.current) {
        micButtonRef.current.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isAssistantOpen, setIsAssistantOpen]);

  // Focus trap inside assistant overlay
  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !overlayRef.current) return;
    const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  // Stop speaking when overlay closes
  useEffect(() => {
    if (!isAssistantOpen) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopSpeaking();
      setHistory([]);
      setTranscript("");
      setResponseHtml("");
      setResponseSource("");
    } else {
      const intro = isOnline
        ? "Companio voice assistant ready. Tap the microphone in the center to speak."
        : "Companio offline voice assistant ready. Tap the microphone in the center to ask a question.";
      speak(intro, true);
    }
  }, [isAssistantOpen, isOnline, speak, stopSpeaking]);

  // Clean up recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  if (!isAssistantOpen) return null;

  const processQuery = async (queryText: string) => {
    setTranscript(queryText);
    setStatus(isOnline ? "Thinking..." : "Processing locally...");

    const newHistory: HistoryEntry[] = [
      ...history,
      { role: "user", content: queryText },
    ];

    try {
      const result = await CompanioAPI.ask(
        queryText,
        "User is interacting with the voice assistant overlay.",
        newHistory
      );

      setIsListening(false);
      setResponseHtml(result.reply);
      setResponseSource(result.source);
      setStatus("Speaking...");
      setHistory([...newHistory, { role: "assistant", content: result.reply }]);
      speak(result.reply, true);
    } catch (err) {
      console.error("Assistant query error:", err);
      setIsListening(false);
      const fallback =
        "Companio is currently running offline. You can ask me how to toggle high contrast, change speech speed, read signs, or use phraseboards.";
      setResponseHtml(fallback);
      setResponseSource("offline-fallback");
      setStatus("Speaking...");
      speak(fallback, true);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback simulation when browser doesn't support Web Speech API
      setIsListening(true);
      setStatus("Listening...");
      setTranscript("");
      setResponseHtml("");

      setTimeout(() => {
        const sampleQuestions = [
          "How do I turn on high contrast mode?",
          "How do I use Speak For Me?",
          "Can I translate into Spanish offline?",
          "How do I change narrator voice speed?",
        ];
        const randomQ = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
        processQuery(randomQ);
      }, 2500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("Listening...");
        setTranscript("");
        setResponseHtml("");
        setResponseSource("");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setStatus("Could not hear clearly. Tap mic to retry.");
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        processQuery(text);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setStatus("Microphone error");
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setStatus("Cancelled. Tap to try again.");
    } else {
      startSpeechRecognition();
    }
  };

  const handleClose = () => {
    setIsAssistantOpen(false);
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      onKeyDown={handleOverlayKeyDown}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-between p-margin-edge animate-fade-in text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <h2 id="assistant-title" className="font-display-ocr text-headline-md text-primary-fixed">Assistant</h2>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              isOnline
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            {isOnline ? "Online AI" : "Offline Assistant"}
          </span>
        </div>
        <button
          onClick={handleClose}
          aria-label="Close assistant"
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      {/* Main visual center */}
      <div className="flex-grow flex flex-col items-center justify-center gap-8">
        <p className="text-xl font-medium tracking-wide text-center max-w-md px-4 h-12">
          {status}
        </p>

        {/* Big voice controller button */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <button
            ref={micButtonRef}
            onClick={handleMicClick}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isListening ? "bg-red-600 animate-pulse" : "bg-primary hover:scale-105"
            } shadow-2xl relative z-10`}
          >
            {isListening ? (
              <span className="material-symbols-outlined text-5xl">stop</span>
            ) : (
              <span className="material-symbols-outlined text-5xl">mic</span>
            )}
          </button>
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-red-600 animate-ping opacity-70 pointer-events-none"></div>
          )}
          {!isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse-ring pointer-events-none"></div>
          )}
        </div>

        {/* Listening Soundwave indicator */}
        <div className="h-16 flex items-center justify-center">
          {isListening && <Soundwave color="bg-primary-fixed" size="lg" />}
          {status === "Speaking..." && <Soundwave color="bg-secondary-fixed" size="lg" />}
        </div>
      </div>

      {/* Bottom text overlays */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-4 mb-4">
        {transcript && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 animate-slide-up">
            <p className="text-xs uppercase text-white/50 font-semibold mb-1">You said</p>
            <p className="text-lg text-white font-bold">{transcript}</p>
          </div>
        )}

        {responseHtml && (
          <div className="bg-primary-container/20 rounded-2xl p-5 border border-primary-fixed/30 animate-slide-up shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase text-primary-fixed font-bold">Companio</p>
              {responseSource && (
                <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
                  {responseSource.startsWith("offline") ? "Offline Engine" : "Cloud AI"}
                </span>
              )}
            </div>
            <p className="text-lg text-white font-semibold leading-relaxed">{responseHtml}</p>
          </div>
        )}
      </div>
    </div>
  );
};
