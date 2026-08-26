import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "Missing text or targetLanguage in request body" }, { status: 400 });
    }

    if (apiKey) {
      const translateEndpoint = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const response = await fetch(translateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage,
          format: "text"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Translate API error: ${errorText}` }, { status: 500 });
      }

      const data = await response.json();
      const translation = data.data?.translations?.[0];
      return NextResponse.json({
        translatedText: translation?.translatedText || "",
        detectedLanguage: translation?.detectedSourceLanguage || "en",
        source: "google-cloud-translate"
      });
    }

    // Mock Fallback
    const mockTranslations: { [key: string]: string } = {
      es: "Traducido: " + text + " (Modo Simulado)",
      fr: "Traduit: " + text + " (Mode Simulé)",
      ar: "مترجم: " + text + " (وضع محاكاة)",
      hi: "अनुवादित: " + text + " (सिम्युलेटेड मोड)",
      "zh-CN": "已翻译: " + text + " (模拟模式)",
      de: "Übersetzt: " + text + " (Simulierter Modus)",
      ja: "翻訳済み: " + text + " (シミュレートモード)",
      ur: "ترجمہ شدہ: " + text + " (سمیلیٹڈ موڈ)"
    };

    const target = targetLanguage.toLowerCase();
    const translated = mockTranslations[target] || `[Translated to ${targetLanguage}]: ${text}`;

    return NextResponse.json({
      translatedText: translated,
      detectedLanguage: "en",
      source: "mock"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
