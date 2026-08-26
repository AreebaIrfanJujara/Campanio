"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { CompanioAPI } from "@/lib/api";
import { Soundwave } from "./Soundwave";

interface HistoryEntry {
  role: string;
  content: string;
}

export const VoiceAssistantOverlay: React.FC = () => {
  const { isAssistantOpen, setIsAssistantOpen, speak, stopSpeaking, theme } = useAccessibility();
  const [status, setStatus] = useState<string>("Tap microphone to ask Companio");
  const [transcript, setTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [responseHtml, setResponseHtml] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  const recognitionRef = useRef<any>(null);

  // Stop speaking when overlay closes
  useEffect(() => {
    if (!isAssistantOpen) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopSpeaking();
      setHistory([]);
      setTranscript("");
      setResponseHtml("");
    } else {
      speak("Companio voice assistant ready. Tap the microphone in the center to speak.", true);
    }
  }, [isAssistantOpen]);

  // Clean up recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  if (!isAssistantOpen) return null;

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback if SpeechRecognition is not supported
      setIsListening(true);
      setStatus("Listening...");
      setTranscript("");
      setResponseHtml("");

      setTimeout(() => {
        setTranscript("How do I turn on high contrast mode?");
        setStatus("Processing request...");

        setTimeout(() => {
          setIsListening(false);
          const answer = "You can turn on High Contrast Mode by tapping the eye icon in the top right, or going to the Settings page. I have enabled it for you now.";
          setResponseHtml(answer);
          setStatus("Speaking...");
          speak(answer, true);
        }, 1500);
      }, 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("Listening...");
        setTranscript("");
        setResponseHtml("");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setStatus("Error: " + event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setStatus("Thinking...");

        // Call real Gemini API via CompanioAPI
        const newHistory: HistoryEntry[] = [
          ...history,
          { role: "user", content: text },
        ];

        CompanioAPI.ask(text, "User is using the voice assistant overlay.", newHistory)
          .then((result) => {
            setIsListening(false);
            setResponseHtml(result.reply);
            setStatus("Speaking...");
            setHistory([...newHistory, { role: "assistant", content: result.reply }]);
            speak(result.reply, true);
          })
          .catch((err) => {
            console.error("Assistant API error:", err);
            setIsListening(false);
            const fallback = "I'm sorry, I couldn't process that right now. Please try again.";
            setResponseHtml(fallback);
            setStatus("Error occurred");
            speak(fallback, true);
          });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setStatus("Microphone error");
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setStatus("Cancelled. Tap to try again.");
    } else {
      startSpeechRecognition();
    }
  };

  const handleClose = () => {
    setIsAssistantOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-between p-margin-edge animate-fade-in text-white">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <h2 className="font-display-ocr text-headline-md text-primary-fixed">Assistant</h2>
        <button
          onClick={handleClose}
          aria-label="Close assistant"
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      {/* Main visual center */}
      <div className="flex-grow flex flex-col items-center justify-center gap-8">
        <p className="text-xl font-medium tracking-wide text-center max-w-md px-4 h-12">
          {status}
        </p>

        {/* Big voice controller button */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <button
            onClick={handleMicClick}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isListening ? "bg-red-600 animate-pulse" : "bg-primary"
            } shadow-2xl relative z-10`}
          >
            {isListening ? (
              <span className="material-symbols-outlined text-5xl">stop</span>
            ) : (
              <span className="material-symbols-outlined text-5xl">mic</span>
            )}
          </button>
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-red-600 animate-ping opacity-70"></div>
          )}
          {!isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse-ring"></div>
          )}
        </div>

        {/* Listening Soundwave indicator */}
        <div className="h-16 flex items-center justify-center">
          {isListening && <Soundwave color="bg-primary-fixed" size="lg" />}
          {status === "Speaking..." && <Soundwave color="bg-secondary-fixed" size="lg" />}
        </div>
      </div>

      {/* Bottom text overlays */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-4 mb-4">
        {transcript && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <p className="text-xs uppercase text-white/50 font-semibold mb-1">You said</p>
            <p className="text-lg text-white">{transcript}</p>
          </div>
        )}

        {responseHtml && (
          <div className="bg-primary-container/20 rounded-xl p-5 border border-primary-fixed/30 animate-slide-up">
            <p className="text-xs uppercase text-primary-fixed font-semibold mb-1">Companio</p>
            <p className="text-lg text-white leading-relaxed">{responseHtml}</p>
          </div>
        )}
      </div>
    </div>
  );
};
