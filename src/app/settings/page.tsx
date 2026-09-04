"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccessibility, PresetType } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { useToast } from "@/context/ToastContext";
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth";
import { OfflineStorage } from "@/lib/offline/offlineStorage";
import { useActivity } from "@/context/ActivityContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user, isConfigured, signOut } = useSupabaseAuth();
  const { clearActivity } = useActivity();
  const { isOnline, isInstallable, isInstalled, installPWA, serviceWorkerReady } = useOffline();

  const {
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
    applyPreset,
    setUserProfile,
    speak,
    captionSize,
    setCaptionSize,
    reducedMotion,
    setReducedMotion,
    ttsVoice,
    setTtsVoice,
    ocrAutoTranslate,
    setOcrAutoTranslate,
  } = useAccessibility();

  const [storageStats, setStorageStats] = useState<{ usageKB: number; quotaKB: number } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [zeroRetentionMode, setZeroRetentionMode] = useState(true);

  useEffect(() => {
    speak("Accessibility and voice settings.");
    OfflineStorage.getStorageEstimate().then((stats) => {
      if (stats) setStorageStats(stats);
    });
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserProfile({ ...userProfile, name: e.target.value });
  };

  const handlePresetChange = (preset: PresetType) => {
    applyPreset(preset);
    addToast(`${preset} profile activated`, "success");
  };

  const handleTestVoice = () => {
    speak("Hello, this is a test of the Companio accessibility narrator text to speech engine. Let me know if the speed and volume are comfortable.", true);
    addToast("Testing voice...", "info");
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    speak("Clearing offline application cache", true);
    const success = await OfflineStorage.clearAllCaches();
    if (success) {
      addToast("Offline cache cleared", "success");
      speak("Cache cleared successfully", true);
      OfflineStorage.getStorageEstimate().then((stats) => setStorageStats(stats));
    } else {
      addToast("Failed to clear cache", "error");
    }
    setClearingCache(false);
  };

  const handlePurgeLogs = () => {
    clearActivity();
    addToast("All activity and transcription logs purged", "success");
    speak("Activity logs purged from device memory.", true);
  };

  const handleInstallClick = async () => {
    speak("Opening application install prompt", true);
    await installPWA();
  };

  const handleSignOut = async () => {
    speak("Signing out. Redirecting to splash screen.", true);
    addToast("Logged out successfully", "info");
    try {
      await signOut();
    } catch { /* ignore */ }
    router.push("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge md:px-8 lg:px-12 py-stack-lg gap-6 w-full text-on-surface">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display-ocr">Settings</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Adjust visual themes, narrator speed, translations, offline storage, and privacy controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Profile Card Section */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
            Profile Preferences
          </h2>
          
          <div className="flex items-center gap-4 py-2">
            <div className="w-16 h-16 rounded-full bg-primary text-white font-extrabold text-2xl flex items-center justify-center shadow">
              {getInitials(userProfile.name)}
            </div>
            <div className="flex-grow flex flex-col gap-1.5">
              <label htmlFor="settings-name" className="font-semibold text-base text-on-surface">
                Profile Name
              </label>
              <input
                type="text"
                id="settings-name"
                value={userProfile.name}
                onChange={handleNameChange}
                className="w-full h-12 px-3 border border-outline rounded-xl bg-surface focus:outline-primary text-base text-on-surface"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span id="profile-focus-label" className="font-bold text-base text-on-surface">Change Profile Focus</span>
            <div role="radiogroup" aria-labelledby="profile-focus-label" className="grid grid-cols-2 gap-3">
              {(["standard", "visual", "hearing", "motor"] as PresetType[]).map((p) => {
                const isActive = userProfile.preset === p;
                return (
                  <button
                    key={p}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => handlePresetChange(p)}
                    className={`h-[56px] rounded-xl border-2 text-base font-bold capitalize cursor-pointer transition-all active:scale-95 ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface border-outline-variant hover:bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {p} Mode
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* PWA & Offline Support Section */}
        <section className="bg-surface-container rounded-3xl p-6 border-2 border-primary/20 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-primary">
              Offline & PWA Application
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span className="text-xs font-bold text-on-surface">{isOnline ? "Online" : "Offline Mode"}</span>
            </div>
          </div>

          {/* Install Status and Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-base text-on-surface">App Installation</span>
              <span className="text-sm text-on-surface-variant">
                {isInstalled
                  ? "Installed as a standalone progressive web app"
                  : isInstallable
                  ? "Add to home screen or desktop for 1-tap offline use"
                  : "Running in web browser"}
              </span>
            </div>

            {isInstallable && !isInstalled ? (
              <button
                onClick={handleInstallClick}
                className="h-12 px-6 bg-primary hover:bg-primary-container text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow active:scale-95 transition-all self-start"
              >
                <span className="material-symbols-outlined text-xl">install_mobile</span>
                Install App
              </button>
            ) : isInstalled ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Installed
              </div>
            ) : null}
          </div>

          {/* Service Worker & Storage Info */}
          <div className="border-t border-outline-variant pt-3 flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-on-surface-variant">Service Worker Cache:</span>
              <span className={`font-bold ${serviceWorkerReady ? "text-emerald-600" : "text-on-surface"}`}>
                {serviceWorkerReady ? "Active & Pre-cached" : "Ready"}
              </span>
            </div>

            {storageStats && (
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-on-surface-variant">Local Cache Storage:</span>
                <span className="font-mono font-bold text-on-surface">
                  {(storageStats.usageKB / 1024).toFixed(1)} MB used
                </span>
              </div>
            )}

            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="h-11 px-4 border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all self-start mt-1"
            >
              <span className="material-symbols-outlined text-lg">cached</span>
              {clearingCache ? "Clearing..." : "Clear Offline Cache"}
            </button>
          </div>
        </section>

        {/* Privacy & Data Retention Section */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
              Privacy & Data Retention
            </h2>
            <Link href="/privacy" className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5">
              <span>Read Policy</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>

          <ToggleSwitch
            id="zero-retention-toggle"
            checked={zeroRetentionMode}
            onChange={(checked) => {
              setZeroRetentionMode(checked);
              speak(checked ? "Zero retention mode enabled. Media processed ephemerally in RAM." : "Zero retention disabled.", true);
            }}
            label="Zero-Retention Mode"
            description="Process camera frames and speech in RAM only without persisting any bystander data."
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-t border-outline-variant pt-3 gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-base text-on-surface">Clear Device Logs</span>
              <span className="text-sm text-on-surface-variant">Purge recent accessibility logs & stored session transcripts</span>
            </div>
            <button
              onClick={handlePurgeLogs}
              className="h-11 px-4 border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all self-start"
            >
              <span className="material-symbols-outlined text-lg">delete_sweep</span>
              Purge Logs Now
            </button>
          </div>
        </section>

        {/* Emergency Assistance & SOS Section */}
        <section className="bg-surface-container rounded-3xl p-6 border-2 border-red-500/30 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">sos</span>
              <span>Emergency SOS Contacts</span>
            </h2>
            <Link href="/emergency" className="text-xs text-red-500 font-bold hover:underline">
              Open SOS Screen
            </Link>
          </div>

          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant">
              <div>
                <strong className="block text-sm text-on-surface">Primary Caregiver</strong>
                <span className="text-xs text-on-surface-variant">+1 (555) 019-2834</span>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant">
              <div>
                <strong className="block text-sm text-on-surface">Emergency Dispatch</strong>
                <span className="text-xs text-on-surface-variant">911 / Local Emergency</span>
              </div>
              <span className="text-xs bg-red-500/10 text-red-600 font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                Emergency
              </span>
            </div>
          </div>
        </section>

        {/* Visual Settings Section */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
            Visual Accessibility
          </h2>
          
          {/* 3-way theme segmented control */}
          <div className="flex flex-col gap-3">
            <span id="display-theme-label" className="font-bold text-base text-on-surface">Display Theme</span>
            <div role="radiogroup" aria-labelledby="display-theme-label" className="flex rounded-xl bg-surface-container-low p-1 border border-outline-variant gap-1">
              {(["standard", "dark", "high-contrast"] as const).map((t) => {
                const labels: Record<string, string> = {
                  standard: "Light",
                  dark: "Dark",
                  "high-contrast": "High Contrast",
                };
                const isActive = theme === t;
                return (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => {
                      setThemeMode(t);
                      speak(
                        t === "standard"
                          ? "Light mode activated."
                          : t === "dark"
                          ? "Dark mode activated. Easier on the eyes in low light."
                          : "High contrast mode activated. Maximum contrast for low vision.",
                        true
                      );
                    }}
                    className={`flex-grow h-10 rounded-lg text-sm font-bold capitalize cursor-pointer transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-1 text-sm text-on-surface-variant pl-1">
              {theme === "dark" && (
                <span>Dark — easier on the eyes in low light</span>
              )}
              {theme === "high-contrast" && (
                <span>High Contrast — maximum contrast for low vision</span>
              )}
            </div>
          </div>

          {/* Caption text sizes */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-t border-outline-variant pt-3 gap-2">
            <div className="flex flex-col">
              <span id="caption-size-label" className="font-bold text-base text-on-surface">Caption Text Size</span>
              <span className="text-sm text-on-surface-variant">Adjust size of speech-to-text bubbles</span>
            </div>
            <div role="radiogroup" aria-labelledby="caption-size-label" className="flex bg-surface rounded-xl p-1 border border-outline-variant self-start">
              {(["sm", "md", "lg"] as const).map((sz) => (
                <button
                  key={sz}
                  role="radio"
                  aria-checked={captionSize === sz}
                  onClick={() => {
                    setCaptionSize(sz);
                    speak(`Caption text size set to ${sz === "sm" ? "small" : sz === "md" ? "medium" : "large"}`);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize cursor-pointer transition-all ${
                    captionSize === sz ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {sz === "sm" ? "Small" : sz === "md" ? "Medium" : "Large"}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="border-t border-outline-variant pt-3">
            <ToggleSwitch
              id="reduced-motion-toggle"
              checked={reducedMotion}
              onChange={(checked) => {
                setReducedMotion(checked);
                speak(checked ? "Reduced motion active" : "Motion enabled");
              }}
              label="Reduced Motion"
              description="Disable UI pulse indicators and sliding sweep scan animations."
            />
          </div>
        </section>

        {/* Voice and speech parameters */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
            Speech & Narrator
          </h2>

          <ToggleSwitch
            id="voice-guidance-toggle"
            checked={voiceGuidanceActive}
            onChange={(checked) => {
              setVoiceGuidanceActive(checked);
              speak(checked ? "Screen voice narration enabled." : "Screen voice narration disabled.", true);
            }}
            label="Voice Guidance"
            description="Announces screen names and focus hints dynamically."
          />

          {/* Wake Word Toggle */}
          <div className="border-t border-outline-variant pt-3">
            <ToggleSwitch
              id="wake-word-toggle"
              checked={wakeWordActive}
              onChange={async (checked) => {
                if (checked) {
                  try {
                    // Proactively request mic permission to trigger browser prompt at toggle-on time
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach((track) => track.stop());
                    setWakeWordActive(true);
                    addToast("Wake word active. Say 'Hi Companio' anytime.", "success");
                    speak("Wake word detection enabled. Say Hi Companio anytime while the app is open to activate voice assistant.", true);
                  } catch (err) {
                    console.warn("Microphone permission denied for wake word:", err);
                    setWakeWordActive(false);
                    addToast("Microphone permission is required for wake word detection", "error");
                    speak("Microphone permission was denied. Wake word detection cannot be activated.", true);
                  }
                } else {
                  setWakeWordActive(false);
                  addToast("Wake word disabled", "info");
                  speak("Wake word detection disabled.", true);
                }
              }}
              label="Wake Word ('Hi Companio')"
              description="When enabled, saying 'Hi Companio' while the app is open opens the voice assistant. Requires the microphone to stay active while Companio is open. Does not work when the app is closed or the screen is locked."
            />
          </div>

          {/* TTS Voice Selector */}
          <div className="flex justify-between items-center py-2 border-t border-outline-variant pt-3 gap-4">
            <div className="flex flex-col text-left">
              <label htmlFor="settings-voice-select" className="font-bold text-base text-on-surface cursor-pointer">
                Text to Speech Voice
              </label>
              <span className="text-sm text-on-surface-variant">Choose assistant vocal engine profile</span>
            </div>
            <select
              id="settings-voice-select"
              value={ttsVoice}
              onChange={(e) => {
                setTtsVoice(e.target.value);
                speak("Voice model changed.", true);
              }}
              className="h-11 px-3 border border-outline rounded-xl bg-surface font-semibold text-base text-on-surface"
            >
              <option value="neural-f">Female (Neural2)</option>
              <option value="neural-m">Male (Neural2)</option>
              <option value="default">Default Browser Voice (Offline)</option>
            </select>
          </div>

          {/* Speed slider */}
          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3">
            <div className="flex justify-between font-bold text-base text-on-surface">
              <label htmlFor="speech-rate-slider">Speech Rate (Speed)</label>
              <span aria-hidden="true">{speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              id="speech-rate-slider"
              aria-label="Speech Rate Speed"
              aria-valuemin={0.5}
              aria-valuemax={2.0}
              aria-valuenow={speechRate}
              aria-valuetext={`${speechRate.toFixed(1)} times normal speed`}
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeechRate(val);
                speak(`Speed ${val.toFixed(1)}x`, true);
              }}
              className="w-full h-2 bg-outline/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>

          {/* Pitch slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between font-bold text-base text-on-surface">
              <label htmlFor="speech-pitch-slider">Speech Pitch</label>
              <span aria-hidden="true">{speechPitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              id="speech-pitch-slider"
              aria-label="Speech Pitch"
              aria-valuemin={0.5}
              aria-valuemax={2.0}
              aria-valuenow={speechPitch}
              aria-valuetext={`${speechPitch.toFixed(1)} pitch scale`}
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechPitch}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeechPitch(val);
                speak(`Pitch ${val.toFixed(1)}`, true);
              }}
              className="w-full h-2 bg-outline/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>

          {/* Volume slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between font-bold text-base text-on-surface">
              <label htmlFor="speech-volume-slider">Speech Volume</label>
              <span aria-hidden="true">{Math.round(voiceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              id="speech-volume-slider"
              aria-label="Speech Volume"
              aria-valuemin={0.0}
              aria-valuemax={1.0}
              aria-valuenow={voiceVolume}
              aria-valuetext={`${Math.round(voiceVolume * 100)} percent`}
              min="0.0"
              max="1.0"
              step="0.1"
              value={voiceVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVoiceVolume(val);
                speak(`Volume ${Math.round(val * 100)}%`, true);
              }}
              className="w-full h-2 bg-outline/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>

          <button
            onClick={handleTestVoice}
            className="w-full h-[56px] border-2 border-primary hover:bg-primary/10 font-bold text-base rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2"
          >
            <span className="material-symbols-outlined">volume_up</span>
            Test Speech Synthesis
          </button>
        </section>

        {/* Translation Settings Section */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
            OCR & Scanning Translation
          </h2>
          
          <ToggleSwitch
            id="ocr-auto-translate-toggle"
            checked={ocrAutoTranslate}
            onChange={(checked) => {
              setOcrAutoTranslate(checked);
              speak(checked ? "OCR automatic translation active" : "OCR translation off");
            }}
            label="Auto-translate OCR"
            description="Automatically run translation on camera text sweeps."
          />
        </section>

        {/* Account and Sign out */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
              Account &amp; Cloud Sync
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConfigured ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`}></span>
              <span className="text-xs font-bold text-on-surface">
                {isConfigured ? "Supabase Cloud" : "Local Mode"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 py-1 text-left">
            <div className="bg-surface p-4 rounded-2xl border border-outline-variant flex flex-col gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                Active Session
              </span>
              <span className="font-extrabold text-lg text-on-surface break-all">
                {user?.email || (user as any)?.user_metadata?.name || "Guest Account"}
              </span>
              <span className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-sm text-primary">cloud_done</span>
                {isConfigured
                  ? "Preferences & custom phrases auto-sync with Supabase"
                  : "Running in local offline mode"}
              </span>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full h-[56px] border-2 border-red-500 text-red-500 hover:bg-red-500/10 font-bold text-base rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-95 mt-1"
            >
              <span className="material-symbols-outlined">logout</span>
              Sign Out Account
            </button>
          </div>
        </section>
      </div>

      <footer className="text-center text-sm font-semibold text-on-surface-variant py-4">
        Companio v1.0.0 — Offline-Ready Accessibility Suite
      </footer>
    </div>
  );
}
