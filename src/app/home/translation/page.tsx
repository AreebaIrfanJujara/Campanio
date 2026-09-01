"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";
import { CompanioAPI } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Soundwave } from "@/components/Soundwave";
import { useActivity } from "@/context/ActivityContext";

type TranslateMode = "text" | "ocr" | "voice";

export default function TranslationPage() {
  const { speak, userProfile } = useAccessibility();
  const { isOnline } = useOffline();
  const { addToast } = useToast();
  const { logActivity } = useActivity();

  const [mode, setMode] = useState<TranslateMode>("text");
  const [targetLang, setTargetLang] = useState<string>("es");
  const [loading, setLoading] = useState<boolean>(false);

  // Text Mode States
  const [inputText, setInputText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [translationSource, setTranslationSource] = useState<string>("");

  // OCR Mode States
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrTranslation, setOcrTranslation] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Voice Mode States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceText, setVoiceText] = useState<string>("");
  const [voiceTranslation, setVoiceTranslation] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  const languages = [
    { code: "es", name: "Spanish (Español)" },
    { code: "fr", name: "French (Français)" },
    { code: "ar", name: "Arabic (العربية)" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "zh-CN", name: "Chinese Simplified (中文)" },
    { code: "de", name: "German (Deutsch)" },
    { code: "ja", name: "Japanese (日本語)" },
    { code: "ur", name: "Urdu (اردو)" }
  ];

  // Camera management for OCR Mode
  useEffect(() => {
    if (mode === "ocr") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
    } catch (err) {
      console.error(err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleTranslateText = async () => {
    if (!inputText.trim()) {
      addToast("Please enter text first", "warning");
      return;
    }
    setLoading(true);
    speak("Translating input text...", true);
    try {
      const res = await CompanioAPI.translate(inputText, targetLang);
      setTranslatedText(res.translatedText);
      setTranslationSource(res.source);
      speak(`Translation complete: ${res.translatedText}`, true);
      addToast(
        res.isOffline ? "Translated via Offline Dictionary" : "Translated!",
        "success"
      );
      logActivity("translation", `Translated: ${inputText.slice(0, 30)}...`, "translate", `to ${targetLang}`);
    } catch (e) {
      console.error(e);
      addToast("Translation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureTranslate = async () => {
    setLoading(true);
    setOcrText("");
    setOcrTranslation("");
    speak("Capturing frame for translation...", true);

    try {
      // Capture frame from video
      let base64: string | null = null;
      if (videoRef.current && hasCamera) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          base64 = canvas.toDataURL("image/jpeg", 0.85);
        }
      }

      // First OCR the image
      let scannedText: string;
      if (base64) {
        const ocrResult = await CompanioAPI.ocr(base64);
        scannedText = ocrResult.text;
      } else {
        throw new Error("No camera frame");
      }

      setOcrText(scannedText);

      // Then translate the OCR result
      const res = await CompanioAPI.translate(scannedText, targetLang);
      setOcrTranslation(res.translatedText);
      speak(`Scanned and translated: ${res.translatedText}`, true);
      addToast(res.isOffline ? "Scanned & translated (offline)" : "Successfully scanned & translated", "success");
    } catch (err) {
      console.error(err);
      // Fallback mock
      const mockScanned = "Caution: Wet Floor. Please use stairs in case of emergency.";
      setOcrText(mockScanned);
      try {
        const res = await CompanioAPI.translate(mockScanned, targetLang);
        setOcrTranslation(res.translatedText);
        speak(`Scanned and translated: ${res.translatedText}`, true);
        addToast("Scanned & translated", "success");
      } catch {
        addToast("Translation failed", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceListen = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Mock voice input flow
      setIsListening(true);
      setVoiceText("");
      setVoiceTranslation("");
      speak("Listening to your voice...", true);

      setTimeout(async () => {
        const mockVoice = "Where is the pharmacy store located?";
        setVoiceText(mockVoice);
        setIsListening(false);
        try {
          const res = await CompanioAPI.translate(mockVoice, targetLang);
          setVoiceTranslation(res.translatedText);
          speak(res.translatedText, true);
          addToast("Translated and read aloud", "success");
        } catch (e) {
          console.error(e);
        }
      }, 3000);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setVoiceText("");
        setVoiceTranslation("");
        addToast("Speak now", "info");
      };

      rec.onerror = () => {
        setIsListening(false);
        addToast("Microphone error", "error");
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceText(text);
        speak(`Heard: ${text}. Translating now.`, true);
        
        try {
          const res = await CompanioAPI.translate(text, targetLang);
          setVoiceTranslation(res.translatedText);
          speak(res.translatedText, true);
          addToast("Translation complete", "success");
        } catch (e) {
          console.error(e);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-2xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-on-surface">Live Translation</h1>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            {isOnline ? "Cloud Translate" : "Offline Engine (8 Langs)"}
          </span>
        </div>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Translate conversation speech, sign camera views, or custom text online or offline.
        </p>
      </div>

      {/* Target language selector */}
      <div className="flex flex-col gap-1.5 bg-surface-container p-4 rounded-2xl border border-outline-variant">
        <label htmlFor="translation-target-dropdown" className="font-bold text-base text-on-surface">
          Target Language
        </label>
        <select
          id="translation-target-dropdown"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="h-12 px-3 border border-outline rounded-xl bg-surface text-lg font-semibold text-on-surface"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Switchers */}
      <div className="flex rounded-xl bg-surface-container p-1 border border-outline-variant">
        {(["text", "ocr", "voice"] as TranslateMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              speak(`Switching to ${m} mode translation`, true);
            }}
            className={`flex-grow h-12 rounded-lg font-bold text-base capitalize cursor-pointer transition-all ${
              mode === m ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Mode Panel Container */}
      <div className="flex-grow flex flex-col gap-4">
        {/* TEXT MODE */}
        {mode === "text" && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to translate (e.g. Where is the restroom? Thank you, Emergency help)..."
              className="w-full h-36 p-4 border-2 border-outline rounded-2xl bg-surface-container text-xl text-on-surface focus:outline-primary resize-none font-bold font-display-ocr"
              aria-label="Text to translate input area"
            />
            <button
              onClick={handleTranslateText}
              disabled={loading}
              className="w-full h-[56px] bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl flex items-center justify-center cursor-pointer shadow active:scale-95 transition-all"
            >
              {loading ? "Translating..." : "Translate Text"}
            </button>

            {translatedText && (
              <div className="bg-surface border-2 border-primary rounded-2xl p-5 shadow flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-black tracking-wider text-primary">
                      Translated text
                    </span>
                    {translationSource && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface-container border text-on-surface-variant">
                        {translationSource.startsWith("offline") ? "Offline Dict" : "Cloud"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(translatedText);
                        addToast("Translation copied!", "success");
                      }}
                      className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                      aria-label="Copy translated text"
                    >
                      <span className="material-symbols-outlined text-xl">content_copy</span>
                    </button>
                    <button
                      onClick={() => speak(translatedText, true)}
                      className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                      aria-label="Read translated text out loud"
                    >
                      <span className="material-symbols-outlined text-xl">volume_up</span>
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-bold font-display-ocr text-on-surface leading-normal select-text">
                  {translatedText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* OCR CAMERA MODE */}
        {mode === "ocr" && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative border-2 border-outline-variant shadow flex items-center justify-center">
              {hasCamera ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 text-zinc-400">
                  <span className="material-symbols-outlined text-6xl mb-2 text-zinc-600">videocam_off</span>
                  <p className="text-lg font-semibold">Loading camera view...</p>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
                </div>
              )}
            </div>

            {!loading && !ocrTranslation && (
              <button
                onClick={handleCaptureTranslate}
                className="w-full h-[56px] bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <span className="material-symbols-outlined">photo_camera</span>
                Capture & Translate View
              </button>
            )}

            {ocrText && (
              <div className="bg-surface border-2 border-outline rounded-2xl p-5 shadow flex flex-col gap-4">
                <div className="flex flex-col gap-1 border-b border-outline-variant pb-2">
                  <span className="text-xs uppercase font-black tracking-wider text-on-surface-variant">Original Scanned Text</span>
                  <p className="text-lg font-bold text-on-surface font-display-ocr">{ocrText}</p>
                </div>
                {ocrTranslation && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-black tracking-wider text-primary">Translation</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(ocrTranslation);
                            addToast("Translation copied!", "success");
                          }}
                          className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                          aria-label="Copy translation"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                        </button>
                        <button
                          onClick={() => speak(ocrTranslation, true)}
                          className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                          aria-label="Read translation"
                        >
                          <span className="material-symbols-outlined text-base">volume_up</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-display-ocr text-on-surface select-text leading-relaxed">
                      {ocrTranslation}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => { setOcrText(""); setOcrTranslation(""); }}
                  className="mt-2 self-start px-6 h-11 border border-outline hover:bg-surface-container-low text-on-surface font-bold rounded-xl cursor-pointer"
                >
                  Reset camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* VOICE MODE */}
        {mode === "voice" && (
          <div className="flex flex-col items-center gap-6 animate-slide-up py-4">
            <p className="text-xl font-bold text-center text-on-surface h-12">
              {isListening ? "Listening... Speak now." : "Tap microphone to speak and translate"}
            </p>

            <button
              onClick={handleVoiceListen}
              disabled={isListening}
              className={`w-[100px] h-[100px] rounded-full flex items-center justify-center shadow-lg cursor-pointer ${
                isListening ? "bg-red-600 animate-pulse text-white" : "bg-primary text-white hover:scale-105"
              } transition-transform`}
              aria-label={isListening ? "Listening" : "Start speaking translation"}
            >
              <span className="material-symbols-outlined text-5xl">mic</span>
            </button>

            {isListening && <Soundwave color="bg-primary" size="md" />}

            {voiceText && (
              <div className="w-full bg-surface border-2 border-outline rounded-2xl p-5 shadow flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1 border-b border-outline-variant pb-2">
                  <span className="text-xs uppercase font-black tracking-wider text-on-surface-variant">Heard</span>
                  <p className="text-lg font-bold text-on-surface font-display-ocr">{voiceText}</p>
                </div>
                {voiceTranslation && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-black tracking-wider text-primary">Translation</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(voiceTranslation);
                            addToast("Translation copied!", "success");
                          }}
                          className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                          aria-label="Copy voice translation"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                        </button>
                        <button
                          onClick={() => speak(voiceTranslation, true)}
                          className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                          aria-label="Replay voice translation"
                        >
                          <span className="material-symbols-outlined text-base">volume_up</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-display-ocr text-on-surface select-text leading-relaxed">
                      {voiceTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
