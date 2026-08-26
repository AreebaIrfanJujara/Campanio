"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccessibility, PresetType } from "@/context/AccessibilityContext";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { applyPreset, userProfile, speak } = useAccessibility();
  const [selected, setSelected] = useState<PresetType>("standard");

  const options: { id: PresetType; title: string; desc: string; icon: string }[] = [
    {
      id: "visual",
      title: "Visual Focus",
      desc: "For low vision. Auto-activates High Contrast Mode & Voice Guidance narration.",
      icon: "visibility",
    },
    {
      id: "hearing",
      title: "Hearing Focus",
      desc: "For auditory assistance. Auto-activates real-time visual captions and flashing hazard alerts.",
      icon: "hearing",
    },
    {
      id: "motor",
      title: "Motor Focus",
      desc: "For physical assistance. Expands active areas up to 72px for easier tap targets.",
      icon: "sign_language",
    },
    {
      id: "standard",
      title: "Standard Profile",
      desc: "Default profile featuring high contrast visual balance, typography, and standard elements.",
      icon: "check_circle",
    },
  ];

  const handleSelect = (id: PresetType) => {
    setSelected(id);
    applyPreset(id);
  };

  const handleFocus = (title: string, desc: string) => {
    speak(`${title}. ${desc}`);
  };

  const handleContinue = () => {
    speak("Profile preference saved. Opening microphone permissions check page.", true);
    router.push("/permission-mic");
  };

  return (
    <div className="flex-grow flex flex-col justify-center max-w-xl mx-auto w-full px-margin-edge py-stack-lg gap-8">
      {/* Title Block */}
      <div className="text-center md:text-left flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-on-surface">Choose Accessibility Profile</h1>
        <p className="text-lg text-on-surface-variant">Select the preset that matches your personal preference. You can change this at any time in settings.</p>
      </div>

      {/* Profile cards */}
      <div className="flex flex-col gap-4">
        {options.map((opt) => {
          const isChosen = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              onFocus={() => handleFocus(opt.title, opt.desc)}
              onMouseEnter={() => handleFocus(opt.title, opt.desc)}
              className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                isChosen
                  ? "bg-primary-container/10 border-primary shadow-md"
                  : "bg-surface-container border-outline-variant hover:bg-surface-container-high"
              }`}
              style={{
                minHeight: userProfile.preset === "motor" ? "88px" : "72px",
              }}
              aria-label={`${opt.title}. ${opt.desc}. ${isChosen ? "Selected" : "Not selected. Tap to select."}`}
            >
              <div
                className={`p-3 rounded-full flex items-center justify-center ${
                  isChosen ? "bg-primary text-white" : "bg-outline/10 text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
              </div>
              <div className="flex-grow flex flex-col justify-center">
                <h3 className="text-xl font-bold text-on-surface">{opt.title}</h3>
                <p className="text-base text-on-surface-variant leading-relaxed">{opt.desc}</p>
              </div>
              <div className="h-full flex items-center">
                <span
                  className={`material-symbols-outlined text-3xl ${
                    isChosen ? "text-primary" : "text-outline/30"
                  }`}
                  style={{ fontVariationSettings: isChosen ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {isChosen ? "radio_button_checked" : "radio_button_unchecked"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue action button */}
      <button
        onClick={handleContinue}
        className="w-full h-[56px] rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center shadow-md cursor-pointer mt-4"
        style={{
          minHeight: userProfile.preset === "motor" ? "72px" : "56px",
        }}
      >
        Save & Continue
      </button>
    </div>
  );
}
