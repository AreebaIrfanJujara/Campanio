import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, applyRateLimitHeaders, getCostCache, setCostCache } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const rateStatus = checkRateLimit(req);
  if (!rateStatus.allowed) {
    const res = NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment." },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }

  try {
    const { text, targetLanguage, sourceLanguage = "en" } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;

    if (!text || !targetLanguage) {
      const res = NextResponse.json({ error: "Missing text or targetLanguage in request body" }, { status: 400 });
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const cacheKey = `translate:${targetLanguage}:${text.trim().toLowerCase()}`;
    const cached = getCostCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json({ ...cached, cached: true });
      res.headers.set('X-Cache', 'HIT');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
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
        const res = NextResponse.json({ error: `Translate API error: ${errorText}` }, { status: 500 });
        return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
      }

      const data = await response.json();
      const translation = data.data?.translations?.[0];
      const payload = {
        translatedText: translation?.translatedText || "",
        detectedLanguage: translation?.detectedSourceLanguage || "en",
        source: "google-cloud-translate"
      };

      setCostCache(cacheKey, payload);

      const res = NextResponse.json(payload);
      res.headers.set('X-Cache', 'MISS');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // Mock Fallback
    const mockTranslations: { [key: string]: string } = {
      es: "Traducido: " + text,
      fr: "Traduit: " + text,
      ar: "مترجم: " + text,
      hi: "अनुवादित: " + text,
      "zh-CN": "已翻译: " + text,
      de: "Übersetzt: " + text,
      ja: "翻訳済み: " + text,
      ur: "ترجمہ شدہ: " + text
    };

    const target = targetLanguage.toLowerCase();
    const translated = mockTranslations[target] || `[${targetLanguage}]: ${text}`;

    const res = NextResponse.json({
      translatedText: translated,
      detectedLanguage: "en",
      source: "mock"
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
