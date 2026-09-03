import { translateOffline } from "./offline/offlineTranslate";
import { answerOffline } from "./offline/offlineAssistant";

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  source: string;
  isOffline?: boolean;
}

export interface DescribeResult {
  description: string;
  objects: Array<{
    name: string;
    confidence: number;
    /** Normalized bounding box returned by Google Cloud Vision (0–1). */
    boundingBox?: { left: number; top: number; width: number; height: number };
    position?: string;
  }>;
  hazards: string[];
  source: string;
  isOffline?: boolean;
}

export interface TTSResult {
  audioBase64?: string;
  mimeType?: string;
  useBrowserTTS?: boolean;
  text: string;
  source: string;
  isOffline?: boolean;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  source: string;
  speaker?: string;
  isOffline?: boolean;
}

export interface TranslateResult {
  translatedText: string;
  detectedLanguage: string;
  source: string;
  isOffline?: boolean;
}

export interface AssistantResult {
  reply: string;
  source: string;
  isOffline?: boolean;
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

function getEndpoint(path: string): string {
  if (GATEWAY_URL) {
    return `${GATEWAY_URL.replace(/\/$/, "")}${path}`;
  }
  return path;
}

export const CompanioAPI = {
  ocr: async (imageBase64: string): Promise<OCRResult> => {
    if (isBrowserOffline()) {
      return {
        text: "Offline OCR is not available in this web build. Reconnect to use Cloud Vision, or use the device's screen reader for saved text.",
        confidence: 0,
        language: "und",
        source: "offline-local",
        isOffline: true,
      };
    }

    try {
      const res = await fetch(getEndpoint("/api/vision/ocr"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch {
      return {
        text: "Text reading is temporarily unavailable. Check the camera, AI service, and Cloud Vision configuration, then try again.",
        confidence: 0,
        language: "und",
        source: "vision-unavailable",
        isOffline: true,
      };
    }
  },

  describe: async (imageBase64: string): Promise<DescribeResult> => {
    if (isBrowserOffline()) {
      return {
        description: "Live scene description requires a connection to the AI service in this web build.",
        objects: [],
        hazards: [],
        source: "vision-unavailable",
        isOffline: true,
      };
    }

    try {
      const res = await fetch(getEndpoint("/api/vision/describe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch {
      return {
        description: "Live scene analysis is unavailable. Check the camera permission and Cloud Vision configuration, then try again.",
        objects: [],
        hazards: [],
        source: "offline-fallback",
        isOffline: true,
      };
    }
  },

  transcribeAudio: async (audioBase64: string, languageCode: string = "en-US"): Promise<STTResult> => {
    if (isBrowserOffline()) {
      return {
        transcript: "Offline voice input recorded.",
        confidence: 0.8,
        source: "offline-stt",
        isOffline: true,
      };
    }

    try {
      const res = await fetch(getEndpoint("/api/stt/transcribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, languageCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch {
      return {
        transcript: "Voice captured (server fallback mode active)",
        confidence: 0.85,
        source: "offline-fallback",
        isOffline: true,
      };
    }
  },

  speak: async (text: string, voice?: string, languageCode?: string): Promise<TTSResult> => {
    if (isBrowserOffline()) {
      return {
        text,
        useBrowserTTS: true,
        source: "browser-speech-offline",
        isOffline: true,
      };
    }

    try {
      const res = await fetch(getEndpoint("/api/tts/speak"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, languageCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch {
      return {
        text,
        useBrowserTTS: true,
        source: "browser-speech-offline",
        isOffline: true,
      };
    }
  },

  translate: async (
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslateResult> => {
    if (isBrowserOffline()) {
      const offlineResult = translateOffline(text, targetLanguage, sourceLanguage);
      return {
        ...offlineResult,
        isOffline: true,
      };
    }

    try {
      const res = await fetch(getEndpoint("/api/translate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage, sourceLanguage }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch {
      const offlineResult = translateOffline(text, targetLanguage, sourceLanguage);
      return {
        ...offlineResult,
        isOffline: true,
      };
    }
  },

  ask: async (
    message: string,
    context?: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<AssistantResult> => {
    if (isBrowserOffline()) {
      const offlineAnswer = answerOffline(message, context);
      return {
        reply: offlineAnswer.reply,
        source: offlineAnswer.source,
        isOffline: true,
      };
    }

    try {
      const res = await fetch(getEndpoint("/api/assistant"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, history }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch {
      const offlineAnswer = answerOffline(message, context);
      return {
        reply: offlineAnswer.reply,
        source: offlineAnswer.source,
        isOffline: true,
      };
    }
  },
};
