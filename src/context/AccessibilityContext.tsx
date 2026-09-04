"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { fetchUserProfile, upsertUserProfile } from "@/lib/supabaseService";

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
const ttsAudioCache = new Map<string, string>();

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
  speak: (text: string, force?: boolean, lang?: string) => void;
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

    // Sync from Supabase if logged in
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (uid) {
        setCurrentUserId(uid);
        fetchUserProfile(uid).then((prof) => {
          if (prof) {
            if (prof.name || prof.preset) {
              setUserProfile({
                name: prof.name || saved.userProfile.name,
                preset: (prof.preset as PresetType) || saved.userProfile.preset,
              });
            }
            if (prof.high_contrast) setTheme("high-contrast");
            if (prof.speech_rate) setSpeechRate(Number(prof.speech_rate));
            if (prof.speech_pitch) setSpeechPitch(Number(prof.speech_pitch));
            if (prof.caption_size) setCaptionSize(prof.caption_size as CaptionSize);
            if (prof.reduced_motion !== undefined) setReducedMotion(prof.reduced_motion);
            if (prof.tts_voice) setTtsVoice(prof.tts_voice);
            if (prof.ocr_auto_translate !== undefined) setOcrAutoTranslate(prof.ocr_auto_translate);
          }
        }).catch(() => {});
      }
    }).catch(() => {});

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        fetchUserProfile(uid).then((prof) => {
          if (prof) {
            if (prof.name || prof.preset) {
              setUserProfile({
                name: prof.name || "Alex",
                preset: (prof.preset as PresetType) || "standard",
              });
            }
            if (prof.high_contrast) setTheme("high-contrast");
            if (prof.speech_rate) setSpeechRate(Number(prof.speech_rate));
            if (prof.speech_pitch) setSpeechPitch(Number(prof.speech_pitch));
            if (prof.caption_size) setCaptionSize(prof.caption_size as CaptionSize);
            if (prof.reduced_motion !== undefined) setReducedMotion(prof.reduced_motion);
            if (prof.tts_voice) setTtsVoice(prof.tts_voice);
            if (prof.ocr_auto_translate !== undefined) setOcrAutoTranslate(prof.ocr_auto_translate);
          }
        }).catch(() => {});
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Persist state changes to localStorage and Supabase
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

    // Sync to Supabase in background if user is authenticated
    if (currentUserId) {
      const timer = setTimeout(() => {
        upsertUserProfile(currentUserId, {
          name: userProfile.name,
          preset: userProfile.preset,
          high_contrast: theme === "high-contrast",
          speech_rate: speechRate,
          speech_pitch: speechPitch,
          caption_size: captionSize,
          reduced_motion: reducedMotion,
          tts_voice: ttsVoice,
          ocr_auto_translate: ocrAutoTranslate,
        }).catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialized, currentUserId, theme, voiceVolume, speechRate, speechPitch, voiceGuidanceActive, wakeWordActive, userProfile, captionSize, reducedMotion, ttsVoice, ocrAutoTranslate]);

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

  const speak = useCallback((text: string, force = false, langOverride?: string) => {
    if (typeof window === "undefined") return;

    if (!voiceGuidanceActive && !force) return;

    const cleanText = text.trim();
    if (!cleanText) return;

    if (speechDebounceTimer) {
      clearTimeout(speechDebounceTimer);
    }

    // Cancel any active speech or audio immediately to prevent echoing or overlapping
    stopSpeaking();

    // Increment speech session token so stale calls are ignored
    const thisSessionId = ++speechSessionCount;

    // Determine target language
    let targetLang = langOverride || "en";
    if (!langOverride) {
      if (/[\u0600-\u06FF]/.test(cleanText) || /\b(yaar|baat|suno|kya|hai|karo|shukriya|nahin|nahi|apka|mera|kaise|theek|madad|bhai|salam)\b/i.test(cleanText)) {
        targetLang = "ur";
      } else if (/[\u0900-\u097F]/.test(cleanText)) {
        targetLang = "hi";
      } else if (/[\u3040-\u30ff]/.test(cleanText)) {
        targetLang = "ja";
      } else if (/[\u4e00-\u9fff]/.test(cleanText)) {
        targetLang = "zh-CN";
      } else if (/[\u00C0-\u017F¿¡]/.test(cleanText) || /\b(hola|gracias|buenos|dias|tardes|por favor|amigo|como estas)\b/i.test(cleanText)) {
        targetLang = "es";
      } else if (/\b(bonjour|merci|oui|non|s'il vous plait)\b/i.test(cleanText)) {
        targetLang = "fr";
      } else if (/\b(danke|bitte|hallo|guten)\b/i.test(cleanText)) {
        targetLang = "de";
      }
    }

    const langPrefix = targetLang.split("-")[0].toLowerCase();

    // Helper: Play natural audio stream from server
    const playNaturalAudioStream = async () => {
      try {
        const cacheKey = `${targetLang}_${cleanText}`;
        const cachedUrl = ttsAudioCache.get(cacheKey);
        if (cachedUrl && thisSessionId === speechSessionCount) {
          const audio = new Audio(cachedUrl);
          audio.volume = 1.0;
          activeAudioElement = audio;
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
            }
          };
          audio.play().catch(() => {});
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch("/api/tts/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText, lang: targetLang }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (thisSessionId !== speechSessionCount) return;

        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl && thisSessionId === speechSessionCount) {
            ttsAudioCache.set(cacheKey, data.audioUrl);
            const audio = new Audio(data.audioUrl);
            audio.volume = 1.0;
            activeAudioElement = audio;
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
              }
            };
            audio.play().catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Natural audio stream catch:", err);
      }
    };

    // If SpeechSynthesis is available in browser
    if (window.speechSynthesis) {
      const voices: SpeechSynthesisVoice[] = voicesRef.current.length > 0 
        ? voicesRef.current 
        : (window.speechSynthesis.getVoices?.() || []);

      const matchingVoices = voices.filter((v) => 
        v.lang.toLowerCase().replace("_", "-").startsWith(langPrefix)
      );

      // If non-English language requested and no local browser voice exists, use natural audio stream
      if (langPrefix !== "en" && matchingVoices.length === 0) {
        playNaturalAudioStream();
        return;
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.volume = 1.0; // 100% full loudness
        utterance.rate = Math.max(0.7, Math.min(1.8, speechRate));

        // Format IETF language tag
        const ietfTag = targetLang === "ur" ? "ur-PK" : targetLang === "hi" ? "hi-IN" : targetLang === "ja" ? "ja-JP" : targetLang === "zh-CN" ? "zh-CN" : targetLang === "es" ? "es-ES" : targetLang === "fr" ? "fr-FR" : targetLang === "de" ? "de-DE" : "en-US";
        utterance.lang = ietfTag;

        // Apply Voice Model Profile (Male / Female / System Default)
        if (matchingVoices.length > 0) {
          if (ttsVoice === "neural-m") {
            // Prefer male voice
            const maleVoice = matchingVoices.find((v) => 
              /(david|george|james|mark|richard|thomas|daniel|alex|guy|male|diego|jorge|pablo|en-us-guy|stefan)/i.test(v.name)
            );
            utterance.voice = maleVoice || matchingVoices[0];
            utterance.pitch = Math.max(0.5, Math.min(1.1, speechPitch * 0.85)); // Deep resonant male tone
          } else if (ttsVoice === "neural-f") {
            // Prefer female voice
            const femaleVoice = matchingVoices.find((v) => 
              /(zira|hazel|samantha|victoria|jenny|female|heera|carmen|monica|en-us-jenny|hedda)/i.test(v.name)
            );
            utterance.voice = femaleVoice || matchingVoices[0];
            utterance.pitch = Math.max(0.8, Math.min(1.8, speechPitch * 1.15)); // Bright clear female tone
          } else {
            utterance.voice = matchingVoices[0];
            utterance.pitch = Math.max(0.6, Math.min(1.5, speechPitch));
          }
        } else {
          // Adjust pitch for male/female simulation if default voice
          if (ttsVoice === "neural-m") {
            utterance.pitch = Math.max(0.5, Math.min(1.1, speechPitch * 0.85));
          } else if (ttsVoice === "neural-f") {
            utterance.pitch = Math.max(0.8, Math.min(1.8, speechPitch * 1.15));
          }
        }

        utterance.onstart = () => {
          if (thisSessionId === speechSessionCount) {
            setIsSpeaking(true);
          }
        };

        utterance.onend = () => {
          if (thisSessionId === speechSessionCount) {
            setIsSpeaking(false);
            activeUtterance = null;
          }
        };

        utterance.onerror = (err) => {
          console.warn("speechSynthesis error fallback:", err);
          if (thisSessionId === speechSessionCount) {
            setIsSpeaking(false);
            activeUtterance = null;
            playNaturalAudioStream();
          }
        };

        activeUtterance = utterance;
        (window as any).__companioUtterance = utterance;

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn("Direct speech synthesis error:", err);
      }
    }

    // Fallback: Natural audio stream
    playNaturalAudioStream();
  }, [voiceGuidanceActive, speechRate, speechPitch, ttsVoice]);

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
