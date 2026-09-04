import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rateLimit';

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
    const { text, lang } = await req.json();

    if (!text || !text.trim()) {
      const res = NextResponse.json({ error: "Missing text in request body" }, { status: 400 });
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const cleanText = text.trim();
    let detectedLang = lang || "en";
    
    // Auto-detect language script or Roman Urdu/Hindi words
    if (/[\u0600-\u06FF]/.test(cleanText) || /[\u0679\u0686\u0698\u0691\u06AF\u06BA\u06BE\u06CC]/.test(cleanText) || /\b(yaar|baat|suno|kya|hai|karo|shukriya|nahin|nahi|apka|mera|kaise|theek|madad|bhai|kahan|kidhar|salam|namaste)\b/i.test(cleanText)) {
      detectedLang = "ur";
    } else if (/[\u0900-\u097F]/.test(cleanText)) {
      detectedLang = "hi";
    } else if (/[\u3040-\u30ff]/.test(cleanText)) {
      detectedLang = "ja";
    } else if (/[\u4e00-\u9fff]/.test(cleanText)) {
      detectedLang = "zh-CN";
    } else if (/[\u00C0-\u017F]/.test(cleanText)) {
      detectedLang = "es";
    }

    // Fetch natural TTS stream
    try {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(detectedLang)}&q=${encodeURIComponent(cleanText.slice(0, 200))}`;
      const ttsRes = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://translate.google.com/"
        }
      });

      if (ttsRes.ok) {
        const arrayBuffer = await ttsRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = `data:audio/mpeg;base64,${buffer.toString('base64')}`;

        const res = NextResponse.json({
          audioUrl: base64Audio,
          lang: detectedLang,
          source: "google-tts"
        });
        return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
      }
    } catch (ttsErr) {
      console.warn("TTS stream error:", ttsErr);
    }

    const res = NextResponse.json({
      useBrowserTTS: true,
      text: cleanText,
      lang: detectedLang,
      source: "browser"
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
