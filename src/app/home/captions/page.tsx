"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";
import { Soundwave } from "@/components/Soundwave";
import { useToast } from "@/context/ToastContext";
import { realtimeCaptions, CaptionMessage } from "@/lib/realtimeCaptions";
import { CompanioAPI } from "@/lib/api";
import { wearableBridge } from "@/lib/wearableBridge";

interface SoundEvent {
  id: number;
  label: string;
  icon: string;
  time: string;
}

interface CaptionEntry {
  text: string;
  speaker: string;
}

export default function CaptionsPage() {
  const { speak, userProfile } = useAccessibility();
  const { isOnline } = useOffline();
  const { addToast } = useToast();
  
  const [isTranscribing, setIsTranscribing] = useState<boolean>(true);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [interimText, setInterimText] = useState<string>("");
  const [status, setStatus] = useState<string>("Initializing captions...");
  const [fontSizeScale, setFontSizeScale] = useState<number>(24);
  const [soundEvents, setSoundEvents] = useState<SoundEvent[]>([]);
  const [showSoundAlert, setShowSoundAlert] = useState<SoundEvent | null>(null);

  // Realtime multi-device sync state
  const [isBroadcastActive, setIsBroadcastActive] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [sttSource, setSttSource] = useState<string>("Web Speech / Whisper STT");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Subscribe to realtime broadcast captions from other devices
  useEffect(() => {
    speak("Live captions active. Listening for surrounding voices.", true);
    const unsubscribe = realtimeCaptions.subscribe((msg: CaptionMessage) => {
      setCaptions((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].text === msg.text) return prev;
        return [...prev, { text: msg.text, speaker: msg.speaker === "you" ? "You" : "Speaker 1" }];
      });
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions, interimText]);

  useEffect(() => {
    if (isTranscribing) {
      startTranscribing();
    } else {
      stopTranscribing();
    }

    return () => {
      stopTranscribing();
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

  const startTranscribing = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      setStatus("Web Speech API not supported in this browser.");
      setSttSource("Microphone STT");
      return;
    }

    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setStatus("Listening for speech in real-time...");
        setSttSource(isOnline ? "Groq Whisper + Live Web Speech" : "On-Device Web Speech");
      };

      recognition.onerror = (event: { error: string }) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error !== "no-speech") {
          setStatus(`Status: ${event.error}.`);
        }
      };

      recognition.onresult = (event: { resultIndex: number; results: SpeechRecognitionResultList }) => {
        let finalTrans = "";
        let interimTrans = "";
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTrans += item[0].transcript;
          } else {
            interimTrans += item[0].transcript;
          }
        }

        setInterimText(interimTrans);

        if (finalTrans.trim()) {
          const newCaption: CaptionEntry = { text: finalTrans.trim(), speaker: "Speaker 1" };
          setCaptions((prev) => [...prev, newCaption]);
          setInterimText("");
          wearableBridge.triggerHaptic("caption_alert");

          if (isBroadcastActive) {
            realtimeCaptions.broadcastCaption({ text: newCaption.text, speaker: "them" });
          }
        }
      };

      recognition.onend = () => {
        // Automatically restart if still active
        if (recognitionRef.current && isTranscribing) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setStatus("Microphone access failed.");
    }
  };

  const stopTranscribing = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setStatus("Captions paused.");
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
    const allText = captions.map((c) => `[${c.speaker}]: ${c.text}`).join("\n");
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

  const getSpeakerColor = (speaker: string) => {
    if (speaker === "You" || speaker === "you") return "bg-primary-container text-white border-primary";
    if (speaker === "Speaker 1") return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
    if (speaker === "Speaker 2") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (speaker === "Speaker 3") return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30";
    return "bg-surface-container-high text-on-surface border-outline-variant";
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
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full h-full min-h-0">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3 gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-on-surface truncate">Live Captions</h1>
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

          <button
            onClick={handleCopyAll}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
            aria-label="Copy all captions"
          >
            <span className="material-symbols-outlined text-xl">content_copy</span>
          </button>

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

      {/* Caption View Box Container — Expanded height and responsive width */}
      <div className="flex-grow min-h-[460px] bg-surface-container-lowest border-2 border-outline-variant rounded-3xl p-6 shadow-inner flex flex-col justify-between overflow-hidden">
        <div ref={scrollRef} className="flex-grow overflow-y-auto flex flex-col gap-6 pr-2">
          {captions.length === 0 && !interimText ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant gap-4 py-12">
              <span className="material-symbols-outlined text-7xl text-outline animate-pulse">closed_caption</span>
              <p className="text-2xl font-bold max-w-md text-on-surface">Listening for speech...</p>
              <p className="text-base max-w-sm text-on-surface-variant">Speak near your microphone to see instant real-time captions here.</p>
            </div>
          ) : (
            <>
              {captions.map((cap, i) => {
                const isYou = cap.speaker === "You" || cap.speaker === "you";
                return (
                  <div
                    key={i}
                    className={`flex w-full ${isYou ? "justify-end" : "justify-start"} animate-slide-up`}
                  >
                    <div
                      className={`max-w-[88%] rounded-3xl p-5 shadow-sm leading-relaxed ${
                        isYou
                          ? "bg-primary-container text-white rounded-br-none border-2 border-primary/20"
                          : "bg-surface-container-high text-on-surface rounded-bl-none border-2 border-outline-variant"
                      } font-bold`}
                      style={{ fontSize: `${fontSizeScale}px` }}
                    >
                      <div className="text-xs uppercase tracking-wider font-black mb-2 flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold ${getSpeakerColor(cap.speaker)}`}>
                          {cap.speaker}
                        </span>
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
              })}

              {/* Instant Real-Time Interim Transcript Bubble */}
              {interimText && (
                <div className="flex w-full justify-start animate-fade-in">
                  <div
                    className="max-w-[88%] rounded-3xl p-5 bg-primary/10 border-2 border-dashed border-primary text-on-surface font-bold leading-relaxed shadow-sm"
                    style={{ fontSize: `${fontSizeScale}px` }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                      <span className="text-xs uppercase font-black tracking-wider text-primary">Live Transcribing...</span>
                    </div>
                    <p className="opacity-90">{interimText}</p>
                  </div>
                </div>
              )}
            </>
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

      {/* Central mic toggle */}
      <div className="flex items-center justify-between gap-4 mt-2">
        <button
          onClick={handleClear}
          className="px-6 h-[56px] rounded-xl bg-surface-container border-2 border-outline hover:bg-surface-container-high font-bold text-lg text-on-surface cursor-pointer active:scale-95 transition-all"
        >
          Clear History
        </button>

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
