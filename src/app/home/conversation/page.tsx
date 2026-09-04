"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Soundwave } from "@/components/Soundwave";
import { useToast } from "@/context/ToastContext";
import { realtimeCaptions, CaptionMessage } from "@/lib/realtimeCaptions";
import { getPredictiveSuggestions } from "@/lib/predictivePhrases";

export default function ConversationModePage() {
  const { speak, userProfile } = useAccessibility();
  const { addToast } = useToast();

  const [themCaptions, setThemCaptions] = useState<string[]>([]);
  const [youText, setYouText] = useState<string>("");
  const [isListeningThem, setIsListeningThem] = useState<boolean>(true);
  const [isSyncActive, setIsSyncActive] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const presets = ["Yes", "No", "One moment, please.", "Thank you.", "I understand.", "Please repeat that."];

  // Derive predictive suggestions without useEffect — no setState in effect needed
  const predictions = useMemo(() => getPredictiveSuggestions(youText), [youText]);

  // Subscribe to Realtime Sync from other paired screen
  useEffect(() => {
    speak("Two-way conversation mode active. Split screen view ready.", true);
    const unsubscribe = realtimeCaptions.subscribe((msg: CaptionMessage) => {
      if (msg.speaker === "them") {
        setThemCaptions((prev) => [...prev, msg.text]);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const toggleRoomSync = () => {
    if (isSyncActive) {
      realtimeCaptions.leaveRoom();
      setIsSyncActive(false);
      setRoomCode("");
      addToast("Conversation sync disconnected", "info");
      speak("Conversation multi-device sync stopped.", true);
    } else {
      const code = `conv-${Math.floor(1000 + Math.random() * 9000)}`;
      realtimeCaptions.joinRoom(code);
      setIsSyncActive(true);
      setRoomCode(code);
      addToast(`Paired on Room ${code}`, "success");
      speak(`Conversation paired on room ${code}. Other devices will sync speech in real time.`, true);
    }
  };

  const startListeningThem = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addToast("Speech recognition not supported in this browser", "warning");
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
          const trimmed = text.trim();
          setThemCaptions((prev) => [...prev, trimmed]);
          if (isSyncActive) {
            realtimeCaptions.broadcastCaption({ text: trimmed, speaker: "them" });
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      addToast("Microphone access failed", "error");
    }
  };

  const stopListeningThem = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const handleSpeakYou = (text: string) => {
    if (!text.trim()) return;
    speak(text, true);
    addToast("Spoke text out loud", "success");
    if (isSyncActive) {
      realtimeCaptions.broadcastCaption({ text, speaker: "you" });
    }
    setYouText("");
  };

  const handleSelectPrediction = (suggestion: string) => {
    if (!youText.trim()) {
      setYouText(suggestion);
    } else if (youText.endsWith(" ")) {
      setYouText(youText + suggestion);
    } else {
      const words = youText.split(/\s+/);
      words.pop();
      const prefix = words.length > 0 ? words.join(" ") + " " : "";
      setYouText(prefix + suggestion);
    }
    speak(suggestion);
  };

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
    <div className="flex-grow flex flex-col h-full min-h-0 w-full overflow-hidden bg-background">
      
      {/* Top Half: THEM */}
      <div className="flex-1 bg-surface-container-lowest text-on-surface p-6 flex flex-col justify-between overflow-hidden relative">
        <div className="flex justify-between items-center border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-base text-on-surface-variant uppercase tracking-wider">Listening to them</span>
            {isSyncActive && (
              <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                {roomCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRoomSync}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                isSyncActive ? "bg-emerald-600 text-white border-emerald-500" : "bg-surface-container text-on-surface-variant border-outline-variant"
              }`}
              title="Pair with secondary device"
            >
              {isSyncActive ? "Paired" : "Pair Sync"}
            </button>
            <button
              onClick={handleCopyAllCaptions}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
              aria-label="Copy all their captions"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
            </button>
            <button
              onClick={() => setIsListeningThem(!isListeningThem)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                isListeningThem ? "border-red-500/30 text-red-400 bg-red-950/20" : "border-outline text-on-surface"
              }`}
            >
              {isListeningThem ? "Pause Mic" : "Resume Mic"}
            </button>
          </div>
        </div>

        {/* Captions scroll box */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto flex flex-col gap-4 py-4 pr-1 scrollbar-thin">
          {themCaptions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-on-surface-variant text-center">
              <p className="text-xl max-w-xs font-semibold">Point phone screen at them. Their speech will appear here.</p>
            </div>
          ) : (
            themCaptions.map((cap, i) => (
              <div key={i} className="bg-surface-container-high border border-outline-variant rounded-2xl p-4 text-2xl font-bold leading-relaxed tracking-wide select-text animate-slide-up text-on-surface">
                {highlightKeyPhrases(cap)}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-on-surface-variant mt-2">
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

      {/* Bottom Half: YOU */}
      <div className="flex-1 bg-surface p-6 flex flex-col justify-between overflow-hidden text-on-surface">
        <div className="flex justify-between items-center border-b border-outline-variant pb-2.5">
          <span className="font-bold text-base text-on-surface-variant uppercase tracking-wider">Your Speech board</span>
          {userProfile && (
            <span className="text-xs font-bold text-on-surface-variant capitalize">{userProfile.preset} mode</span>
          )}
        </div>

        {/* Quick presets board */}
        <div className="py-2 flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handleSpeakYou(preset)}
              className="h-12 px-4 shrink-0 bg-surface-container border-2 border-outline-variant hover:border-primary rounded-xl text-base font-bold hover:bg-surface-container-high cursor-pointer snap-start"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Predictive Suggestions Chips */}
        {predictions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {predictions.slice(0, 4).map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPrediction(p)}
                className="shrink-0 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-extrabold cursor-pointer active:scale-95 transition-transform"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input box and Speak trigger */}
        <div className="flex flex-col gap-2">
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
