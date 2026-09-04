"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/context/ToastContext";
import { useActivity } from "@/context/ActivityContext";
import { CompanioAPI } from "@/lib/api";
import { playTone } from "@/lib/audioManager";

import { CameraPermissionView } from "@/components/CameraPermissionView";

interface ScanLog {
  time: string;
  text: string;
}

export default function ExploreModePage() {
  const { speak, userProfile } = useAccessibility();
  const { addToast } = useToast();
  const { logActivity } = useActivity();

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [cameraError, setCameraError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  const startCamera = async (targetFacing?: "environment" | "user") => {
    const facing = targetFacing || facingMode;
    setIsCameraLoading(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facing }, width: { ideal: 1280 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1280 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }
      streamRef.current = stream;
      setHasCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
      setCameraError("");
      speak(`Camera enabled. Using ${facing === "environment" ? "rear" : "front"} lens.`, true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission denied or unavailable.");
      setHasCamera(false);
      setIsCameraLoading(false);
    }
  };

  const toggleCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Request camera stream
  useEffect(() => {
    speak("Explore objects mode active. Point your camera to detect items around you.");
    startCamera();

    return () => {
      stopExploring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (hasCamera && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [hasCamera]);

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
    if (!hasCamera || !videoRef.current) {
      speak("Your camera is currently off or blocked. Please allow camera permission to scan your room live.", true);
      addToast("Camera is off. Please allow camera permission to scan.", "warning");
      startCamera();
      return;
    }

    setIsScanning(true);
    setScanLogs([]);
    speak("Starting explore scan. Please slowly sweep your camera around the room.", true);
    addToast("Explore mode scanning started", "info");

    let step = 0;
    const maxSteps = 4;

    const runStep = async () => {
      const base64 = captureFrameBase64();
      if (!base64) {
        stopExploring();
        speak("Camera is not active. Please enable your camera to scan live.", true);
        addToast("Camera not active. Please allow permission.", "warning");
        return;
      }

      try {
        const res = await CompanioAPI.describe(base64);
        let detectionText = "";
        if (res.objects && res.objects.length > 0) {
          detectionText = `Detected ${res.objects.map((o) => o.name).join(", ")} ahead.`;
        } else if (res.description) {
          detectionText = res.description;
        } else {
          detectionText = "Area scanned: No immediate obstacles detected in view.";
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
      } catch (err) {
        console.error("Explore step error:", err);
        stopExploring();
        speak("Could not analyze camera view. Please hold steady and try again.", true);
        addToast("Camera analysis error", "error");
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

  const handleImageAnalyze = async (base64: string) => {
    setIsScanning(true);
    setScanLogs([]);
    speak("Analyzing image of room for objects and pathways...", true);
    addToast("Analyzing uploaded room photo...", "info");
    try {
      const res = await CompanioAPI.describe(base64);
      let detectionText = "";
      if (res.objects && res.objects.length > 0) {
        detectionText = `Detected ${res.objects.map((o) => o.name).join(", ")} in room view.`;
      } else if (res.description) {
        detectionText = res.description;
      } else {
        detectionText = "Image analyzed: No immediate obstacles detected.";
      }
      playBeep();
      speak(detectionText, true);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScanLogs([{ time: timestamp, text: detectionText }]);
      addToast("Room photo analysis complete", "success");
    } catch (err) {
      console.error(err);
      speak("Could not analyze uploaded photo.", true);
      addToast("Failed to analyze photo", "error");
    } finally {
      setIsScanning(false);
    }
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

      {/* Viewfinder frame or Camera Permission View */}
      {hasCamera ? (
        <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative border-2 border-outline-variant shadow flex items-center justify-center">
          <video
            ref={(el) => {
              (videoRef as any).current = el;
              if (el && streamRef.current && el.srcObject !== streamRef.current) {
                el.srcObject = streamRef.current;
                el.setAttribute("playsinline", "true");
                el.setAttribute("webkit-playsinline", "true");
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              setIsCameraLoading(false);
              const el = e.currentTarget;
              el.play().catch(() => {});
            }}
            onCanPlay={(e) => {
              setIsCameraLoading(false);
              const el = e.currentTarget;
              el.play().catch(() => {});
            }}
            onPlaying={() => setIsCameraLoading(false)}
            className="w-full h-full object-cover"
          />

          {isCameraLoading && (
            <div className="absolute inset-0 bg-surface-container/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-on-surface">Starting camera...</p>
            </div>
          )}

          {/* Switch Camera Button */}
          <button
            type="button"
            onClick={toggleCamera}
            aria-label={`Switch camera. Currently using ${facingMode === "environment" ? "back" : "front"} camera.`}
            title="Switch Camera (Front / Back)"
            className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/25 shadow-lg flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">flip_camera_ios</span>
          </button>

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
      ) : (
        <CameraPermissionView
          onRetry={startCamera}
          onImageSelected={handleImageAnalyze}
          title="Camera Permission Required"
          subtitle="Companio needs camera access to see your surroundings, explore the room, and detect obstacles live."
        />
      )}

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
