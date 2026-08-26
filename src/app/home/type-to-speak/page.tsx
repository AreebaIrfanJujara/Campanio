"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Soundwave } from "@/components/Soundwave";
import { useToast } from "@/context/ToastContext";

interface Preset {
  text: string;
  label: string;
}

export default function TypeToSpeakPage() {
  const { speak, stopSpeaking, isSpeaking, userProfile } = useAccessibility();
  const { addToast } = useToast();
  
  const [customText, setCustomText] = useState<string>("");
  const [newPhraseLabel, setNewPhraseLabel] = useState<string>("");
  const [newPhraseText, setNewPhraseText] = useState<string>("");
  const [customPhrases, setCustomPhrases] = useState<Preset[]>([]);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Load custom phrases from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("companio_custom_phrases");
      if (saved) {
        try {
          setCustomPhrases(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleSpeak = (textToSpeak: string) => {
    if (!textToSpeak.trim()) {
      speak("Please type something first.", true);
      addToast("Please type something first.", "warning");
      return;
    }
    speak(textToSpeak, true);
    addToast("Speaking text...", "info");
  };

  const handleClear = () => {
    setCustomText("");
    speak("Text cleared", true);
  };

  const handleAddCustomPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseLabel || !newPhraseText) {
      speak("Please fill in both label and text inputs.", true);
      return;
    }

    const updated = [...customPhrases, { label: newPhraseLabel, text: newPhraseText }];
    setCustomPhrases(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("companio_custom_phrases", JSON.stringify(updated));
    }
    
    speak(`Saved custom phrase: ${newPhraseLabel}`, true);
    addToast(`Added: ${newPhraseLabel}`, "success");
    setNewPhraseLabel("");
    setNewPhraseText("");
    setIsAdding(false);
  };

  const handleDeleteCustomPhrase = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering the speak action
    const updated = customPhrases.filter((_, idx) => idx !== index);
    setCustomPhrases(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("companio_custom_phrases", JSON.stringify(updated));
    }
    speak("Custom phrase deleted", true);
  };

  const categories = [
    {
      title: "Basic Responses",
      presets: [
        { text: "Yes", label: "Yes" },
        { text: "No", label: "No" },
        { text: "Thank you very much.", label: "Thank you" },
        { text: "One moment, please.", label: "Please wait" },
      ],
      borderClass: "border-outline-variant",
    },
    {
      title: "Navigation Help",
      presets: [
        { text: "Where is the exit?", label: "Where is exit?" },
        { text: "Where is the restroom?", label: "Restroom?" },
        { text: "I need directions.", label: "Need directions" },
        { text: "How far is it?", label: "How far?" },
      ],
      borderClass: "border-outline-variant",
    },
    {
      title: "Emergency (Urgencies)",
      presets: [
        { text: "Please call for help.", label: "Call for help" },
        { text: "I need a doctor.", label: "Need a doctor" },
        { text: "I need assistance urgently.", label: "Urgent help" },
        { text: "Please stay with me.", label: "Stay with me" },
      ],
      borderClass: "border-red-500/30 text-red-600 dark:text-red-400 hover:border-red-600",
    },
  ];

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-2xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-on-surface">Speak For Me</h1>
        <p className="text-lg text-on-surface-variant">
          Type custom text or tap preset boards to have Companio speak aloud for you.
        </p>
      </div>

      {/* Input Text Box */}
      <div className="flex flex-col gap-2">
        <label htmlFor="custom-speak-input" className="font-semibold text-lg text-on-surface">
          Enter custom text to speak
        </label>
        <textarea
          id="custom-speak-input"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full h-36 p-4 border-2 border-outline rounded-2xl bg-surface-container text-2xl font-bold font-display-ocr text-on-surface focus:border-primary focus:outline-none resize-none leading-relaxed"
          placeholder="Type here..."
          aria-label="Text to speech entry area"
        />

        {/* Speak indicators */}
        {isSpeaking && (
          <div className="flex items-center gap-3 bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/30 rounded-xl px-4 py-2 mt-2 w-max animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping"></span>
            <span className="font-bold text-base">Speaking...</span>
            <Soundwave color="bg-teal-500" size="sm" />
          </div>
        )}

        <div className="flex gap-4 mt-3">
          <button
            onClick={() => handleSpeak(customText)}
            className="flex-grow h-[56px] bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 transition-all"
            style={{
              minHeight: userProfile.preset === "motor" ? "72px" : "56px",
            }}
          >
            <span className="material-symbols-outlined text-xl">volume_up</span>
            Speak Text
          </button>
          
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="px-6 h-[56px] bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              Stop
            </button>
          )}

          <button
            onClick={handleClear}
            className="px-6 h-[56px] bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-lg rounded-xl cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Preset cards grid grouped by categories */}
      <div className="flex flex-col gap-6 mt-2">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            <h3 className="font-bold text-xl text-on-surface border-b border-outline-variant pb-1.5">
              {cat.title}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {cat.presets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleSpeak(preset.text)}
                  className={`h-[64px] px-4 bg-surface border-2 rounded-xl text-lg font-bold hover:bg-surface-container-low transition-all cursor-pointer flex items-center justify-between text-left ${cat.borderClass}`}
                  style={{
                    minHeight: userProfile.preset === "motor" ? "76px" : "64px",
                  }}
                  aria-label={`Preset phrase: ${preset.text}`}
                >
                  <span>{preset.label}</span>
                  <span className="material-symbols-outlined text-xl opacity-80">play_circle</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Custom Phrase section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-outline-variant pb-1.5">
            <h3 className="font-bold text-xl text-on-surface">Custom Board</h3>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-primary font-bold text-base hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none"
            >
              <span className="material-symbols-outlined">{isAdding ? "expand_less" : "add"}</span>
              {isAdding ? "Cancel" : "Add Phrase"}
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleAddCustomPhrase} className="bg-surface-container border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 animate-slide-up">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phrase-label" className="font-semibold text-base text-on-surface">
                  Button Label
                </label>
                <input
                  type="text"
                  id="phrase-label"
                  value={newPhraseLabel}
                  onChange={(e) => setNewPhraseLabel(e.target.value)}
                  className="h-12 px-3 border border-outline rounded-xl bg-surface focus:outline-primary text-base text-on-surface"
                  placeholder="e.g. Toilet"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phrase-text" className="font-semibold text-base text-on-surface">
                  Spoken Phrase Text
                </label>
                <input
                  type="text"
                  id="phrase-text"
                  value={newPhraseText}
                  onChange={(e) => setNewPhraseText(e.target.value)}
                  className="h-12 px-3 border border-outline rounded-xl bg-surface focus:outline-primary text-base text-on-surface"
                  placeholder="e.g. Excuse me, where is the toilet?"
                  required
                />
              </div>
              <button
                type="submit"
                className="h-12 bg-primary hover:bg-primary-container text-white font-bold rounded-xl cursor-pointer"
              >
                Save to Board
              </button>
            </form>
          )}

          {customPhrases.length === 0 ? (
            <p className="text-zinc-500 text-base leading-relaxed py-2">
              No custom phrases added yet. Click "Add Phrase" to add your own.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {customPhrases.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleSpeak(preset.text)}
                  className="h-[64px] pl-4 pr-2 bg-surface border-2 border-primary rounded-xl text-lg font-bold text-on-surface hover:bg-surface-container-low transition-all cursor-pointer flex items-center justify-between text-left"
                  style={{
                    minHeight: userProfile.preset === "motor" ? "76px" : "64px",
                  }}
                  aria-label={`Custom phrase: ${preset.text}`}
                >
                  <span className="truncate max-w-[70%]">{preset.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-xl">play_circle</span>
                    <button
                      onClick={(e) => handleDeleteCustomPhrase(index, e)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-full cursor-pointer"
                      aria-label={`Delete custom phrase ${preset.label}`}
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
