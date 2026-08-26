"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Soundwave } from "@/components/Soundwave";
import { useToast } from "@/context/ToastContext";

export default function ConversationModePage() {
  const { speak, stopSpeaking, isSpeaking, userProfile } = useAccessibility();
  const { addToast } = useToast();

  const [themCaptions, setThemCaptions] = useState<string[]>([]);
  const [youText, setYouText] = useState<string>("");
  const [isListeningThem, setIsListeningThem] = useState<boolean>(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mockTimeoutRef = useRef<any>(null);

  const presets = ["Yes", "No", "One moment, please.", "Thank you.", "I understand.", "Please repeat that."];

  const mockThemPhrases = [
    "Hello! How are you doing?",
    "That sounds good to me.",
    "Can you explain what you mean?",
    "Ah, yes. I see now.",
    "Sure! Let me grab that for you.",
  ];
  const [mockIndex, setMockIndex] = useState(0);

  // Auto scroll top half captions
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [themCaptions]);

  useEffect(() => {
    if (isListeningThem) {
      startListeningThem();
    } else {
      stopListeningThem();
    }
    return () => stopListeningThem();
  }, [isListeningThem]);

  const startListeningThem = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback mock transcript loop
      runMockListening();
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        addToast("Listening to their reply", "info");
      };

      rec.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        if (text.trim()) {
          setThemCaptions((prev) => [...prev, text.trim()]);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      runMockListening();
    }
  };

  const stopListeningThem = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mockTimeoutRef.current) {
      clearTimeout(mockTimeoutRef.current);
    }
  };

  const runMockListening = () => {
    if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    const delay = Math.random() * 5000 + 4000;
    mockTimeoutRef.current = setTimeout(() => {
      setThemCaptions((prev) => [...prev, mockThemPhrases[mockIndex]]);
      setMockIndex((prev) => (prev + 1) % mockThemPhrases.length);
      runMockListening();
    }, delay);
  };

  const handleSpeakYou = (text: string) => {
    if (!text.trim()) return;
    speak(text, true);
    addToast("Spoke text out loud", "success");
    setYouText("");
  };

  // Key-phrase highlighting (same as captions page)
  const highlightKeyPhrases = (text: string) => {
    const keywords = /\b(\d+(?:\.\d+)?|\d+\s*(?:AM|PM|am|pm)|left|right|ahead|behind|straight|exit|restroom|doctor|pharmacy|yes|no|please|thank)\b/gi;
    const parts = text.split(keywords);
    if (parts.length === 1) return text;
    return parts.map((part, index) => {
      if (keywords.test(part)) {
        return (
          <mark key={index} className="bg-amber-200/80 dark:bg-amber-800/80 px-1 rounded font-extrabold text-[1.05em]">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const handleCopyAllCaptions = () => {
    const text = themCaptions.join("\n");
    navigator.clipboard.writeText(text || "No captions yet.");
    addToast("Captions copied!", "success");
  };

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-140px)] w-full max-w-2xl mx-auto overflow-hidden border-x border-outline-variant bg-background">
      
      {/* Top Half: THEM (Dark background, large captions, listening state) */}
      <div className="flex-1 bg-zinc-950 text-white p-6 flex flex-col justify-between overflow-hidden relative">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-base text-zinc-400 uppercase tracking-wider">Listening to them</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllCaptions}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Copy all their captions"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
            </button>
            <button
              onClick={() => setIsListeningThem(!isListeningThem)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                isListeningThem ? "border-red-500/30 text-red-400 bg-red-950/20" : "border-zinc-700 text-zinc-300"
              }`}
            >
              {isListeningThem ? "Pause Mic" : "Resume Mic"}
            </button>
          </div>
        </div>

        {/* Captions scroll box */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto flex flex-col gap-4 py-4 pr-1 scrollbar-thin">
          {themCaptions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-center">
              <p className="text-xl max-w-xs font-semibold">Point phone screen at them. Their speech will appear here.</p>
            </div>
          ) : (
            themCaptions.map((cap, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-2xl font-bold leading-relaxed tracking-wide select-text animate-slide-up">
                {highlightKeyPhrases(cap)}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-zinc-500 mt-2">
          <span>Avatar: THEM (FACING SIDE)</span>
          {isListeningThem && <Soundwave color="bg-emerald-500" size="sm" />}
        </div>
      </div>

      {/* Center Divider */}
      <div className="h-1 bg-outline-variant relative z-10 flex items-center justify-center">
        <div className="bg-surface-container border border-outline-variant rounded-full px-4 py-0.5 text-xs font-bold text-on-surface-variant uppercase tracking-widest shadow">
          Conversation Split
        </div>
      </div>

      {/* Bottom Half: YOU (Light background, Quick responses, Custom input) */}
      <div className="flex-1 bg-surface p-6 flex flex-col justify-between overflow-hidden text-on-surface">
        {/* Avatar label */}
        <div className="flex justify-between items-center border-b border-outline-variant pb-2.5">
          <span className="font-bold text-base text-on-surface-variant uppercase tracking-wider">Your Speech board</span>
          {isSpeaking && (
            <span className="flex items-center gap-1.5 bg-teal-500/10 text-teal-600 px-3 py-1 rounded-full text-xs font-bold border border-teal-500/20 animate-pulse">
              Speaking out loud
            </span>
          )}
        </div>

        {/* Quick presets board (Horizontal Scroll) */}
        <div className="py-4 flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handleSpeakYou(preset)}
              className="h-14 px-5 shrink-0 bg-surface-container border-2 border-outline-variant hover:border-primary rounded-xl text-lg font-bold hover:bg-surface-container-high cursor-pointer snap-start"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Input box and Speak trigger */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={youText}
              onChange={(e) => setYouText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSpeakYou(youText)}
              placeholder="Type your reply to read aloud..."
              className="flex-grow h-14 px-4 border-2 border-outline focus:border-primary focus:outline-none rounded-xl text-lg font-bold font-display-ocr bg-surface-container"
              aria-label="Your reply input box"
            />
            <button
              onClick={() => handleSpeakYou(youText)}
              className="w-14 h-14 bg-primary text-white hover:bg-primary-container rounded-xl flex items-center justify-center shadow active:scale-95 transition-transform cursor-pointer"
              aria-label="Speak custom text"
            >
              <span className="material-symbols-outlined text-2xl">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
