"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Soundwave } from "@/components/Soundwave";
import { useToast } from "@/context/ToastContext";
import { getPredictiveSuggestions } from "@/lib/predictivePhrases";
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth";
import { fetchUserPhrases, createUserPhrase, deleteUserPhrase } from "@/lib/supabaseService";

interface Preset {
  id?: string;
  text: string;
  label: string;
}

export default function TypeToSpeakPage() {
  const { speak, stopSpeaking, isSpeaking, userProfile } = useAccessibility();
  const { addToast } = useToast();
  const { user } = useSupabaseAuth();
  
  const [customText, setCustomText] = useState<string>("");
  const [newPhraseLabel, setNewPhraseLabel] = useState<string>("");
  const [newPhraseText, setNewPhraseText] = useState<string>("");
  const [customPhrases, setCustomPhrases] = useState<Preset[]>([]);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<string[]>([]);

  // Update predictive suggestions on typing
  useEffect(() => {
    const sugg = getPredictiveSuggestions(customText);
    setPredictions(sugg);
  }, [customText]);

  // Announce page active once on mount
  useEffect(() => {
    speak("Speak for me active. Type a message or tap quick phrases to speak aloud.");
  }, []);

  // Load custom phrases from localStorage and Supabase on mount/auth change
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

    if (user?.id) {
      fetchUserPhrases(user.id).then((dbPhrases) => {
        if (dbPhrases && dbPhrases.length > 0) {
          const mapped = dbPhrases.map((p) => ({
            id: p.id,
            label: p.label,
            text: p.text,
          }));
          setCustomPhrases(mapped);
          if (typeof window !== "undefined") {
            localStorage.setItem("companio_custom_phrases", JSON.stringify(mapped));
          }
        }
      }).catch(() => {});
    }
  }, [user?.id]);

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

  const handleSelectPrediction = (suggestion: string) => {
    if (!customText.trim()) {
      setCustomText(suggestion);
    } else if (customText.endsWith(" ")) {
      setCustomText(customText + suggestion);
    } else {
      const words = customText.split(/\s+/);
      words.pop();
      const prefix = words.length > 0 ? words.join(" ") + " " : "";
      setCustomText(prefix + suggestion);
    }
    speak(suggestion, true);
  };

  const handleAddCustomPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseLabel || !newPhraseText) {
      speak("Please fill in both label and text inputs.", true);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newEntry: Preset = { id: tempId, label: newPhraseLabel, text: newPhraseText };
    const updated = [...customPhrases, newEntry];
    setCustomPhrases(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("companio_custom_phrases", JSON.stringify(updated));
    }
    
    speak(`Saved custom phrase: ${newPhraseLabel}`, true);
    addToast(`Added: ${newPhraseLabel}`, "success");
    setNewPhraseLabel("");
    setNewPhraseText("");
    setIsAdding(false);

    if (user?.id) {
      try {
        const created = await createUserPhrase(user.id, {
          label: newEntry.label,
          text: newEntry.text,
        });
        if (created?.id) {
          setCustomPhrases((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, id: created.id } : p))
          );
        }
      } catch (err) {
        console.warn("Supabase phrase save error:", err);
      }
    }
  };

  const handleDeleteCustomPhrase = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const phraseToDelete = customPhrases[index];
    const updated = customPhrases.filter((_, idx) => idx !== index);
    setCustomPhrases(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("companio_custom_phrases", JSON.stringify(updated));
    }
    speak("Custom phrase deleted", true);

    if (user?.id && phraseToDelete?.id && !phraseToDelete.id.startsWith("temp-")) {
      try {
        await deleteUserPhrase(phraseToDelete.id, user.id);
      } catch (err) {
        console.warn("Supabase phrase delete error:", err);
      }
    }
  };

  const categories = [
    {
      title: "Basic Responses",
      presets: [
        { text: "Yes", label: "Yes / جی ہاں" },
        { text: "No", label: "No / نہیں" },
        { text: "Thank you very much.", label: "Thank you / شکریہ" },
        { text: "One moment, please.", label: "Please wait / ایک منٹ" },
      ],
      borderClass: "border-outline-variant",
    },
    {
      title: "Navigation & Surroundings",
      presets: [
        { text: "Where is the emergency exit?", label: "Emergency Exit" },
        { text: "Where is the nearest restroom?", label: "Restroom" },
        { text: "I need directions, please.", label: "Need Directions" },
        { text: "How far is the entrance?", label: "Entrance Distance" },
      ],
      borderClass: "border-secondary",
    },
    {
      title: "Assistance & Medical",
      presets: [
        { text: "Please call for assistance.", label: "Call For Help" },
        { text: "I have low vision and need a guide.", label: "Visual Assistance" },
        { text: "Please write it down for me.", label: "Write It Down" },
        { text: "I need urgent medical attention.", label: "Medical Help" },
      ],
      borderClass: "border-error",
    },
  ];

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full text-on-surface">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display-ocr">Speak For Me</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Type custom text or tap quick AAC presets to read aloud using natural speech synthesis.
        </p>
      </div>

      {/* Main Text Input Area */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label htmlFor="custom-speech-input" className="font-bold text-lg text-on-surface">
            Type anything to speak
          </label>
          <span className="text-xs text-on-surface-variant font-bold">AAC Board</span>
        </div>

        <textarea
          id="custom-speech-input"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Type what you want to say out loud..."
          rows={3}
          className="w-full p-4 border-2 border-outline focus:border-primary focus:outline-none rounded-2xl text-xl font-bold bg-surface-container resize-none"
          aria-label="Text to speak input area"
        />

        {/* Predictive Suggestions Bar */}
        {predictions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-xs font-bold text-primary shrink-0 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Predict:
            </span>
            {predictions.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPrediction(p)}
                className="shrink-0 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-sm font-extrabold cursor-pointer active:scale-95 transition-transform"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Speaking animation indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-3 bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/30 rounded-xl px-4 py-2 mt-2 w-max animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping"></span>
            <span className="font-bold text-base">Speaking...</span>
            <Soundwave color="bg-teal-500" size="sm" />
          </div>
        )}

        <div className="flex gap-4 mt-2">
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
                  placeholder="e.g. Call Taxi"
                  className="w-full h-12 px-3 border border-outline rounded-xl bg-surface focus:outline-primary text-base text-on-surface"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phrase-text" className="font-semibold text-base text-on-surface">
                  Spoken Sentence
                </label>
                <input
                  type="text"
                  id="phrase-text"
                  value={newPhraseText}
                  onChange={(e) => setNewPhraseText(e.target.value)}
                  placeholder="e.g. Please call a wheelchair-accessible taxi for me."
                  className="w-full h-12 px-3 border border-outline rounded-xl bg-surface focus:outline-primary text-base text-on-surface"
                  required
                />
              </div>

              <button
                type="submit"
                className="h-12 bg-primary hover:bg-primary-container text-white font-bold rounded-xl cursor-pointer shadow active:scale-95 transition-transform"
              >
                Save Custom Phrase
              </button>
            </form>
          )}

          {customPhrases.length === 0 ? (
            <div className="p-5 border-2 border-dashed border-outline-variant rounded-xl text-center text-on-surface-variant font-medium">
              No custom phrases saved yet. Tap &apos;Add Phrase&apos; above to save phrases you use frequently.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {customPhrases.map((phrase, index) => (
                <div
                  key={index}
                  onClick={() => handleSpeak(phrase.text)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSpeak(phrase.text);
                    }
                  }}
                  className="h-[64px] px-4 bg-surface-container border-2 border-primary/40 rounded-xl text-lg font-bold hover:bg-surface-container-high transition-all cursor-pointer flex items-center justify-between text-left group"
                  style={{
                    minHeight: userProfile.preset === "motor" ? "76px" : "64px",
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Custom phrase: ${phrase.text}`}
                >
                  <span className="truncate pr-2">{phrase.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xl opacity-80 group-hover:scale-110 transition-transform">
                      play_circle
                    </span>
                    <button
                      onClick={(e) => handleDeleteCustomPhrase(index, e)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 cursor-pointer"
                      aria-label={`Delete custom phrase ${phrase.label}`}
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
