"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { CompanioAPI } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useActivity } from "@/context/ActivityContext";
import { wearableBridge } from "@/lib/wearableBridge";

interface DetectedObject {
  label: string;
  x: string; // percentage left
  y: string; // percentage top
  w: string; // width
  h: string; // height
  confidence?: number;
}

export default function SceneDescriptionPage() {
  const { speak, userProfile } = useAccessibility();
  const { addToast } = useToast();
  const { logActivity } = useActivity();
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [isDescribing, setIsDescribing] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [hazards, setHazards] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string>("");
  const [sceneSource, setSceneSource] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const mockScenes = [
    {
      description: "A tidy indoor living room. There is a gray couch straight ahead, a wooden coffee table in front of it, and a doorway on the right. Path is clear.",
      objects: [
        { label: "Couch", x: "25%", y: "30%", w: "50%", h: "40%" },
        { label: "Coffee Table", x: "40%", y: "70%", w: "30%", h: "20%" },
        { label: "Doorway", x: "80%", y: "15%", w: "15%", h: "70%" },
      ],
      hazards: [] as string[],
    },
    {
      description: "An office corridor. There is a water dispenser on the right, a desktop setup on the left, and a safety exit sign visible ahead.",
      objects: [
        { label: "Water Dispenser", x: "70%", y: "40%", w: "20%", h: "50%" },
        { label: "Desktop PC", x: "10%", y: "50%", w: "30%", h: "40%" },
        { label: "Exit Sign", x: "45%", y: "10%", w: "10%", h: "10%" },
      ],
      hazards: [] as string[],
    },
  ];

  // Request camera stream on mount
  useEffect(() => {
    async function startCamera() {
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
        console.error("Camera access error:", err);
        setCameraError(
          "Could not open camera stream. Standard mock scene narration mode active."
        );
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture frame from video as base64
  const captureFrameBase64 = (): string | null => {
    if (!videoRef.current || !hasCamera) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Play hazard alert beep
  const playHazardBeep = () => {
    if (typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch { /* ignore */ }
    }
    // Also trigger haptic on wearable device
    wearableBridge.triggerHaptic("hazard");
  };

  const handleDescribe = async () => {
    setIsDescribing(true);
    setDetectedObjects([]);
    setDescription("");
    setHazards([]);
    speak("Analyzing environment. Narration starting shortly.", true);

    try {
      const base64 = captureFrameBase64();
      if (base64) {
        const result = await CompanioAPI.describe(base64);
        setDescription(result.description);
        setSceneSource(result.source);

        // Map API objects to display format
        if (result.objects && result.objects.length > 0) {
          const mapped: DetectedObject[] = result.objects.map((obj, i) => ({
            label: obj.name,
            x: `${10 + (i * 25) % 70}%`,
            y: `${15 + (i * 20) % 60}%`,
            w: `${Math.min(30, 15 + i * 3)}%`,
            h: `${Math.min(40, 20 + i * 5)}%`,
            confidence: obj.confidence,
          }));
          setDetectedObjects(mapped);
        }

        // Hazard detection
        if (result.hazards && result.hazards.length > 0) {
          setHazards(result.hazards);
          playHazardBeep();
          speak(`Caution! ${result.hazards.join(". ")}`, true);
          addToast("Hazard detected!", "warning");
          logActivity("scene", "Scene: Hazard detected", "warning", result.source);
        } else {
          speak(result.description, true);
          addToast(`Scene analyzed (${result.source === "mock" ? "demo mode" : "Vision API"})`, "success");
          logActivity("scene", `Scene: ${result.description.slice(0, 50)}`, "center_focus_strong", result.source);
        }
      } else {
        throw new Error("No camera frame");
      }
    } catch (err) {
      // Fallback to mock
      const scene = mockScenes[Math.floor(Math.random() * mockScenes.length)];
      setDescription(scene.description);
      setDetectedObjects(scene.objects);
      setHazards(scene.hazards);
      setSceneSource("mock-fallback");
      speak(scene.description, true);
      addToast("Scene analyzed (demo fallback)", "success");
    } finally {
      setIsDescribing(false);
    }
  };

  const handleReset = () => {
    setDescription("");
    setDetectedObjects([]);
    setHazards([]);
    speak("Viewfinder reset. Tap narration to capture a new scene.", true);
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-2xl mx-auto w-full">
      {/* Header info */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-on-surface">Narrate Environment</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Capture your surroundings to get a real-time vocal description of obstacles and paths.
        </p>
      </div>

      {/* Viewfinder frame */}
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative border-2 border-outline-variant shadow-lg flex items-center justify-center">
        {hasCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 text-zinc-400">
            <span className="material-symbols-outlined text-6xl mb-2 text-zinc-600">
              videocam_off
            </span>
            <p className="text-lg font-semibold">{cameraError || "Loading camera stream..."}</p>
          </div>
        )}

        {/* Bounding box overlays */}
        {detectedObjects.map((obj, i) => (
          <div
            key={i}
            className="absolute border-2 border-primary bg-primary/10 rounded flex flex-col p-1 animate-fade-in"
            style={{
              left: obj.x,
              top: obj.y,
              width: obj.w,
              height: obj.h,
            }}
          >
            <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded self-start">
              {obj.label}
            </span>
          </div>
        ))}

        {isDescribing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
          </div>
        )}
      </div>

      {/* Narrative Card */}
      <div className="flex flex-col gap-4">
        {/* Hazard Alert */}
        {hazards.length > 0 && (
          <div className="bg-red-600 text-white rounded-2xl p-5 flex items-start gap-3 border-2 border-white shadow-lg animate-slide-up">
            <span className="material-symbols-outlined text-3xl mt-0.5">warning</span>
            <div className="flex-grow">
              <h3 className="text-xl font-black uppercase tracking-wider">Hazard Detected</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {hazards.map((h, i) => (
                  <li key={i} className="text-base font-bold">{h}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {description && (
          <div className="bg-surface border-2 border-primary rounded-2xl p-6 shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-label-lg text-primary uppercase font-black text-sm tracking-wider">
                  Scene Narration
                </span>
                {sceneSource && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sceneSource === "google-cloud-vision" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {sceneSource === "google-cloud-vision" ? "Vision API" : "Demo"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(description);
                    addToast("Description copied", "success");
                  }}
                  className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                  aria-label="Copy description"
                >
                  <span className="material-symbols-outlined text-xl">content_copy</span>
                </button>
                <button
                  onClick={() => speak(description, true)}
                  className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                  aria-label="Re-speak narration"
                >
                  <span className="material-symbols-outlined text-xl">volume_up</span>
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold font-display-ocr text-on-surface leading-normal select-text">
              {description}
            </p>

            {/* Detected objects list */}
            {detectedObjects.length > 0 && (
              <div className="mt-2 pt-3 border-t border-outline-variant">
                <span className="text-xs uppercase font-black tracking-wider text-on-surface-variant">Detected Objects</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {detectedObjects.map((obj, i) => (
                    <span key={i} className="bg-primary/10 text-primary font-bold text-sm px-3 py-1 rounded-full border border-primary/20">
                      {obj.label}
                      {obj.confidence && (
                        <span className="ml-1 opacity-60">({Math.round(obj.confidence * 100)}%)</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="mt-2 self-start px-6 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl border-2 border-outline cursor-pointer"
            >
              Reset view
            </button>
          </div>
        )}

        {!isDescribing && !description && (
          <button
            onClick={handleDescribe}
            className="w-full h-[64px] bg-primary text-white hover:bg-primary-container active:scale-[0.98] font-bold text-xl rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              minHeight: userProfile.preset === "motor" ? "76px" : "64px",
            }}
          >
            <span className="material-symbols-outlined text-2xl">center_focus_strong</span>
            Describe Room
          </button>
        )}
      </div>
    </div>
  );
}
