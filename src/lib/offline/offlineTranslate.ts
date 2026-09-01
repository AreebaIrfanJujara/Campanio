/**
 * Offline Translation Dictionary & Engine for Companio
 * Provides offline translation capabilities for 8 languages when offline.
 */

export interface OfflineDictionary {
  [englishPhrase: string]: {
    es: string; // Spanish
    fr: string; // French
    ar: string; // Arabic
    hi: string; // Hindi
    "zh-CN": string; // Chinese Simplified
    de: string; // German
    ja: string; // Japanese
    ur: string; // Urdu
  };
}

export const OFFLINE_PHRASE_DICTIONARY: OfflineDictionary = {
  // Basic Greetings & Social
  "hello": {
    es: "Hola",
    fr: "Bonjour",
    ar: "مرحبا",
    hi: "नमस्ते",
    "zh-CN": "你好",
    de: "Hallo",
    ja: "こんにちは",
    ur: "ہیلو / سلام",
  },
  "hello there!": {
    es: "¡Hola!",
    fr: "Bonjour à vous!",
    ar: "أهلاً بك!",
    hi: "नमस्ते!",
    "zh-CN": "你好！",
    de: "Hallo!",
    ja: "こんにちは！",
    ur: "ہیلو وہاں!",
  },
  "good morning": {
    es: "Buenos días",
    fr: "Bonjour",
    ar: "صباح الخير",
    hi: "शुभ प्रभात",
    "zh-CN": "早上好",
    de: "Guten Morgen",
    ja: "おはようございます",
    ur: "صبح بخیر",
  },
  "good afternoon": {
    es: "Buenas tardes",
    fr: "Bon après-midi",
    ar: "مساء الخير",
    hi: "शुभ दोपहर",
    "zh-CN": "下午好",
    de: "Guten Tag",
    ja: "こんにちは",
    ur: "دوپہر بخیر",
  },
  "good evening": {
    es: "Buenas noches",
    fr: "Bonsoir",
    ar: "مساء الخير",
    hi: "शुभ संध्या",
    "zh-CN": "晚上好",
    de: "Guten Abend",
    ja: "こんばんは",
    ur: "شام بخیر",
  },
  "thank you": {
    es: "Gracias",
    fr: "Merci",
    ar: "شكراً لك",
    hi: "धन्यवाद",
    "zh-CN": "谢谢",
    de: "Danke",
    ja: "ありがとうございます",
    ur: "شکریہ",
  },
  "thank you very much": {
    es: "Muchas gracias",
    fr: "Merci beaucoup",
    ar: "شكراً جزيلاً",
    hi: "बहुत बहुत धन्यवाद",
    "zh-CN": "非常感谢",
    de: "Vielen Dank",
    ja: "どうもありがとうございます",
    ur: "بہت بہت شکریہ",
  },
  "yes": {
    es: "Sí",
    fr: "Oui",
    ar: "نعم",
    hi: "हाँ",
    "zh-CN": "是的",
    de: "Ja",
    ja: "はい",
    ur: "ہاں / جی",
  },
  "no": {
    es: "No",
    fr: "Non",
    ar: "لا",
    hi: "नहीं",
    "zh-CN": "不",
    de: "Nein",
    ja: "いいえ",
    ur: "نہیں",
  },
  "please": {
    es: "Por favor",
    fr: "S'il vous plaît",
    ar: "من فضلك",
    hi: "कृपया",
    "zh-CN": "请",
    de: "Bitte",
    ja: "お願いします",
    ur: "براہ کرم",
  },
  "one moment, please": {
    es: "Un momento, por favor",
    fr: "Un instant, s'il vous plaît",
    ar: "لحظة واحدة من فضلك",
    hi: "कृपया एक क्षण रुकें",
    "zh-CN": "请稍等片刻",
    de: "Einen Moment, bitte",
    ja: "少々お待ちください",
    ur: "براہ کرم ایک لمحہ",
  },
  "i understand": {
    es: "Entiendo",
    fr: "Je comprends",
    ar: "أنا أفهم",
    hi: "मैं समझता हूँ",
    "zh-CN": "我明白了",
    de: "Ich verstehe",
    ja: "理解しました",
    ur: "میں سمجھ گیا",
  },
  "please repeat that": {
    es: "Por favor repita eso",
    fr: "Veuillez répéter s'il vous plaît",
    ar: "يرجى تكرار ذلك",
    hi: "कृपया इसे दोहराएं",
    "zh-CN": "请再说一遍",
    de: "Bitte wiederholen Sie das",
    ja: "もう一度繰り返してください",
    ur: "براہ کرم دوبارہ کہیں",
  },

  // Emergency & Medical
  "please call for help": {
    es: "Por favor llame para pedir ayuda",
    fr: "Veuillez appeler à l'aide",
    ar: "يرجى الاتصال لطلب المساعدة",
    hi: "कृपया मदद के लिए कॉल करें",
    "zh-CN": "请呼叫帮助",
    de: "Bitte rufen Sie Hilfe",
    ja: "助けを呼んでください",
    ur: "براہ کرم مدد کے لیے کال کریں",
  },
  "i need a doctor": {
    es: "Necesito un médico",
    fr: "J'ai besoin d'un médecin",
    ar: "أحتاج إلى طبيب",
    hi: "मुझे डॉक्टर की जरूरत है",
    "zh-CN": "我需要医生",
    de: "Ich brauche einen Arzt",
    ja: "医者が必要です",
    ur: "مجھے ڈاکٹر کی ضرورت ہے",
  },
  "i need assistance urgently": {
    es: "Necesito asistencia urgentemente",
    fr: "J'ai besoin d'aide d'urgence",
    ar: "أحتاج إلى مساعدة عاجلة",
    hi: "मुझे तत्काल सहायता चाहिए",
    "zh-CN": "我急需帮助",
    de: "Ich brauche dringend Hilfe",
    ja: "至急サポートが必要です",
    ur: "مجھے فوری مدد کی ضرورت ہے",
  },
  "please stay with me": {
    es: "Por favor quédese conmigo",
    fr: "Veuillez rester avec moi",
    ar: "يرجى البقاء معي",
    hi: "कृपया मेरे साथ रहें",
    "zh-CN": "请留在我身边",
    de: "Bitte bleiben Sie bei mir",
    ja: "どうか側にいてください",
    ur: "براہ کرم میرے ساتھ رہیں",
  },
  "caution: wet floor": {
    es: "Precaución: Piso mojado",
    fr: "Attention: Sol glissant",
    ar: "تحذير: أرضية مبللة",
    hi: "सावधानी: फर्श गीला है",
    "zh-CN": "小心地滑",
    de: "Achtung: Nasser Boden",
    ja: "注意：足元が濡れています",
    ur: "احتیاط: گیلا فرش",
  },
  "emergency exit": {
    es: "Salida de emergencia",
    fr: "Sortie de secours",
    ar: "مخرج طوارئ",
    hi: "आपातकालीन निकास",
    "zh-CN": "紧急出口",
    de: "Notausgang",
    ja: "非常口",
    ur: "ہنگامی راستہ",
  },

  // Navigation & Directions
  "where is the exit?": {
    es: "¿Dónde está la salida?",
    fr: "Où est la sortie?",
    ar: "أين المخرج؟",
    hi: "निकास कहाँ है?",
    "zh-CN": "出口在哪里？",
    de: "Wo ist der Ausgang?",
    ja: "出口はどこですか？",
    ur: "نکلنے کا راستہ کہاں ہے؟",
  },
  "where is the restroom?": {
    es: "¿Dónde está el baño?",
    fr: "Où sont les toilettes?",
    ar: "أين دورة المياه؟",
    hi: "शौचालय कहाँ है?",
    "zh-CN": "洗手间在哪里？",
    de: "Wo ist die Toilette?",
    ja: "お手洗いはどこですか？",
    ur: "بیت الخلاء کہاں ہے؟",
  },
  "i need directions": {
    es: "Necesito indicaciones",
    fr: "J'ai besoin de directions",
    ar: "أحتاج إلى توجيهات",
    hi: "मुझे दिशा-निर्देश चाहिए",
    "zh-CN": "我需要指路",
    de: "Ich brauche eine Wegbeschreibung",
    ja: "道順を教えてください",
    ur: "مجھے راستہ معلوم کرنا ہے",
  },
  "how far is it?": {
    es: "¿A qué distancia está?",
    fr: "À quelle distance est-ce?",
    ar: "كم يبعد هذا؟",
    hi: "यह कितनी दूर है?",
    "zh-CN": "有多远？",
    de: "Wie weit ist es?",
    ja: "どのくらい離れていますか？",
    ur: "یہ کتنا دور ہے؟",
  },
  "turn left": {
    es: "Gire a la izquierda",
    fr: "Tournez à gauche",
    ar: "انعطف يساراً",
    hi: "बाएं मुड़ें",
    "zh-CN": "向左转",
    de: "Biegen Sie links ab",
    ja: "左に曲がってください",
    ur: "بائیں مڑیں",
  },
  "turn right": {
    es: "Gire a la derecha",
    fr: "Tournez à droite",
    ar: "انعطف يميناً",
    hi: "दाएं मुड़ें",
    "zh-CN": "向右转",
    de: "Biegen Sie rechts ab",
    ja: "右に曲がってください",
    ur: "دائیں مڑیں",
  },
  "go straight ahead": {
    es: "Siga todo recto",
    fr: "Allez tout droit",
    ar: "امشِ للأمام مباشرة",
    hi: "सीधे आगे बढ़ें",
    "zh-CN": "直走",
    de: "Gehen Sie geradeaus",
    ja: "まっすぐ進んでください",
    ur: "سیدھے آگے بڑھیں",
  },
  "where is the pharmacy store located?": {
    es: "¿Dónde se encuentra la farmacia?",
    fr: "Où se trouve la pharmacie?",
    ar: "أين تقع الصيدلية؟",
    hi: "दवा की दुकान कहाँ है?",
    "zh-CN": "药店在哪里？",
    de: "Wo befindet sich die Apotheke?",
    ja: "薬局はどこにありますか？",
    ur: "فارمیسی / میڈیکل اسٹور کہاں ہے؟",
  },
};

