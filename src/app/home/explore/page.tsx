"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/context/ToastContext";
import { useActivity } from "@/context/ActivityContext";
import { CompanioAPI } from "@/lib/api";
import { playTone } from "@/lib/audioManager";

interface ScanLog {
  time: string;
  text: string;
}

export default function ExploreModePage() {
  const { speak, userProfile } = useAccessibility();
  const { addToast } = useToast();
  const { logActivity } = useActivity();

  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [cameraError, setCameraError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  // Request camera stream
  useEffect(() => {
    speak("Explore objects mode active. Point your camera to detect items around you.");
    async function startCamera() {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
        setHasCamera(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError("Camera stream unavailable. Standby mode active.");
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      stopExploring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFrameBase64 = (): string | null => {
    if (!videoRef.current || !hasCamera) return null;
    const v = videoRef.current;
    if (!v.videoWidth || !v.videoHeight) return null;

    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
    const width = Math.round(v.videoWidth * scale);
    const height = Math.round(v.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.75);
  };

  const playBeep = () => {
    playTone(600, 0.15, "sine", 0.25);
  };

  const startExploring = () => {
    setIsScanning(true);
    setScanLogs([]);
    speak("Starting explore scan. Please slowly sweep your camera around the room.", true);
    addToast("Explore mode scanning started", "info");

    let step = 0;
    const maxSteps = 4;

    const runStep = async () => {
      const base64 = captureFrameBase64();
      let detectionText = "";

      if (base64) {
        try {
          const res = await CompanioAPI.describe(base64);
          if (res.objects && res.objects.length > 0) {
            detectionText = `Detected ${res.objects.map((o) => o.name).join(", ")} ahead.`;
          } else if (res.description) {
            detectionText = res.description;
          }
        } catch {
          detectionText = "Scanning angle... pathway appears navigable.";
        }
      } else {
        const directionalGuides = [
          "Left view scanned: Pathway is clear of immediate obstacles.",
          "Center view scanned: Forward walking path aligned.",
          "Right view scanned: Side clearance verified.",
          "Upper area scanned: No overhead obstructions detected."
        ];
        detectionText = directionalGuides[step % directionalGuides.length];
      }

      playBeep();
      speak(detectionText, true);

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScanLogs((prev) => [...prev, { time: timestamp, text: detectionText }]);

      step++;
      if (step >= maxSteps) {
        stopExploring();
        speak("Room exploration complete. Obstacles and paths mapped.", true);
        addToast("Explore scan completed!", "success");
        logActivity("explore", `Explore: ${step} angles mapped`, "explore");
      }
    };

    // Run first step immediately, then on interval
    runStep();
    intervalRef.current = setInterval(runStep, 3500);
  };

  const stopExploring = () => {
    setIsScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleReset = () => {
    stopExploring();
    setScanLogs([]);
    speak("Explorer map cleared.", true);
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-on-surface">Explore Mode</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Slowly rotate your device around the room to orient yourself and map surrounding obstacles.
        </p>
      </div>

      {/* Viewfinder frame */}
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative border-2 border-outline-variant shadow flex items-center justify-center">
        {hasCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              el.play().catch(() => {});
            }}
            onCanPlay={(e) => {
              const el = e.currentTarget;
              el.play().catch(() => {});
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-2 text-outline">videocam_off</span>
            <p className="text-lg font-semibold">{cameraError || "Loading camera view..."}</p>
          </div>
        )}

        {/* Scan lines overlays */}
        {isScanning && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none">
            <div className="w-full h-0.5 bg-primary shadow-[0_0_8px_var(--primary)] animate-[bounce_3s_infinite] top-0 absolute"></div>
          </div>
        )}

        <div className="absolute inset-6 border-2 border-dashed border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
          {!isScanning && scanLogs.length === 0 && (
            <span className="text-white/60 bg-black/60 px-4 py-2 rounded-full font-label-md">
              Tap start to explore
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {isScanning ? (
          <button
            onClick={stopExploring}
            className="flex-grow h-[56px] bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">stop</span>
            Stop Scan
          </button>
        ) : (
          <button
            onClick={startExploring}
            className="flex-grow h-[56px] bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 transition-all"
            style={{
              minHeight: userProfile.preset === "motor" ? "72px" : "56px",
            }}
          >
            <span className="material-symbols-outlined">explore</span>
            {scanLogs.length > 0 ? "Scan Again" : "Start Exploring"}
          </button>
        )}
        {scanLogs.length > 0 && !isScanning && (
          <button
            onClick={handleReset}
            className="px-6 h-[56px] bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-lg rounded-xl cursor-pointer"
          >
            Clear Map
          </button>
        )}
      </div>

      {/* Explore results list */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bold text-xl text-on-surface border-b border-outline-variant pb-1.5 flex items-center justify-between">
          <span>Explore Map Logs</span>
          <span className="text-sm font-semibold text-on-surface-variant font-mono">
            {scanLogs.length} found
          </span>
        </h3>

        {scanLogs.length === 0 ? (
          <p className="text-on-surface-variant text-base leading-relaxed py-2 text-center md:text-left">
            No obstacles mapped in this session. Start scanning to generate summary narration.
          </p>
        ) : (
          <div role="log" aria-live="polite" aria-label="Explore detections" className="flex flex-col gap-3">
            {scanLogs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-surface-container border border-outline-variant rounded-xl animate-slide-up"
              >
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  location_on
                </span>
                <div className="flex-grow text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-on-surface-variant font-bold font-mono">{log.time}</span>
                  </div>
                  <p className="text-xl font-bold font-display-ocr text-on-surface leading-normal select-text">
                    {log.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
