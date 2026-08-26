"use client";

import React from "react";
import { useAccessibility, PresetType } from "@/context/AccessibilityContext";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { useToast } from "@/context/ToastContext";
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { signOut } = useSupabaseAuth();
  const {
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
    applyPreset,
    setUserProfile,
    speak,
  } = useAccessibility();

  // Use context-persisted values instead of local state
  const {
    captionSize,
    setCaptionSize,
    reducedMotion,
    setReducedMotion,
    ttsVoice,
    setTtsVoice,
    ocrAutoTranslate,
    setOcrAutoTranslate,
  } = useAccessibility();

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

  const handleSignOut = async () => {
    speak("Signing out. Redirecting to splash screen.", true);
    addToast("Logged out successfully", "info");
    try {
      await signOut();
    } catch (e) { /* ignore */ }
    router.push("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-2xl mx-auto w-full text-on-surface">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display-ocr">Settings</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Adjust visual themes, narrator speed, translations, and profile presets.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        
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
            <span className="font-bold text-base text-on-surface">Change Profile Focus</span>
            <div className="grid grid-cols-2 gap-3">
              {(["standard", "visual", "hearing", "motor"] as PresetType[]).map((p) => {
                const isActive = userProfile.preset === p;
                return (
                  <button
                    key={p}
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

        {/* Visual Settings Section */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
            Visual Accessibility
          </h2>
          
          {/* Custom Toggle switch using ToggleSwitch */}
          <ToggleSwitch
            id="high-contrast-toggle"
            checked={theme === "high-contrast"}
            onChange={(checked) => {
              speak(checked ? "High contrast mode enabled." : "Standard contrast mode enabled.", true);
              toggleTheme();
            }}
            label="High Contrast Mode"
            description="Pure pitch-black background with white text and yellow rings."
          />

          {/* Caption text sizes */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-t border-outline-variant pt-3 gap-2">
            <div className="flex flex-col">
              <span className="font-bold text-base text-on-surface">Caption Text Size</span>
              <span className="text-sm text-on-surface-variant">Adjust size of speech-to-text bubbles</span>
            </div>
            <div className="flex bg-surface rounded-xl p-1 border border-outline-variant self-start">
              {(["sm", "md", "lg"] as const).map((sz) => (
                <button
                  key={sz}
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
              <option value="default">Default Browser Voice</option>
            </select>
          </div>

          {/* Speed slider */}
          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3">
            <div className="flex justify-between font-bold text-base text-on-surface">
              <span>Speech Rate (Speed)</span>
              <span>{speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-outline/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>

          {/* Pitch slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between font-bold text-base text-on-surface">
              <span>Speech Pitch</span>
              <span>{speechPitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechPitch}
              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
              className="w-full h-2 bg-outline/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>

          {/* Volume slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between font-bold text-base text-on-surface">
              <span>Speech Volume</span>
              <span>{Math.round(voiceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={voiceVolume}
              onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
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
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
            Account Management
          </h2>
          <div className="flex flex-col gap-4 py-2 text-left">
            <div>
              <span className="font-bold text-base text-on-surface block">User Status</span>
              <span className="text-base text-on-surface-variant">Logged in as guest account</span>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full h-[56px] border-2 border-red-500 text-red-500 hover:bg-red-500/10 font-bold text-base rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined">logout</span>
              Sign Out Account
            </button>
          </div>
        </section>
      </div>

      <footer className="text-center text-sm font-semibold text-on-surface-variant py-4">
        Companio v1.0.0 — Accessibility Suite
      </footer>
    </div>
  );
}
