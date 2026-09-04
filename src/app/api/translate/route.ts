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

    const translatePrompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translated text, no explanation, no quotes:\n\n${text}`;

    // Step 1 — Groq high-speed LPU translation (~200ms)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [{ role: "user", content: translatePrompt }],
            max_tokens: 300,
            temperature: 0.2
          })
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          const translatedText = data.choices?.[0]?.message?.content;

          if (translatedText) {
            const payload = {
              translatedText: translatedText.trim(),
              detectedLanguage: sourceLanguage,
              source: "groq"
            };

            setCostCache(cacheKey, payload);

            const res = NextResponse.json(payload);
            res.headers.set('X-Cache', 'MISS');
            return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
          }
        }
      } catch {
        // Groq failed — trying Gemini
      }
    }

    // Step 2 — Gemini 2.5 Flash translation
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const response = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: translatePrompt }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (translatedText) {
            const payload = {
              translatedText: translatedText.trim(),
              detectedLanguage: sourceLanguage,
              source: "gemini"
            };

            setCostCache(cacheKey, payload);

            const res = NextResponse.json(payload);
            res.headers.set('X-Cache', 'MISS');
            return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
          }
        }
      } catch {
        // Gemini failed — trying MyMemory
      }
    }

    // Step 3 — MyMemory (free, no key required)
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLanguage}`;
      const myMemoryResponse = await fetch(myMemoryUrl, { method: "GET" });

      if (myMemoryResponse.ok) {
        const data = await myMemoryResponse.json();
        const translatedText = data.responseData?.translatedText;

        if (translatedText) {
          const payload = {
            translatedText,
            detectedLanguage: sourceLanguage,
            source: "mymemory"
          };

          setCostCache(cacheKey, payload);

          const res = NextResponse.json(payload);
          res.headers.set('X-Cache', 'MISS');
          return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
        }
      }
    } catch {
      // MyMemory also failed — falling through to mock
    }

    // Step 4 — Mock fallback (network down entirely)
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
