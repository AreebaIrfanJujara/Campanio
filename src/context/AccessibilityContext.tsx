"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { supabase } from "@/lib/supabase";
import {
  fetchUserProfile,
  upsertUserProfile,
} from "@/lib/supabaseService";

import {
  getSharedAudioContext,
  playAudioData,
  stopAudioData,
} from "@/lib/audioManager";

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

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let speechDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let speechSessionCount = 0;

const ttsAudioCache = new Map<string, string>();

const defaultState: PersistedState = {
  theme: "standard",
  voiceVolume: 0.9,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceGuidanceActive: true,
  wakeWordActive: false,
  userProfile: {
    name: "Alex",
    preset: "standard",
  },
  captionSize: "md",
  reducedMotion: false,
  ttsVoice: "neural-f",
  ocrAutoTranslate: false,
};

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      return {
        ...defaultState,
        ...parsed,
      };
    }
  } catch (e) {
    console.error(
      "Failed to load persisted accessibility state",
      e
    );
  }

  return defaultState;
}

interface AccessibilityContextType {
  theme: "standard" | "dark" | "high-contrast";
  toggleTheme: () => void;
  setThemeMode: (
    mode: "standard" | "dark" | "high-contrast"
  ) => void;

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

  speak: (
    text: string,
    force?: boolean,
    lang?: string
  ) => void;

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

const AccessibilityContext =
  createContext<AccessibilityContextType | undefined>(
    undefined
  );

export const AccessibilityProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] =
    useState<PersistedState>(loadPersistedState);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [isAssistantOpen, setIsAssistantOpen] =
    useState(false);

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const voicesRef =
    useRef<SpeechSynthesisVoice[]>([]);
  

  // Used to delay the sidebar-open announcement
  const sidebarSpeechTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Load browser voices
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      voicesRef.current =
        window.speechSynthesis.getVoices();
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices
      );
    };
  }, []);

  /*
   * Unlock audio on user interaction
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlockAudio = () => {
  try {
    const audioContext = getSharedAudioContext();

    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (error) {
    console.error("Failed to unlock audio", error);
  }
};

    window.addEventListener(
      "touchstart",
      unlockAudio,
      { once: true }
    );

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      { once: true }
    );

    window.addEventListener(
      "click",
      unlockAudio,
      { once: true }
    );

    return () => {
      window.removeEventListener(
        "touchstart",
        unlockAudio
      );

      window.removeEventListener(
        "pointerdown",
        unlockAudio
      );

      window.removeEventListener(
        "click",
        unlockAudio
      );
    };
  }, []);

  /*
   * Save state
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.error(
        "Failed to save accessibility settings",
        error
      );
    }
  }, [state]);

  /*
   * Apply Theme and Reduced Motion to DOM and sync meta theme-color
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    root.classList.remove("dark", "high-contrast");
    body.classList.remove("dark", "high-contrast");

    if (state.theme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else if (state.theme === "high-contrast") {
      root.classList.add("high-contrast");
      body.classList.add("high-contrast");
      root.setAttribute("data-theme", "high-contrast");
    } else {
      root.setAttribute("data-theme", "standard");
    }

    if (state.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }

    // Sync mobile browser status bar / theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    if (state.theme === "dark") {
      metaThemeColor.setAttribute("content", "#111116");
    } else if (state.theme === "high-contrast") {
      metaThemeColor.setAttribute("content", "#000000");
    } else {
      metaThemeColor.setAttribute("content", "#1943c2");
    }
  }, [state.theme, state.reducedMotion]);

  /*
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined") return;

    speechSessionCount++;

    if (activeUtterance) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      activeUtterance = null;
    }

    if (activeAudioElement) {
      try {
        activeAudioElement.pause();
        activeAudioElement.currentTime = 0;
      } catch {}

      activeAudioElement = null;
    }

    try {
      stopAudioData();
    } catch {}

    setIsSpeaking(false);
  }, []);

  /*
   * Speak text
   */
  const speak = useCallback(
    (
      text: string,
      force = false,
      lang?: string
    ) => {
      if (
        typeof window === "undefined" ||
        !text.trim()
      ) {
        return;
      }

      if (
        !force &&
        !state.voiceGuidanceActive
      ) {
        return;
      }

      const cleanText = text.trim();

      if (speechDebounceTimer) {
        clearTimeout(speechDebounceTimer);
        speechDebounceTimer = null;
      }

      stopSpeaking();

      const currentSession =
        ++speechSessionCount;

      /*
       * Detect language
       */
      let targetLang = lang || "en";

      if (
        /[\u0600-\u06FF]/.test(cleanText)
      ) {
        targetLang = "ur";
      } else if (
        /[\u0900-\u097F]/.test(cleanText)
      ) {
        targetLang = "hi";
      } else if (
        /[\u3040-\u30FF]/.test(cleanText)
      ) {
        targetLang = "ja";
      } else if (
        /[\u4E00-\u9FFF]/.test(cleanText)
      ) {
        targetLang = "zh";
      }

      /*
       * Browser Speech Synthesis
       */
      if ("speechSynthesis" in window) {
        const utterance =
          new SpeechSynthesisUtterance(
            cleanText
          );

        utterance.lang = targetLang;

        utterance.volume =
          state.voiceVolume;

        utterance.rate =
          state.speechRate;

        utterance.pitch =
          state.speechPitch;

        const voices =
          voicesRef.current;

        const matchingVoice =
          voices.find((voice) =>
            voice.lang
              .toLowerCase()
              .startsWith(
                targetLang.toLowerCase()
              )
          );

        if (matchingVoice) {
          utterance.voice =
            matchingVoice;
        }

        activeUtterance = utterance;

        utterance.onstart = () => {
          if (
            currentSession ===
            speechSessionCount
          ) {
            setIsSpeaking(true);
          }
        };

        utterance.onend = () => {
          if (
            currentSession ===
            speechSessionCount
          ) {
            setIsSpeaking(false);
            activeUtterance = null;
          }
        };

        utterance.onerror = async () => {
          if (
            currentSession !==
            speechSessionCount
          ) {
            return;
          }

          activeUtterance = null;

          try {
            const response =
              await fetch(
                "/api/tts/speak",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    text: cleanText,
                    lang: targetLang,
                  }),
                }
              );

            if (!response.ok) {
              throw new Error(
                "TTS request failed"
              );
            }

            const data =
              await response.json();

            if (
              currentSession !==
              speechSessionCount
            ) {
              return;
            }

            if (data.audioUrl) {
              const audio =
                new Audio(
                  data.audioUrl
                );

              audio.volume =
                state.voiceVolume;

              activeAudioElement =
                audio;

              audio.onplay = () => {
                if (
                  currentSession ===
                  speechSessionCount
                ) {
                  setIsSpeaking(true);
                }
              };

              audio.onended = () => {
                if (
                  currentSession ===
                  speechSessionCount
                ) {
                  setIsSpeaking(false);
                  activeAudioElement =
                    null;
                }
              };

              await audio.play();
            }
          } catch (error) {
            console.error(
              "TTS fallback failed",
              error
            );

            setIsSpeaking(false);
          }
        };

        try {
          window.speechSynthesis.speak(
            utterance
          );
        } catch (error) {
          console.error(
            "Speech synthesis failed",
            error
          );
        }
      }
    },
    [
      state.voiceGuidanceActive,
      state.voiceVolume,
      state.speechRate,
      state.speechPitch,
      stopSpeaking,
    ]
  );

  /*
   * Apply accessibility preset
   */
  const applyPreset = useCallback(
    (preset: PresetType) => {
      setState((prev) => {
        let updatedTheme = prev.theme;
        let updatedVoiceGuidance = prev.voiceGuidanceActive;

        if (preset === "visual") {
          updatedTheme = "high-contrast";
          updatedVoiceGuidance = true;
        } else if (preset === "standard" && prev.theme === "high-contrast") {
          updatedTheme = "standard";
        }

        return {
          ...prev,
          theme: updatedTheme,
          voiceGuidanceActive: updatedVoiceGuidance,
          userProfile: {
            ...prev.userProfile,
            preset,
          },
        };
      });

      const messages: Record<
        PresetType,
        string
      > = {
        visual:
          "Visual accessibility mode selected. High contrast mode activated.",
        hearing:
          "Hearing accessibility mode selected.",
        motor:
          "Motor accessibility mode selected.",
        standard:
          "Standard accessibility mode selected.",
      };

      speak(messages[preset], true);
    },
    [speak]
  );

  /*
   * Theme
   */
  const toggleTheme = () => {
    setState((prev) => {
      const nextTheme =
        prev.theme === "standard"
          ? "dark"
          : prev.theme === "dark"
          ? "high-contrast"
          : "standard";

      return {
        ...prev,
        theme: nextTheme,
      };
    });
  };

  const setThemeMode = (
    mode:
      | "standard"
      | "dark"
      | "high-contrast"
  ) => {
    setState((prev) => ({
      ...prev,
      theme: mode,
    }));
  };

  /*
   * Sidebar toggle
   *
   * IMPORTANT:
   * The sidebar still opens immediately.
   * The announcement happens 1 second later.
   */
  const toggleSidebar = () => {
    const willOpen = !isSidebarOpen;

    setIsSidebarOpen(willOpen);

    if (sidebarSpeechTimerRef.current) {
      clearTimeout(
        sidebarSpeechTimerRef.current
      );

      sidebarSpeechTimerRef.current = null;
    }

    if (willOpen) {
      sidebarSpeechTimerRef.current =
        setTimeout(() => {
          speak(
            "Accessibility sidebar opened. Use the options in the sidebar to navigate and adjust your accessibility settings.",
            true
          );

          sidebarSpeechTimerRef.current =
            null;
        }, 1000);
    }
  };

  /*
   * Clean up sidebar timer
   */
  useEffect(() => {
    return () => {
      if (sidebarSpeechTimerRef.current) {
        clearTimeout(
          sidebarSpeechTimerRef.current
        );
      }
    };
  }, []);

  /*
   * State setters
   */
  const setVoiceVolume = (v: number) => {
    setState((prev) => ({
      ...prev,
      voiceVolume: v,
    }));
  };

  const setSpeechRate = (r: number) => {
    setState((prev) => ({
      ...prev,
      speechRate: r,
    }));
  };

  const setSpeechPitch = (p: number) => {
    setState((prev) => ({
      ...prev,
      speechPitch: p,
    }));
  };

  const setVoiceGuidanceActive = (
    active: boolean
  ) => {
    setState((prev) => ({
      ...prev,
      voiceGuidanceActive: active,
    }));
  };

  const setWakeWordActive = (
    active: boolean
  ) => {
    setState((prev) => ({
      ...prev,
      wakeWordActive: active,
    }));
  };

  const setUserProfile = (
    profile: UserProfile
  ) => {
    setState((prev) => ({
      ...prev,
      userProfile: profile,
    }));
  };

  const setCaptionSize = (
    size: CaptionSize
  ) => {
    setState((prev) => ({
      ...prev,
      captionSize: size,
    }));
  };

  const setReducedMotion = (
    value: boolean
  ) => {
    setState((prev) => ({
      ...prev,
      reducedMotion: value,
    }));
  };

  const setTtsVoice = (value: string) => {
    setState((prev) => ({
      ...prev,
      ttsVoice: value,
    }));
  };

  const setOcrAutoTranslate = (
    value: boolean
  ) => {
    setState((prev) => ({
      ...prev,
      ocrAutoTranslate: value,
    }));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        theme: state.theme,
        toggleTheme,
        setThemeMode,

        voiceVolume: state.voiceVolume,
        setVoiceVolume,

        speechRate: state.speechRate,
        setSpeechRate,

        speechPitch: state.speechPitch,
        setSpeechPitch,

        voiceGuidanceActive:
          state.voiceGuidanceActive,
        setVoiceGuidanceActive,

        wakeWordActive:
          state.wakeWordActive,
        setWakeWordActive,

        userProfile: state.userProfile,
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

        captionSize: state.captionSize,
        setCaptionSize,

        reducedMotion:
          state.reducedMotion,
        setReducedMotion,

        ttsVoice: state.ttsVoice,
        setTtsVoice,

        ocrAutoTranslate:
          state.ocrAutoTranslate,
        setOcrAutoTranslate,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility =
  () => {
    const context = useContext(
      AccessibilityContext
    );

    if (!context) {
      throw new Error(
        "useAccessibility must be used inside AccessibilityProvider"
      );
    }

    return context;
  };