"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export type PresetType = "visual" | "hearing" | "motor" | "standard";

export interface UserProfile {
  name: string;
  preset: PresetType;
}

export type CaptionSize = "sm" | "md" | "lg";

const STORAGE_KEY = "companio_accessibility_settings";

interface PersistedState {
  theme: "standard" | "dark" | "high-contrast";
  voiceVolume: number;
  speechRate: number;
  speechPitch: number;
  voiceGuidanceActive: boolean;
  wakeWordActive: boolean;
  userProfile: UserProfile;
  captionSize: CaptionSize;
  reducedMotion: boolean;
  ttsVoice: string;
  ocrAutoTranslate: boolean;
}

// Global reference to prevent garbage collection of active utterance and manage audio in Chromium/WebKit
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let speechDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let speechSessionCount = 0;

const defaultState: PersistedState = {
  theme: "standard",
  voiceVolume: 0.9,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceGuidanceActive: true,
  wakeWordActive: false,
  userProfile: { name: "Alex", preset: "standard" },
  captionSize: "md",
  reducedMotion: false,
  ttsVoice: "neural-f",
  ocrAutoTranslate: false,
};

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load persisted accessibility state", e);
  }
  return defaultState;
}

interface AccessibilityContextType {
  theme: "standard" | "dark" | "high-contrast";
  toggleTheme: () => void;
  setThemeMode: (mode: "standard" | "dark" | "high-contrast") => void;
  voiceVolume: number;
  setVoiceVolume: (v: number) => void;
  speechRate: number;
  setSpeechRate: (r: number) => void;
  speechPitch: number;
  setSpeechPitch: (p: number) => void;
  voiceGuidanceActive: boolean;
  setVoiceGuidanceActive: (active: boolean) => void;
  wakeWordActive: boolean;
  setWakeWordActive: (active: boolean) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  applyPreset: (preset: PresetType) => void;
  speak: (text: string, force?: boolean) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  captionSize: CaptionSize;
  setCaptionSize: (size: CaptionSize) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (v: string) => void;
  ocrAutoTranslate: boolean;
  setOcrAutoTranslate: (v: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [theme, setTheme] = useState<PersistedState["theme"]>(defaultState.theme);
  const [voiceVolume, setVoiceVolume] = useState<number>(defaultState.voiceVolume);
  const [speechRate, setSpeechRate] = useState<number>(defaultState.speechRate);
  const [speechPitch, setSpeechPitch] = useState<number>(defaultState.speechPitch);
  const [voiceGuidanceActive, setVoiceGuidanceActive] = useState<boolean>(defaultState.voiceGuidanceActive);
  const [wakeWordActive, setWakeWordActive] = useState<boolean>(defaultState.wakeWordActive);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultState.userProfile);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [captionSize, setCaptionSize] = useState<CaptionSize>(defaultState.captionSize);
  const [reducedMotion, setReducedMotion] = useState<boolean>(defaultState.reducedMotion);
  const [ttsVoice, setTtsVoice] = useState<string>(defaultState.ttsVoice);
  const [ocrAutoTranslate, setOcrAutoTranslate] = useState<boolean>(defaultState.ocrAutoTranslate);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadPersistedState();
    setTheme(saved.theme);
    setVoiceVolume(saved.voiceVolume);
    setSpeechRate(saved.speechRate);
    setSpeechPitch(saved.speechPitch);
    setVoiceGuidanceActive(saved.voiceGuidanceActive);
    setWakeWordActive(saved.wakeWordActive ?? false);
    setUserProfile(saved.userProfile);
    setCaptionSize(saved.captionSize);
    setReducedMotion(saved.reducedMotion);
    setTtsVoice(saved.ttsVoice);
    setOcrAutoTranslate(saved.ocrAutoTranslate);
    setInitialized(true);
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    if (!initialized) return;
    const state: PersistedState = {
      theme,
      voiceVolume,
      speechRate,
      speechPitch,
      voiceGuidanceActive,
      wakeWordActive,
      userProfile,
      captionSize,
      reducedMotion,
      ttsVoice,
      ocrAutoTranslate,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to persist accessibility state", e);
    }
  }, [initialized, theme, voiceVolume, speechRate, speechPitch, voiceGuidanceActive, wakeWordActive, userProfile, captionSize, reducedMotion, ttsVoice, ocrAutoTranslate]);

  // Apply theme to document root and body — each theme class is managed independently
  useEffect(() => {
    if (!initialized) return;
    const root = document.documentElement;
    const body = document.body;
    // Always reset both theme classes first, then apply the correct one
    root.classList.remove("dark", "high-contrast");
    body.classList.remove("dark", "high-contrast");
    if (theme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else if (theme === "high-contrast") {
      root.classList.add("high-contrast");
      body.classList.add("high-contrast");
    }
    // "standard" → no class (inherits :root token values)
  }, [theme, initialized]);

  // Apply reduced motion to document body
  useEffect(() => {
    if (!initialized) return;
    if (reducedMotion) {
      document.body.classList.add("reduced-motion");
    } else {
      document.body.classList.remove("reduced-motion");
    }
  }, [reducedMotion, initialized]);

  // Handle SpeechSynthesis speaking states
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const handleStatus = () => {
        setIsSpeaking(window.speechSynthesis.speaking);
      };
      const interval = setInterval(handleStatus, 200);
      return () => clearInterval(interval);
    }
  }, []);

  // 3-way cycle: standard → dark → high-contrast → standard
  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "standard") return "dark";
      if (prev === "dark") return "high-contrast";
      return "standard";
    });
  };

  // Explicit setter (used by settings page segmented control)
  const setThemeMode = (mode: "standard" | "dark" | "high-contrast") => {
    setTheme(mode);
  };

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Cache voices and listen for voiceschanged event (common async load in Chromium)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices() || [];
      if (v.length > 0) {
        voicesRef.current = v;
      }
    };

    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  const applyPreset = (preset: PresetType) => {
    setUserProfile((prev) => ({ ...prev, preset }));
    if (preset === "visual") {
      setTheme("high-contrast");
      setVoiceGuidanceActive(true);
      speak("Visual accessibility profile activated. High contrast mode is enabled, and voice guidance is active.", true);
    } else if (preset === "hearing") {
      setTheme("standard");
      speak("Hearing accessibility profile activated. Subtitles and visual cues are prioritized.", true);
    } else if (preset === "motor") {
      setTheme("standard");
      speak("Motor accessibility profile activated. Touch targets are expanded for easier interaction.", true);
    } else {
      setTheme("standard");
      speak("Standard accessibility profile activated.", true);
    }
  };

  const speak = useCallback((text: string, force = false) => {
    if (typeof window === "undefined") return;

    if (!voiceGuidanceActive && !force) return;

    const cleanText = text.trim();
    if (!cleanText) return;

    if (speechDebounceTimer) {
      clearTimeout(speechDebounceTimer);
    }

    // Cancel any active speech or audio immediately to prevent echoing or repetition
    stopSpeaking();

    // Increment speech session token so stale async calls are ignored
    const thisSessionId = ++speechSessionCount;

    // Create audio instance synchronously on user click gesture
    const audio = new Audio();
    audio.volume = 1.0;
    activeAudioElement = audio;

    // Use high-fidelity natural audio speech via backend endpoint
    (async () => {
      try {
        const res = await fetch("/api/tts/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText })
        });
        
        // If another speak() was called while fetching, abort this one
        if (thisSessionId !== speechSessionCount) return;

        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl && thisSessionId === speechSessionCount) {
            audio.src = data.audioUrl;
            setIsSpeaking(true);
            audio.onended = () => {
              if (activeAudioElement === audio) {
                setIsSpeaking(false);
                activeAudioElement = null;
              }
            };
            audio.onerror = () => {
              if (activeAudioElement === audio) {
                setIsSpeaking(false);
                activeAudioElement = null;
                fallbackWebSpeech(cleanText, thisSessionId);
              }
            };
            try {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise.catch((err) => {
                  console.warn("Audio play promise catch:", err);
                  fallbackWebSpeech(cleanText, thisSessionId);
                });
              }
              return;
            } catch {
              fallbackWebSpeech(cleanText, thisSessionId);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Natural TTS endpoint fallback:", e);
      }

      // Offline / Network failure fallback: on-device Web Speech API
      if (thisSessionId === speechSessionCount) {
        fallbackWebSpeech(cleanText, thisSessionId);
      }
    })();

    function fallbackWebSpeech(phrase: string, sessionId: number) {
      if (!window.speechSynthesis || sessionId !== speechSessionCount) return;
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}

      try {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.volume = 1.0; // Full loudness
        utterance.rate = Math.max(0.5, Math.min(2.0, speechRate));
        utterance.pitch = Math.max(0.5, Math.min(2.0, speechPitch));

        let targetLang = "en-US";
        if (/[\u0600-\u06FF]/.test(phrase) || /\b(yaar|baat|suno|kya|hai|karo|shukriya|nahin|nahi|apka|mera|kaise|theek|madad)\b/i.test(phrase)) {
          targetLang = "ur-PK";
        } else if (/[\u0900-\u097F]/.test(phrase)) {
          targetLang = "hi-IN";
        } else if (/[\u3040-\u30ff]/.test(phrase)) {
          targetLang = "ja-JP";
        } else if (/[\u4e00-\u9fff]/.test(phrase)) {
          targetLang = "zh-CN";
        } else if (/[\u00C0-\u017F]/.test(phrase)) {
          targetLang = "es-ES";
        }
        utterance.lang = targetLang;

        const voices: SpeechSynthesisVoice[] = voicesRef.current.length > 0 ? voicesRef.current : (window.speechSynthesis.getVoices?.() || []);
        if (voices.length > 0) {
          const langVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.split("-")[0].toLowerCase()));
          if (langVoice) {
            utterance.voice = langVoice;
          }
        }

        utterance.onstart = () => {
          if (sessionId === speechSessionCount) setIsSpeaking(true);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          activeUtterance = null;
        };
        utterance.onerror = (err) => {
          console.warn("speechSynthesis error:", err);
          setIsSpeaking(false);
          activeUtterance = null;
        };

        activeUtterance = utterance;
        (window as any).__companioUtterance = utterance;

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("speechSynthesis speak error", err);
      }
    }
  }, [voiceGuidanceActive, speechRate, speechPitch]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined") {
      if (activeAudioElement) {
        try {
          activeAudioElement.pause();
          activeAudioElement.currentTime = 0;
        } catch {}
        activeAudioElement = null;
      }
      if (window.speechSynthesis) {
        if (speechDebounceTimer) clearTimeout(speechDebounceTimer);
        try {
          window.speechSynthesis.cancel();
        } catch {}
        activeUtterance = null;
        setIsSpeaking(false);
      }
    }
  };

  // Don't render children until state is hydrated from localStorage
  if (!initialized) {
    return null;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        theme,
        toggleTheme,
        setThemeMode,
        voiceVolume,
        setVoiceVolume,
        speechRate,
        setSpeechRate,
        speechPitch,
        setSpeechPitch,
        voiceGuidanceActive,
        setVoiceGuidanceActive,
        wakeWordActive,
        setWakeWordActive,
        userProfile,
        setUserProfile,
        applyPreset,
        speak,
        stopSpeaking,
        isSpeaking,
        isAssistantOpen,
        setIsAssistantOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
        captionSize,
        setCaptionSize,
        reducedMotion,
        setReducedMotion,
        ttsVoice,
        setTtsVoice,
        ocrAutoTranslate,
        setOcrAutoTranslate,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};
