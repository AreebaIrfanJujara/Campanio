export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  source: string;
}

export interface DescribeResult {
  description: string;
  objects: Array<{ name: string; confidence: number }>;
  hazards: string[];
  source: string;
}

export interface TTSResult {
  audioBase64?: string;
  mimeType?: string;
  useBrowserTTS?: boolean;
  text: string;
  source: string;
}

export interface TranslateResult {
  translatedText: string;
  detectedLanguage: string;
  source: string;
}

export interface AssistantResult {
  reply: string;
  source: string;
}

export const CompanioAPI = {
  ocr: async (imageBase64: string): Promise<OCRResult> => {
    const res = await fetch('/api/vision/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  describe: async (imageBase64: string): Promise<DescribeResult> => {
    const res = await fetch('/api/vision/describe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  speak: async (text: string, voice?: string, languageCode?: string): Promise<TTSResult> => {
    const res = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, languageCode }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  translate: async (text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslateResult> => {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage, sourceLanguage }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  ask: async (message: string, context?: string, history?: Array<{role: string, content: string}>): Promise<AssistantResult> => {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, history }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