// Word-level fallback vocabulary for compound phrasing
const VOCABULARY_MAP: { [word: string]: { [lang: string]: string } } = {
  "caution": { es: "precaución", fr: "attention", ar: "تحذير", hi: "सावधानी", "zh-CN": "小心", de: "Vorsicht", ja: "注意", ur: "احتیاط" },
  "warning": { es: "advertencia", fr: "avertissement", ar: "إنذار", hi: "चेतावनी", "zh-CN": "警告", de: "Warnung", ja: "警告", ur: "انتباہ" },
  "danger": { es: "peligro", fr: "danger", ar: "خطر", hi: "खतरा", "zh-CN": "危险", de: "Gefahr", ja: "危険", ur: "خطرہ" },
  "exit": { es: "salida", fr: "sortie", ar: "مخرج", hi: "निकास", "zh-CN": "出口", de: "Ausgang", ja: "出口", ur: "راستہ" },
  "entrance": { es: "entrada", fr: "entrée", ar: "مدخل", hi: "प्रवेश द्वार", "zh-CN": "入口", de: "Eingang", ja: "入口", ur: "داخلہ" },
  "stairs": { es: "escaleras", fr: "escaliers", ar: "درج", hi: "सीढ़ियाँ", "zh-CN": "楼梯", de: "Treppe", ja: "階段", ur: "سیڑھیاں" },
  "elevator": { es: "ascensor", fr: "ascenseur", ar: "مصعد", hi: "लिफ्ट", "zh-CN": "电梯", de: "Aufzug", ja: "エレベーター", ur: "لفٹ" },
  "restroom": { es: "baño", fr: "toilettes", ar: "حمام", hi: "शौचालय", "zh-CN": "厕所", de: "Toilette", ja: "トイレ", ur: "بیت الخلا" },
  "water": { es: "agua", fr: "eau", ar: "ماء", hi: "पानी", "zh-CN": "水", de: "Wasser", ja: "水", ur: "پانی" },
  "food": { es: "comida", fr: "nourriture", ar: "طعام", hi: "भोजन", "zh-CN": "食物", de: "Essen", ja: "食べ物", ur: "کھانا" },
  "doctor": { es: "médico", fr: "médecin", ar: "طبيب", hi: "डॉक्टर", "zh-CN": "医生", de: "Arzt", ja: "医師", ur: "ڈاکٹر" },
  "hospital": { es: "hospital", fr: "hôpital", ar: "مستشفى", hi: "अस्पताल", "zh-CN": "医院", de: "Krankenhaus", ja: "病院", ur: "ہسپتال" },
  "help": { es: "ayuda", fr: "aide", ar: "مساعدة", hi: "मदद", "zh-CN": "帮助", de: "Hilfe", ja: "助け", ur: "مدد" },
  "stop": { es: "alto", fr: "arrêt", ar: "توقف", hi: "रुकें", "zh-CN": "停止", de: "Halt", ja: "止まれ", ur: "رکیں" },
  "door": { es: "puerta", fr: "porte", ar: "باب", hi: "दरवाजा", "zh-CN": "门", de: "Tür", ja: "ドア", ur: "دروازہ" },
  "open": { es: "abierto", fr: "ouvert", ar: "مفتوح", hi: "खुला", "zh-CN": "打开", de: "offen", ja: "開ける", ur: "کھلا" },
  "closed": { es: "cerrado", fr: "fermé", ar: "مغلق", hi: "बंद", "zh-CN": "关闭", de: "geschlossen", ja: "閉める", ur: "بند" },
};

