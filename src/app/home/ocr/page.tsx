"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { CompanioAPI } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useActivity } from "@/context/ActivityContext";
import { getSourceLabel, REAL_SOURCES } from "@/lib/sourceLabel";
import { CameraPermissionView } from "@/components/CameraPermissionView";

export default function OCRPage() {
  const { speak, userProfile } = useAccessibility();
  const { addToast } = useToast();
  const { logActivity } = useActivity();
  
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedText, setScannedText] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [ocrSource, setOcrSource] = useState<string>(""); // "google-cloud-vision" or "mock"

  // Translation States
  const [targetLang, setTargetLang] = useState<string>("es");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const startCamera = async () => {
    setCameraError("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      speak("Camera enabled. Point your lens at text to scan.", true);
    } catch (err) {
      console.warn("Camera access notice:", err);
      setCameraError("Camera permission denied or unavailable.");
      setHasCamera(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture frame from video as optimized base64
  const captureFrameBase64 = (): string | null => {
    if (!videoRef.current || !hasCamera) return null;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const handleScan = async () => {
    setIsScanning(true);
    setTranslatedText("");
    setScannedText("");
    speak("Scanning image. Analyzing text structure...", true);

    try {
      const base64 = captureFrameBase64();
      if (base64) {
        // Try real API first
        const result = await CompanioAPI.ocr(base64);
        setScannedText(result.text);
        setOcrSource(result.source);
        speak(`Detected text: ${result.text}`, true);
        addToast(getSourceLabel(result.source, "ocr").toast, "success");
        logActivity("ocr", `OCR: ${result.text.slice(0, 50)}`, "photo_camera", result.source);
      } else {
        throw new Error("No camera frame available");
      }
    } catch (err) {
      addToast("Could not detect text from camera. Try holding still or uploading an image.", "error");
      speak("No text detected. Please aim camera at clear text or upload an image.", true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      addToast("Please select an image file", "warning");
      return;
    }

    setIsScanning(true);
    setTranslatedText("");
    setScannedText("");
    speak("Processing uploaded image for text...", true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const result = await CompanioAPI.ocr(base64);
          setScannedText(result.text);
          setOcrSource(result.source);
          speak(`Detected text: ${result.text}`, true);
          addToast(getSourceLabel(result.source, "ocr").toast, "success");
          logActivity("ocr", `OCR (upload): ${result.text.slice(0, 50)}`, "upload_file", result.source);
        } catch (err) {
          addToast("OCR failed on uploaded image", "error");
          setScannedText("Uploaded image text could not be detected. Try a clearer photo.");
          setOcrSource("error");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsScanning(false);
      addToast("Failed to read uploaded image", "error");
    }
  };

  const handleTranslate = async () => {
    if (!scannedText) return;
    setIsTranslating(true);
    speak("Translating text...", true);
    
    try {
      const result = await CompanioAPI.translate(scannedText, targetLang);
      setTranslatedText(result.translatedText);
      speak(result.translatedText, true, targetLang);
      addToast("Translation complete", "success");
    } catch (e) {
      console.error(e);
      addToast("Translation failed", "error");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReset = () => {
    setScannedText("");
    setTranslatedText("");
    speak("Camera ready to scan again.", true);
  };

  const handleImageUpload = async (base64: string) => {
    setIsScanning(true);
    setTranslatedText("");
    setScannedText("");
    speak("Scanning uploaded image for text...", true);

    try {
      const result = await CompanioAPI.ocr(base64);
      setScannedText(result.text);
      setOcrSource(result.source);
      speak(`Detected text: ${result.text}`, true);
      addToast("Text scanned successfully", "success");
      logActivity("ocr", `Scanned text (${result.text.slice(0, 20)}...)`, "photo_camera", result.source);
    } catch (err: any) {
      console.error(err);
      addToast("Could not detect text from image", "error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full">
      {/* Title block */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-on-surface">Read Text (OCR)</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Point your camera at a sign, label, or page to read its text aloud.
        </p>
      </div>

      {/* Camera Viewfinder frame or Permission View */}
      {hasCamera ? (
        <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden relative border-2 border-outline-variant shadow-lg flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* OCR green scanner bar line animation */}
          {isScanning && (
            <div className="absolute inset-x-0 h-1 bg-green-500 shadow-[0_0_12px_#22c55e] animate-[bounce_2s_infinite] top-0 pointer-events-none"></div>
          )}

          {/* Viewfinder brackets overlay */}
          <div className="absolute inset-6 border-2 border-dashed border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
            {!isScanning && !scannedText && (
              <span className="text-white/60 bg-black/60 px-4 py-2 rounded-full font-label-md">
                Align text here
              </span>
            )}
          </div>
        </div>
      ) : (
        <CameraPermissionView
          onRetry={startCamera}
          onImageSelected={handleImageUpload}
          title="Camera Permission Required"
          subtitle="Companio needs camera access to scan documents, books, signs, and labels live."
        />
      )}

      {/* Dynamic Results cards */}
      <div className="flex flex-col gap-4">
        {isScanning && (
          <div className="bg-surface-container rounded-2xl p-6 border-2 border-dashed border-primary flex flex-col items-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <p className="text-lg font-bold text-on-surface">Analyzing image...</p>
          </div>
        )}

        {scannedText && (
          <div className="bg-surface border-2 border-primary rounded-2xl p-6 shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <span className="font-label-lg text-primary uppercase font-black text-sm tracking-wider">
                Scanned Text
              </span>
              <div className="flex items-center gap-2">
                {ocrSource && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${REAL_SOURCES.includes(ocrSource) ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {getSourceLabel(ocrSource, "ocr").badge}
                  </span>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scannedText);
                    addToast("Text copied to clipboard", "success");
                  }}
                  className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                  aria-label="Copy scanned text"
                >
                  <span className="material-symbols-outlined text-xl">content_copy</span>
                </button>
                <button
                  onClick={() => speak(scannedText, true)}
                  className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                  aria-label="Read text aloud"
                >
                  <span className="material-symbols-outlined text-xl">volume_up</span>
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold font-display-ocr text-on-surface leading-normal select-text">
              {scannedText}
            </p>

            {/* Translation interface inside result card */}
            <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-xl">translate</span>
                  Translate Scanned Text
                </span>
                <span className="text-xs text-on-surface-variant font-semibold">Gemini + Groq AI</span>
              </div>

              {/* Quick Language Quick-Select Pills */}
              <div className="flex flex-wrap gap-2">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setTargetLang(l.code);
                      if (scannedText) {
                        (async () => {
                          setIsTranslating(true);
                          try {
                            const result = await CompanioAPI.translate(scannedText, l.code);
                            setTranslatedText(result.translatedText);
                            speak(result.translatedText, true, l.code);
                            addToast(`Translated to ${l.name}`, "success");
                          } catch {
                            addToast("Translation failed", "error");
                          } finally {
                            setIsTranslating(false);
                          }
                        })();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      targetLang === l.code
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant"
                    }`}
                  >
                    {l.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-1">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="flex-grow h-12 px-3 rounded-xl bg-surface-container border-2 border-outline font-semibold text-base text-on-surface"
                  aria-label="Select target language"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="h-12 px-6 bg-primary hover:bg-primary-container text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {isTranslating ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Translating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">g_translate</span>
                      <span>Translate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Translation output card */}
              {translatedText && (
                <div className="mt-3 bg-surface-container-high border-2 border-primary/30 rounded-2xl p-5 flex flex-col gap-3 animate-slide-up shadow-sm">
                  <div className="flex justify-between items-center border-b border-outline-variant/60 pb-2">
                    <span className="text-xs uppercase font-black tracking-wider text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Translation ({languages.find((l) => l.code === targetLang)?.name || targetLang})
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(translatedText);
                          addToast("Translation copied", "success");
                        }}
                        className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                        aria-label="Copy translation"
                      >
                        <span className="material-symbols-outlined text-base">content_copy</span>
                      </button>
                      <button
                        onClick={() => speak(translatedText, true, targetLang)}
                        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container cursor-pointer shadow-sm"
                        aria-label="Read translation aloud"
                      >
                        <span className="material-symbols-outlined text-lg">volume_up</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-on-surface leading-relaxed select-text font-display-ocr">
                    {translatedText}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="mt-2 self-start px-6 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl border-2 border-outline cursor-pointer active:scale-95 transition-transform"
            >
              Scan New Text
            </button>
          </div>
        )}

        {!isScanning && !scannedText && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleScan}
              className="w-full h-[64px] bg-primary text-white hover:bg-primary-container active:scale-[0.98] font-bold text-xl rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              style={{
                minHeight: userProfile.preset === "motor" ? "76px" : "64px",
              }}
            >
              <span className="material-symbols-outlined text-2xl">photo_camera</span>
              Capture & Read
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-grow h-[48px] bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xl">upload_file</span>
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
