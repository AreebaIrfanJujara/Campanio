"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { CameraPermissionView } from "@/components/CameraPermissionView";
import { useToast } from "@/context/ToastContext";
import { wearableBridge } from "@/lib/wearableBridge";

interface ScannedItem {
  id: number;
  description: string;
  amount: number;
  currency: string;
  symbol: string;
  time: string;
}

export default function CurrencyScannerPage() {
  const { speak } = useAccessibility();
  const { addToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScannedItem | null>(null);
  const [history, setHistory] = useState<ScannedItem[]>([]);
  const [runningTotal, setRunningTotal] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    speak("Currency and product scanner active. Point your camera at a banknote or barcode.", true);
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

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
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
      speak(`Camera enabled. Using ${facing === "environment" ? "rear" : "front"} lens.`, true);
    } catch (e) {
      console.warn("Camera stream unavailable", e);
      setCameraActive(false);
      setIsCameraLoading(false);
    }
  };

  const toggleCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  const captureAndScan = async () => {
    if (!cameraActive || !videoRef.current) {
      speak("Your camera is currently off or blocked. Please allow camera permission to scan currency.", true);
      addToast("Camera is off. Please allow camera permission.", "warning");
      startCamera();
      return;
    }

    let imageBase64 = "";
    if (videoRef.current && canvasRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const maxDim = 640;
      const scale = Math.min(1, maxDim / Math.max(vw, vh));
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL("image/jpeg", 0.7);
      }
    }

    if (!imageBase64) {
      speak("Could not capture frame from camera. Please hold steady and try again.", true);
      addToast("Could not capture frame", "warning");
      return;
    }

    setIsScanning(true);
    wearableBridge.triggerHaptic("tap");
    speak("Analyzing currency denomination...", true);

    try {
      const res = await fetch("/api/vision/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (data.error || !data.denomination) {
        speak("No banknote denomination recognized. Please ensure the bill is visible and well-lit.", true);
        addToast("No banknote recognized. Please try again.", "warning");
        return;
      }

      const newItem: ScannedItem = {
        id: Date.now(),
        description: data.description,
        amount: data.denomination,
        currency: data.currency || "USD",
        symbol: data.symbol || "$",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setLastScanned(newItem);
      setHistory((prev) => [newItem, ...prev]);
      setRunningTotal((prev) => prev + newItem.amount);

      wearableBridge.triggerHaptic("success");
      speak(`Detected: ${newItem.description}. Total wallet balance: ${newItem.symbol}${(runningTotal + newItem.amount).toFixed(2)}`, true);
      addToast(newItem.description, "success");
    } catch (e) {
      speak("Could not scan currency. Please aim camera at the banknote.", true);
      addToast("Scan failed. Try again.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearTally = () => {
    setHistory([]);
    setRunningTotal(0);
    setLastScanned(null);
    speak("Running total cleared", true);
    addToast("Tally reset", "info");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsScanning(true);
      speak("Scanning uploaded image for currency...", true);

      try {
        const res = await fetch("/api/vision/currency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        if (data.error || !data.denomination) {
          speak("No currency recognized in uploaded image.", true);
          addToast("No currency found in image", "warning");
          return;
        }

        const newItem: ScannedItem = {
          id: Date.now(),
          description: data.description,
          amount: data.denomination,
          currency: data.currency || "USD",
          symbol: data.symbol || "$",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setLastScanned(newItem);
        setHistory((prev) => [newItem, ...prev]);
        setRunningTotal((prev) => prev + newItem.amount);
        speak(`Detected: ${newItem.description}`, true);
        addToast(newItem.description, "success");
      } catch {
        speak("Could not process uploaded image for currency.", true);
        addToast("Upload scan failed", "error");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full text-on-surface">
      {/* Header & Total Counter */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div>
          <h1 className="text-3xl font-bold font-display-ocr">Currency & Products</h1>
          <p className="text-sm text-on-surface-variant font-semibold">Banknote reader & price tally</p>
        </div>

        <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl px-4 py-2 text-right">
          <span className="text-xs uppercase font-extrabold text-primary block">Total Tally</span>
          <span className="text-2xl font-black text-primary">${runningTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Viewfinder Area or Permission Prompt */}
      {cameraActive ? (
        <div className="w-full aspect-[4/3] max-h-[360px] bg-black rounded-3xl overflow-hidden relative border-4 border-outline-variant shadow-inner flex items-center justify-center">
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
          <canvas ref={canvasRef} className="hidden" />

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

          {/* Framing Guide for Banknotes */}
          <div className="absolute inset-8 border-2 border-dashed border-[#ffd400] rounded-2xl pointer-events-none flex items-center justify-center">
            <span className="bg-black/60 backdrop-blur-sm text-[#ffd400] font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Align Banknote or Barcode
            </span>
          </div>

          {/* Scanning sweep indicator */}
          {isScanning && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
            </div>
          )}
        </div>
      ) : (
        <CameraPermissionView
          onRetry={startCamera}
          onImageSelected={async (base64) => {
            setIsScanning(true);
            speak("Scanning banknote from image...", true);
            try {
              const res = await fetch("/api/vision/currency", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: base64 }),
              });
              const data = await res.json();
              if (data.error || !data.denomination) {
                speak("No currency recognized in image.", true);
                addToast("No currency recognized", "warning");
                return;
              }
              const newItem: ScannedItem = {
                id: Date.now(),
                description: data.description,
                amount: data.denomination,
                currency: data.currency || "USD",
                symbol: data.symbol || "$",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              setLastScanned(newItem);
              setHistory((prev) => [newItem, ...prev]);
              setRunningTotal((prev) => prev + newItem.amount);
              speak(`Detected: ${newItem.description}`, true);
              addToast(newItem.description, "success");
            } catch {
              speak("Could not process image.", true);
            } finally {
              setIsScanning(false);
            }
          }}
          title="Camera Permission Required"
          subtitle="Companio needs camera access to recognize banknote denominations and prices."
        />
      )}

      {/* Central Scan Action Button */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={captureAndScan}
          disabled={isScanning}
          className="col-span-2 h-[60px] bg-primary hover:bg-primary-container text-white font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-3xl">payments</span>
          <span>{isScanning ? "Identifying..." : "Scan Banknote"}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-[60px] bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-sm rounded-2xl flex items-center justify-center gap-1 cursor-pointer transition-all"
        >
          <span className="material-symbols-outlined text-xl">upload</span>
          <span>Upload</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Last Detected Result Card */}
      {lastScanned && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl p-5 flex items-center justify-between animate-slide-up shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl">
              {lastScanned.symbol}
            </div>
            <div>
              <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                {lastScanned.description}
              </p>
              <p className="text-xs font-bold text-on-surface-variant">
                Value: {lastScanned.symbol}{lastScanned.amount.toFixed(2)} {lastScanned.currency} • {lastScanned.time}
              </p>
            </div>
          </div>
          <button
            onClick={() => speak(`Identified: ${lastScanned.description}`, true)}
            className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow cursor-pointer active:scale-95"
            aria-label="Read bill aloud"
          >
            <span className="material-symbols-outlined text-xl">volume_up</span>
          </button>
        </div>
      )}

      {/* Running History List */}
      {history.length > 0 && (
        <section className="bg-surface-container rounded-3xl p-5 border border-outline-variant flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
              Scanned Tally ({history.length})
            </h2>
            <button
              onClick={handleClearTally}
              className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
            >
              Reset Tally
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-surface rounded-xl border border-outline-variant text-sm">
                <span className="font-bold text-on-surface">{item.description}</span>
                <span className="font-mono font-extrabold text-primary">+{item.symbol}{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
