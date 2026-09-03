"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type PresetType = "visual" | "hearing" | "motor" | "standard";

export interface UserProfile {
  name: string;
  preset: PresetType;
}

export type CaptionSize = "sm" | "md" | "lg";

const STORAGE_KEY = "companio_accessibility_settings";

interface PersistedState {
  theme: "standard" | "high-contrast";
  voiceVolume: number;
  speechRate: number;
  speechPitch: number;
  voiceGuidanceActive: boolean;
  userProfile: UserProfile;
  captionSize: CaptionSize;
  reducedMotion: boolean;
  ttsVoice: string;
  ocrAutoTranslate: boolean;
}

const defaultState: PersistedState = {
  theme: "standard",
  voiceVolume: 0.8,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceGuidanceActive: false,
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
  theme: "standard" | "high-contrast";
  toggleTheme: () => void;
  voiceVolume: number;
  setVoiceVolume: (v: number) => void;
  speechRate: number;
  setSpeechRate: (r: number) => void;
  speechPitch: number;
  setSpeechPitch: (p: number) => void;
  voiceGuidanceActive: boolean;
  setVoiceGuidanceActive: (active: boolean) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  applyPreset: (preset: PresetType) => void;
  speak: (text: string, force?: boolean) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
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
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultState.userProfile);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
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
  }, [initialized, theme, voiceVolume, speechRate, speechPitch, voiceGuidanceActive, userProfile, captionSize, reducedMotion, ttsVoice, ocrAutoTranslate]);

  // Apply theme to document body
  useEffect(() => {
    if (!initialized) return;
    const body = document.body;
    if (theme === "high-contrast") {
      body.classList.add("high-contrast");
    } else {
      body.classList.remove("high-contrast");
    }
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "standard" ? "high-contrast" : "standard"));
  };

  const applyPreset = (preset: PresetType) => {
    setUserProfile((prev) => ({ ...prev, preset }));
    if (preset === "visual") {
      setTheme("high-contrast");
      setVoiceGuidanceActive(true);
      speak("Visual accessibility profile activated. High contrast mode is enabled, and voice guidance is active.", true);
    } else if (preset === "hearing") {
      setTheme("standard");
      setVoiceGuidanceActive(false);
      speak("Hearing accessibility profile activated. Subtitles and visual cues are prioritized.", true);
    } else if (preset === "motor") {
      setTheme("standard");
      setVoiceGuidanceActive(false);
      speak("Motor accessibility profile activated. Touch targets are expanded for easier interaction.", true);
    } else {
      setTheme("standard");
      setVoiceGuidanceActive(false);
      speak("Standard accessibility profile activated.", true);
    }
  };

  const speak = useCallback((text: string, force = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (!voiceGuidanceActive && !force) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = voiceVolume;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceGuidanceActive, voiceVolume, speechRate, speechPitch]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Don't render children until state is hydrated from localStorage
  if (!initialized) {
    return null;
  }

  return (
    <AccessibilityContext.Provider
      value={{
        theme,
        toggleTheme,
        voiceVolume,
        setVoiceVolume,
        speechRate,
        setSpeechRate,
        speechPitch,
        setSpeechPitch,
        voiceGuidanceActive,
        setVoiceGuidanceActive,
        userProfile,
        setUserProfile,
        applyPreset,
        speak,
        stopSpeaking,
        isSpeaking,
        isAssistantOpen,
        setIsAssistantOpen,
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
