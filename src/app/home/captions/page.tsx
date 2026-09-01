"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";
import { Soundwave } from "@/components/Soundwave";
import { useToast } from "@/context/ToastContext";
import { realtimeCaptions, CaptionMessage } from "@/lib/realtimeCaptions";
import { CompanioAPI } from "@/lib/api";

interface SoundEvent {
  id: number;
  label: string;
  icon: string;
  time: string;
}

export default function CaptionsPage() {
  const { speak, userProfile } = useAccessibility();
  const { isOnline } = useOffline();
  const { addToast } = useToast();
  
  const [isTranscribing, setIsTranscribing] = useState<boolean>(true);
  const [captions, setCaptions] = useState<{ text: string; speaker: "them" | "you" }[]>([]);
  const [status, setStatus] = useState<string>("Initializing captions...");
  const [fontSizeScale, setFontSizeScale] = useState<number>(24);
  const [soundEvents, setSoundEvents] = useState<SoundEvent[]>([]);
  const [showSoundAlert, setShowSoundAlert] = useState<SoundEvent | null>(null);

  // Realtime multi-device sync state
  const [isBroadcastActive, setIsBroadcastActive] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [sttSource, setSttSource] = useState<string>("Web Speech API");
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mockTimeoutRef = useRef<any>(null);
  const soundEventIntervalRef = useRef<any>(null);

  const mockPhrases = [
    "Hello there! I am John. How can I help you today?",
    "You should take the elevator to the 3rd floor, it's on your right.",
    "Please wait here, the doctor will see you at 2 PM.",
    "Go straight ahead about 20 steps, then turn left.",
    "Alright, have a wonderful and safe afternoon!",
  ];

  const possibleSoundEvents = [
    { label: "Door knock detected", icon: "door_front" },
    { label: "Alarm / beep detected", icon: "alarm" },
    { label: "Phone ringing nearby", icon: "phone_ring" },
    { label: "Footsteps approaching", icon: "footsteps" },
    { label: "Glass clinking", icon: "wine_bar" },
  ];
  
  const [mockIndex, setMockIndex] = useState(0);

  // Subscribe to realtime broadcast captions from other devices
  useEffect(() => {
    const unsubscribe = realtimeCaptions.subscribe((msg: CaptionMessage) => {
      setCaptions((prev) => {
        // Prevent duplicate messages
        if (prev.length > 0 && prev[prev.length - 1].text === msg.text) return prev;
        return [...prev, { text: msg.text, speaker: msg.speaker }];
      });
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions]);

  useEffect(() => {
    if (isTranscribing) {
      startTranscribing();
      startSoundEventDetection();
    } else {
      stopTranscribing();
      stopSoundEventDetection();
    }

    return () => {
      stopTranscribing();
      stopSoundEventDetection();
    };
  }, [isTranscribing]);

  const toggleRealtimeBroadcast = () => {
    if (isBroadcastActive) {
      realtimeCaptions.leaveRoom();
      setIsBroadcastActive(false);
      setRoomId("");
      addToast("Broadcast session ended", "info");
      speak("Live caption broadcasting stopped.", true);
    } else {
      const newRoom = `room-${Math.floor(1000 + Math.random() * 9000)}`;
      realtimeCaptions.joinRoom(newRoom);
      setIsBroadcastActive(true);
      setRoomId(newRoom);
      addToast(`Broadcasting on ${newRoom}`, "success");
      speak(`Broadcasting active on room ${newRoom}. Other devices can sync live captions.`, true);
    }
  };

  // Simulated sound event detection (periodic random non-speech alerts)
  const startSoundEventDetection = () => {
    const triggerRandom = () => {
      if (!isTranscribing) return;
      const delay = Math.random() * 15000 + 15000;
      soundEventIntervalRef.current = setTimeout(() => {
        const event = possibleSoundEvents[Math.floor(Math.random() * possibleSoundEvents.length)];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newEvent: SoundEvent = { id: Date.now(), ...event, time: timeStr };
        
        setSoundEvents((prev) => [...prev, newEvent]);
        setShowSoundAlert(newEvent);
        
        // Distinct alert beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
          osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.2);
        } catch {}
        
        speak(`Sound alert: ${event.label}`, true);
        setTimeout(() => setShowSoundAlert(null), 4000);
        triggerRandom();
      }, delay);
    };
    triggerRandom();
  };

  const stopSoundEventDetection = () => {
    if (soundEventIntervalRef.current) {
      clearTimeout(soundEventIntervalRef.current);
      soundEventIntervalRef.current = null;
    }
  };

  const startTranscribing = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Captions running (Simulated)");
      setSttSource("Simulated STT");
      runMockCaptioning();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setStatus("Transcribing. Speak near microphone...");
        setSttSource(isOnline ? "Google Cloud / Web Speech" : "On-Device Web Speech");
        addToast("Captions active. Speak now.", "success");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setStatus(`Error: ${event.error}. Fallback mock activated.`);
        runMockCaptioning();
      };

      recognition.onresult = (event: any) => {
        let finalTrans = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          }
        }
        if (finalTrans.trim()) {
          const speaker: "them" | "you" = Math.random() > 0.3 ? "them" : "you";
          const newCaption: { text: string; speaker: "them" | "you" } = { text: finalTrans.trim(), speaker };
          setCaptions((prev) => [...prev, newCaption]);

          // Broadcast to connected rooms if active
          if (isBroadcastActive) {
            realtimeCaptions.broadcastCaption(newCaption);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setStatus("Microphone access failed. Simulated mode active.");
      runMockCaptioning();
    }
  };

  const stopTranscribing = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mockTimeoutRef.current) {
      clearTimeout(mockTimeoutRef.current);
    }
    setStatus("Captions paused.");
  };

  const runMockCaptioning = () => {
    if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);

    const delay = Math.random() * 4000 + 4000;
    mockTimeoutRef.current = setTimeout(() => {
      const speaker: "them" | "you" = Math.random() > 0.4 ? "them" : "you";
      const newCaption: { text: string; speaker: "them" | "you" } = { text: mockPhrases[mockIndex], speaker };
      setCaptions((prev) => [...prev, newCaption]);
      if (isBroadcastActive) {
        realtimeCaptions.broadcastCaption(newCaption);
      }
      setMockIndex((prev) => (prev + 1) % mockPhrases.length);
      runMockCaptioning();
    }, delay);
  };

  const handleToggle = () => {
    const nextState = !isTranscribing;
    setIsTranscribing(nextState);
    speak(nextState ? "Transcribing resumed" : "Transcribing paused", true);
    addToast(nextState ? "Listening" : "Paused", nextState ? "success" : "info");
  };

  const handleClear = () => {
    setCaptions([]);
    setSoundEvents([]);
    speak("Caption history cleared", true);
    addToast("Captions cleared", "info");
  };

  const handleCopyAll = () => {
    const allText = captions.map((c) => `[${c.speaker === "you" ? "You" : "Speaker"}]: ${c.text}`).join("\n");
    navigator.clipboard.writeText(allText || "No captions recorded.");
    speak("All captions copied to clipboard", true);
    addToast("Captions copied!", "success");
  };

  const zoomIn = () => {
    if (fontSizeScale < 40) {
      setFontSizeScale((prev) => prev + 2);
      speak(`Font size increased to ${fontSizeScale + 2} pixels`, true);
    }
  };

  const zoomOut = () => {
    if (fontSizeScale > 16) {
      setFontSizeScale((prev) => prev - 2);
      speak(`Font size decreased to ${fontSizeScale - 2} pixels`, true);
    }
  };

  const highlightKeyPhrases = (text: string) => {
    const keywords = /\b(\d+(?:\.\d+)?|\d+\s*(?:AM|PM|am|pm)|left|right|ahead|behind|straight|exit|restroom|doctor|pharmacy)\b/gi;
    const parts = text.split(keywords);
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      if (keywords.test(part)) {
        return (
          <mark key={index} className="bg-amber-200 dark:bg-amber-800 px-1 rounded font-extrabold text-[1.05em]">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-3xl mx-auto w-full h-[calc(100vh-140px)]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3 gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-on-surface truncate">Live Captioning</h1>
            {isBroadcastActive && (
              <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {roomId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${isTranscribing ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
            <span className="text-base text-on-surface-variant font-semibold truncate">{status}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Realtime Broadcast Toggle */}
          <button
            onClick={toggleRealtimeBroadcast}
            className={`h-10 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold border cursor-pointer transition-all ${
              isBroadcastActive
                ? "bg-emerald-500 text-white border-emerald-600 shadow"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant"
            }`}
            title="Broadcast captions in realtime across devices"
          >
            <span className="material-symbols-outlined text-base">podcasts</span>
            <span>{isBroadcastActive ? "Broadcasting" : "Broadcast"}</span>
          </button>

          {/* Copy all captions */}
          <button
            onClick={handleCopyAll}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
            aria-label="Copy all captions"
          >
            <span className="material-symbols-outlined text-xl">content_copy</span>
          </button>

          {/* Text Zoom Controls */}
          <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1 border border-outline-variant">
            <button
              onClick={zoomOut}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-surface-container-high text-on-surface cursor-pointer font-bold"
              aria-label="Decrease caption font size"
            >
              A-
            </button>
            <span className="px-2 font-bold text-sm text-on-surface-variant">{fontSizeScale}px</span>
            <button
              onClick={zoomIn}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-surface-container-high text-on-surface cursor-pointer font-bold"
              aria-label="Increase caption font size"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Sound Event Alert Banner */}
      {showSoundAlert && (
        <div className="bg-amber-500 text-black rounded-2xl px-5 py-3 flex items-center gap-3 animate-slide-up shadow-lg border-2 border-amber-400">
          <span className="material-symbols-outlined text-3xl animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
            {showSoundAlert.icon}
          </span>
          <div className="flex-grow">
            <p className="text-lg font-extrabold">{showSoundAlert.label}</p>
            <p className="text-sm font-semibold opacity-80">{showSoundAlert.time}</p>
          </div>
          <button
            onClick={() => setShowSoundAlert(null)}
            className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center cursor-pointer"
            aria-label="Dismiss sound alert"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Caption View Box Container */}
      <div className="flex-grow bg-surface-container-lowest border-2 border-outline-variant rounded-2xl p-6 shadow-inner flex flex-col justify-between overflow-hidden">
        {/* Caption scroll area */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto flex flex-col gap-6 pr-2">
          {captions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 gap-4">
              <span className="material-symbols-outlined text-6xl text-zinc-500">closed_caption_disabled</span>
              <p className="text-xl max-w-sm">No captions recorded yet. Speak near your microphone to begin.</p>
            </div>
          ) : (
            captions.map((cap, i) => {
              const isYou = cap.speaker === "you";
              return (
                <div
                  key={i}
                  className={`flex w-full ${isYou ? "justify-end" : "justify-start"} animate-slide-up`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl p-5 shadow-sm leading-relaxed ${
                      isYou
                        ? "bg-primary-container text-on-primary-container rounded-br-none border-2 border-primary/20"
                        : "bg-surface-container-high text-on-surface rounded-bl-none border-2 border-outline-variant"
                    } font-bold`}
                    style={{ fontSize: `${fontSizeScale}px` }}
                  >
                    <div className="text-xs uppercase tracking-wider opacity-60 font-black mb-1 flex justify-between">
                      <span>{isYou ? "Outgoing TTS" : "Speaker"}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cap.text);
                          addToast("Caption copied", "success");
                        }}
                        className="opacity-40 hover:opacity-100 cursor-pointer"
                        aria-label="Copy this caption"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                    <div>{highlightKeyPhrases(cap.text)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sound events log */}
      {soundEvents.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {soundEvents.slice(-5).map((ev) => (
            <div key={ev.id} className="shrink-0 flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full px-3 py-1 text-xs font-bold">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{ev.icon}</span>
              <span>{ev.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Control row with Central mic toggle */}
      <div className="flex items-center justify-between gap-4 mt-2">
        <button
          onClick={handleClear}
          className="px-6 h-[56px] rounded-xl bg-surface-container border-2 border-outline hover:bg-surface-container-high font-bold text-lg text-on-surface cursor-pointer active:scale-95 transition-all"
        >
          Clear History
        </button>

        {/* Central Microphone button */}
        <button
          onClick={handleToggle}
          aria-label={isTranscribing ? "Pause transcribing captions" : "Resume transcribing captions"}
          className={`w-[80px] h-[80px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer ${
            isTranscribing ? "bg-red-600 text-white" : "bg-primary text-white"
          }`}
        >
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isTranscribing ? "pause" : "mic"}
          </span>
        </button>

        <div className="w-[120px] flex justify-end">
          {isTranscribing && <Soundwave color="bg-primary" size="sm" />}
        </div>
      </div>
    </div>
  );
}
