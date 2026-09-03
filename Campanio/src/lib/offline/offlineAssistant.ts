/**
 * Offline Conversational Assistant Engine for Companio
 * Handles NLP intent matching, accessibility guidance, navigation, and emergency help when offline.
 */

export interface OfflineAssistantResponse {
  reply: string;
  source: "offline-assistant" | "offline-emergency" | "offline-guide";
  suggestedAction?: string;
}

export function answerOffline(message: string, _context?: string): OfflineAssistantResponse {
  if (!message || !message.trim()) {
    return {
      reply: "I am Companio, your offline accessibility assistant. How can I help you right now?",
      source: "offline-assistant",
    };
  }

  const text = message.toLowerCase().trim();

  // 1. Emergency & Urgent Safety
  if (
    text.includes("emergency") ||
    text.includes("911") ||
    text.includes("call for help") ||
    text.includes("heart") ||
    text.includes("ambulance") ||
    text.includes("danger")
  ) {
    return {
      reply: "If you are in immediate danger or need medical help, please dial 911 or your local emergency services right away. You can also use the 'Emergency (Urgencies)' board in Speak For Me.",
      source: "offline-emergency",
      suggestedAction: "/home/type-to-speak",
    };
  }

  // 2. High Contrast / Visual Theme
  if (
    text.includes("contrast") ||
    text.includes("dark mode") ||
    text.includes("black") ||
    text.includes("theme") ||
    text.includes("vision") ||
    text.includes("see better")
  ) {
    return {
      reply: "High Contrast Mode provides high visibility pitch-black backgrounds with stark white text. You can toggle it anytime using the eye icon in the top navigation bar or under Settings.",
      source: "offline-guide",
      suggestedAction: "/settings",
    };
  }

  // 3. Voice Guidance & Narrator Speed
  if (
    text.includes("voice") ||
    text.includes("speed") ||
    text.includes("faster") ||
    text.includes("slower") ||
    text.includes("pitch") ||
    text.includes("volume") ||
    text.includes("narrat")
  ) {
    return {
      reply: "You can customize speech rate, pitch, volume, and voice guidance toggles directly in the Settings page under the 'Speech & Narrator' section.",
      source: "offline-guide",
      suggestedAction: "/settings",
    };
  }

  // 4. OCR / Read Text
  if (
    text.includes("read text") ||
    text.includes("ocr") ||
    text.includes("scan document") ||
    text.includes("sign") ||
    text.includes("label") ||
    text.includes("bottle")
  ) {
    return {
      reply: "To read signs, documents, or medication labels aloud, use the 'Read Text (OCR)' module on the Home screen and point your camera at the text.",
      source: "offline-guide",
      suggestedAction: "/home/ocr",
    };
  }

  // 5. Scene Description / Narrate Room / Obstacles
  if (
    text.includes("room") ||
    text.includes("describe") ||
    text.includes("environment") ||
    text.includes("obstacle") ||
    text.includes("hazard") ||
    text.includes("look around") ||
    text.includes("explore")
  ) {
    return {
      reply: "You can use 'Narrate Environment' or 'Explore Room' on the Home screen. Slowly sweep your camera across the area to detect objects, doors, and potential obstacles.",
      source: "offline-guide",
      suggestedAction: "/home/scene-desc",
    };
  }

  // 6. Speak For Me / AAC / Type To Talk
  if (
    text.includes("speak for me") ||
    text.includes("talk for me") ||
    text.includes("aac") ||
    text.includes("phrase") ||
    text.includes("type to speak")
  ) {
    return {
      reply: "Open 'Speak For Me' to tap pre-made response buttons like 'Yes', 'Thank you', or 'Need directions', or type your own custom messages to speak aloud.",
      source: "offline-guide",
      suggestedAction: "/home/type-to-speak",
    };
  }

  // 7. Live Captions / Hearing
  if (
    text.includes("caption") ||
    text.includes("subtitles") ||
    text.includes("hearing") ||
    text.includes("transcribe") ||
    text.includes("listen")
  ) {
    return {
      reply: "The 'Live Captions' module transcribes speech around your microphone in real-time with large, zoomable text and sound event alerts.",
      source: "offline-guide",
      suggestedAction: "/home/captions",
    };
  }

  // 8. Translation
  if (
    text.includes("translate") ||
    text.includes("spanish") ||
    text.includes("french") ||
    text.includes("language") ||
    text.includes("arabic") ||
    text.includes("hindi") ||
    text.includes("german")
  ) {
    return {
      reply: "Companio includes an offline translation engine with support for 8 languages including Spanish, French, Arabic, Hindi, Chinese, German, Japanese, and Urdu in the 'Live Translation' module.",
      source: "offline-guide",
      suggestedAction: "/home/translation",
    };
  }

  // 9. Offline Status / PWA Installation
  if (
    text.includes("offline") ||
    text.includes("install") ||
    text.includes("pwa") ||
    text.includes("internet") ||
    text.includes("wifi") ||
    text.includes("download")
  ) {
    return {
      reply: "Companio is fully equipped with offline PWA support. All pages, speech synthesis, live captions, phraseboards, and local translations work without internet.",
      source: "offline-assistant",
    };
  }

  // 10. Greetings & Identity
  if (text.includes("who are you") || text.includes("what are you") || text.includes("hello") || text.includes("hi")) {
    return {
      reply: "Hello! I am Companio, your accessibility assistant. I am running in offline mode and ready to help you navigate, speak, or assist with your accessibility tools.",
      source: "offline-assistant",
    };
  }

  // General default fallback
  return {
    reply: `I received your offline question: "${message}". You can ask me about high contrast mode, voice settings, reading text, live captions, or translation.`,
    source: "offline-assistant",
  };
}
