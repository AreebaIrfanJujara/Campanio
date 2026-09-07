"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useOffline } from "@/context/OfflineContext";
import { CompanioAPI } from "@/lib/api";
import { Soundwave } from "./Soundwave";

interface HistoryEntry {
  role: string;
  content: string;
}

export const VoiceAssistantOverlay: React.FC = () => {
  const router = useRouter();

  const {
    isAssistantOpen,
    setIsAssistantOpen,
    speak,
    stopSpeaking,
  } = useAccessibility();

  const { isOnline } = useOffline();

  const [status, setStatus] = useState<string>(
    "Tap microphone to ask Companio"
  );

  const [transcript, setTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [responseHtml, setResponseHtml] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [responseSource, setResponseSource] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);

  // Escape key and initial focus handling
  useEffect(() => {
    if (!isAssistantOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAssistantOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const timer = setTimeout(() => {
      if (micButtonRef.current) {
        micButtonRef.current.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isAssistantOpen, setIsAssistantOpen]);

  // Focus trap inside assistant overlay
  const handleOverlayKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key !== "Tab" || !overlayRef.current) return;

    const focusables =
      overlayRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );

    if (focusables.length === 0) return;

    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    if (
      e.shiftKey &&
      document.activeElement === firstElement
    ) {
      e.preventDefault();
      lastElement.focus();
    } else if (
      !e.shiftKey &&
      document.activeElement === lastElement
    ) {
      e.preventDefault();
      firstElement.focus();
    }
  };

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
      setResponseSource("");
    } else {
      const intro = isOnline
        ? "Companio voice assistant ready. Tap the microphone in the center to speak."
        : "Companio offline voice assistant ready. Tap the microphone in the center to ask a question.";

      speak(intro, true);
    }
  }, [
    isAssistantOpen,
    isOnline,
    speak,
    stopSpeaking,
  ]);

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

  /*
   * Performs the actual navigation/action.
   */
 const executeAssistantAction = (
  action?: string,
  announce = true
) => {
  if (!action || action === "none") return;

  switch (action) {
    case "go_home":
      if (announce) speak("Opening home.", true);
      router.push("/home");
      break;

    case "go_back":
      if (announce) speak("Going back.", true);
      router.back();
      break;

    case "open_ocr":
      if (announce) speak("Opening Read Text.", true);
      router.push("/home/ocr");
      break;

    case "open_scene_description":
      if (announce) speak("Opening Narrate Environment.", true);
      router.push("/home/scene-desc");
      break;

    case "open_captions":
      if (announce) speak("Opening Live Captions.", true);
      router.push("/home/captions");
      break;

    case "open_translation":
      if (announce) speak("Opening Translation.", true);
      router.push("/home/translation");
      break;

    case "open_settings":
      if (announce) speak("Opening Settings.", true);
      router.push("/settings");
      break;

    case "open_emergency":
      if (announce) speak("Opening Emergency Assistance.", true);
      router.push("/emergency");
      break;

    case "open_profile":
      if (announce) speak("Opening accessibility profile.", true);
      router.push("/profile-setup");
      break;

    case "open_type_to_speak":
      if (announce) speak("Opening Speak For Me.", true);
      router.push("/home/type-to-speak");
      break;

    case "stop_speaking":
      stopSpeaking();
      break;

    default:
      console.warn("Unknown assistant action:", action);
      break;
  }
};

  /*
   * Detects navigation commands locally.
   *
   * This means commands such as "open OCR" do not
   * depend on the AI backend returning an action.
   */
  const detectNavigationAction = (
    query: string
  ): string | null => {
    const text = query.toLowerCase().trim();

    // OCR / Read Text
    if (
      text.includes("open ocr") ||
      text.includes("go to ocr") ||
      text.includes("open read text") ||
      text.includes("go to read text") ||
      text.includes("take me to ocr") ||
      text.includes("take me to read text")
    ) {
      return "open_ocr";
    }

    // Scene Description / Narrate Environment
    if (
      text.includes("open scene") ||
      text.includes("open scene description") ||
      text.includes("open narrate environment") ||
      text.includes("go to scene description") ||
      text.includes("go to narrate environment")
    ) {
      return "open_scene_description";
    }

    // Live Captions
    if (
      text.includes("open captions") ||
      text.includes("open live captions") ||
      text.includes("go to captions") ||
      text.includes("go to live captions")
    ) {
      return "open_captions";
    }

    // Translation
    if (
      text.includes("open translation") ||
      text.includes("go to translation") ||
      text.includes("open live translation") ||
      text.includes("go to live translation")
    ) {
      return "open_translation";
    }

    // Settings
    if (
      text.includes("open settings") ||
      text.includes("go to settings")
    ) {
      return "open_settings";
    }

    // Emergency
    if (
      text.includes("open emergency") ||
      text.includes("go to emergency") ||
      text.includes("emergency assistance")
    ) {
      return "open_emergency";
    }

    // Profile
    if (
      text.includes("open profile") ||
      text.includes("go to profile") ||
      text.includes("open accessibility profile")
    ) {
      return "open_profile";
    }

    // Speak For Me
    if (
      text.includes("open speak for me") ||
      text.includes("go to speak for me") ||
      text.includes("open type to speak") ||
      text.includes("go to type to speak")
    ) {
      return "open_type_to_speak";
    }

    // Home
    if (
      text === "open home" ||
      text === "go home" ||
      text.includes("go to home")
    ) {
      return "go_home";
    }

    // Back
    if (
      text === "go back" ||
      text === "back"
    ) {
      return "go_back";
    }

    return null;
  };

  /*
   * Processes the user's voice/text query.
   */
  const processQuery = async (
    queryText: string
  ) => {
    setTranscript(queryText);

    setStatus(
      isOnline
        ? "Thinking..."
        : "Processing locally..."
    );

    const newHistory: HistoryEntry[] = [
      ...history,
      {
        role: "user",
        content: queryText,
      },
    ];

    /*
     * FIRST:
     * Check whether this is a navigation command.
     *
     * This happens BEFORE calling the AI.
     */
    const navigationAction =
      detectNavigationAction(queryText);

    if (navigationAction) {
      setIsListening(false);

      const navigationMessages: Record<
        string,
        string
      > = {
        open_ocr:
          "Opening Read Text.",

        open_scene_description:
          "Opening Narrate Environment.",

        open_captions:
          "Opening Live Captions.",

        open_translation:
          "Opening Translation.",

        open_settings:
          "Opening Settings.",

        open_emergency:
          "Opening Emergency Assistance.",

        open_profile:
          "Opening accessibility profile.",

        open_type_to_speak:
          "Opening Speak For Me.",

        go_home:
          "Opening home.",

        go_back:
          "Going back.",
      };

      const message =
        navigationMessages[navigationAction] ||
        "Opening requested page.";

      setResponseHtml(message);
      setResponseSource("navigation");
      setStatus("Speaking...");

      setHistory([
        ...newHistory,
        {
          role: "assistant",
          content: message,
        },
      ]);

      speak(message, true);

      /*
       * Wait briefly so the user hears the announcement,
       * then perform the actual navigation.
       */
      setTimeout(() => {
  executeAssistantAction(navigationAction, false);
}, 800);

      return;
    }

    /*
     * If this wasn't a navigation command,
     * send it to the normal AI assistant.
     */
    try {
      const result =
        await CompanioAPI.ask(
          queryText,
          "User is interacting with the voice assistant overlay.",
          newHistory
        );

      setIsListening(false);

      setResponseHtml(result.reply);
      setResponseSource(result.source);
      setStatus("Speaking...");

      setHistory([
        ...newHistory,
        {
          role: "assistant",
          content: result.reply,
        },
      ]);

      speak(result.reply, true);

      /*
       * The backend can still return actions for
       * other assistant functionality.
       */
      if (
        result.action &&
        result.action !== "none"
      ) {
        setTimeout(() => {
          executeAssistantAction(
            result.action
          );
        }, 800);
      }
    } catch (err) {
      console.error(
        "Assistant query error:",
        err
      );

      setIsListening(false);

      const fallback =
        "Companio is currently running offline. You can ask me how to toggle high contrast, change speech speed, read signs, or use phraseboards.";

      setResponseHtml(fallback);
      setResponseSource(
        "offline-fallback"
      );
      setStatus("Speaking...");

      speak(fallback, true);
    }
  };

  /*
   * Starts browser speech recognition.
   */
  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      /*
       * Fallback simulation when browser
       * doesn't support Web Speech API.
       */
      setIsListening(true);
      setStatus("Listening...");
      setTranscript("");
      setResponseHtml("");

      setTimeout(() => {
        const sampleQuestions = [
          "How do I turn on high contrast mode?",
          "How do I use Speak For Me?",
          "Can I translate into Spanish offline?",
          "How do I change narrator voice speed?",
        ];

        const randomQ =
          sampleQuestions[
            Math.floor(
              Math.random() *
                sampleQuestions.length
            )
          ];

        processQuery(randomQ);
      }, 2500);

      return;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("Listening...");
        setTranscript("");
        setResponseHtml("");
        setResponseSource("");
      };

      recognition.onerror = (
        event: any
      ) => {
        console.error(
          "Speech recognition error",
          event.error
        );

        setStatus(
          "Could not hear clearly. Tap mic to retry."
        );

        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (
        event: any
      ) => {
        const text =
          event.results[0][0]
            .transcript;

        processQuery(text);
      };

      recognitionRef.current =
        recognition;

      recognition.start();
    } catch (e) {
      console.error(e);

      setIsListening(false);
      setStatus("Microphone error");
    }
  };

  /*
   * Microphone button.
   */
  const handleMicClick = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      setIsListening(false);
      setStatus(
        "Cancelled. Tap to try again."
      );
    } else {
      startSpeechRecognition();
    }
  };

  /*
   * Close assistant.
   */
  const handleClose = () => {
    setIsAssistantOpen(false);
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      onKeyDown={handleOverlayKeyDown}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-between p-margin-edge animate-fade-in text-white"
    >
      {/* Header */}

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <h2
            id="assistant-title"
            className="font-display-ocr text-headline-md text-primary-fixed"
          >
            Assistant
          </h2>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              isOnline
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            {isOnline
              ? "Online AI"
              : "Offline Assistant"}
          </span>
        </div>

        <button
          onClick={handleClose}
          aria-label="Close assistant"
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">
            close
          </span>
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
            ref={micButtonRef}
            onClick={handleMicClick}
            aria-label={
              isListening
                ? "Stop listening"
                : "Start listening"
            }
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? "bg-red-600 animate-pulse"
                : "bg-primary hover:scale-105"
            } shadow-2xl relative z-10`}
          >
            {isListening ? (
              <span className="material-symbols-outlined text-5xl">
                stop
              </span>
            ) : (
              <span className="material-symbols-outlined text-5xl">
                mic
              </span>
            )}
          </button>

          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-red-600 animate-ping opacity-70 pointer-events-none"></div>
          )}

          {!isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse-ring pointer-events-none"></div>
          )}
        </div>

        {/* Listening Soundwave indicator */}

        <div className="h-16 flex items-center justify-center">
          {isListening && (
            <Soundwave
              color="bg-primary-fixed"
              size="lg"
            />
          )}

          {status === "Speaking..." && (
            <Soundwave
              color="bg-secondary-fixed"
              size="lg"
            />
          )}
        </div>
      </div>

      {/* Bottom text overlays */}

      <div className="w-full max-w-xl mx-auto flex flex-col gap-4 mb-4">
        {transcript && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 animate-slide-up">
            <p className="text-xs uppercase text-white/50 font-semibold mb-1">
              You said
            </p>

            <p className="text-lg text-white font-bold">
              {transcript}
            </p>
          </div>
        )}

        {responseHtml && (
          <div className="bg-primary-container/20 rounded-2xl p-5 border border-primary-fixed/30 animate-slide-up shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase text-primary-fixed font-bold">
                Companio
              </p>

              {responseSource && (
                <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
                  {responseSource.startsWith(
                    "offline"
                  )
                    ? "Offline Engine"
                    : responseSource ===
                      "navigation"
                    ? "Navigation"
                    : "Cloud AI"}
                </span>
              )}
            </div>

            <p className="text-lg text-white font-semibold leading-relaxed">
              {responseHtml}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};