/**
 * Translates input text using offline rule-based dictionary and vocabulary matching.
 */
export function translateOffline(
  text: string,
  targetLang: string,
  _sourceLang?: string
): { translatedText: string; detectedLanguage: string; source: string } {
  if (!text || !text.trim()) {
    return { translatedText: "", detectedLanguage: "en", source: "offline-engine" };
  }

  const cleanText = text.trim();
  const normalizedKey = cleanText.toLowerCase().replace(/[.!?]/g, "");

  // 1. Direct match in phrase dictionary
  for (const [phrase, translations] of Object.entries(OFFLINE_PHRASE_DICTIONARY)) {
    const normPhrase = phrase.toLowerCase().replace(/[.!?]/g, "");
    if (normPhrase === normalizedKey) {
      const match = (translations as any)[targetLang] || (translations as any)["es"];
      if (match) {
        return {
          translatedText: match,
          detectedLanguage: "en",
          source: "offline-dictionary",
        };
      }
    }
  }

  // 2. Partial substring matching for common phrases
  for (const [phrase, translations] of Object.entries(OFFLINE_PHRASE_DICTIONARY)) {
    const normPhrase = phrase.toLowerCase().replace(/[.!?]/g, "");
    if (normalizedKey.includes(normPhrase) && normPhrase.length > 5) {
      const match = (translations as any)[targetLang];
      if (match) {
        return {
          translatedText: match,
          detectedLanguage: "en",
          source: "offline-dictionary-phrase",
        };
      }
    }
  }

  // 3. Word-by-word token replacement for simple sentences
  const words = cleanText.split(/\s+/);
  let translatedWords: string[] = [];
  let foundAnyWord = false;

  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (VOCABULARY_MAP[cleanWord] && VOCABULARY_MAP[cleanWord][targetLang]) {
      translatedWords.push(VOCABULARY_MAP[cleanWord][targetLang]);
      foundAnyWord = true;
    } else {
      translatedWords.push(word);
    }
  }

  if (foundAnyWord) {
    return {
      translatedText: translatedWords.join(" "),
      detectedLanguage: "en",
      source: "offline-vocab",
    };
  }

  // 4. Formatted fallback with offline notice
  const langNames: { [k: string]: string } = {
    es: "Español",
    fr: "Français",
    ar: "العربية",
    hi: "हिन्दी",
    "zh-CN": "中文",
    de: "Deutsch",
    ja: "日本語",
    ur: "اردو",
  };

  const langLabel = langNames[targetLang] || targetLang;

  return {
    translatedText: `[Offline Translation - ${langLabel}]: ${cleanText}`,
    detectedLanguage: "en",
    source: "offline-fallback",
  };
}
