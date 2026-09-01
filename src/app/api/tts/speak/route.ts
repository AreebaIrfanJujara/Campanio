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
    const { text, voice, languageCode = 'en-US' } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

    if (!text) {
      const res = NextResponse.json({ error: "Missing text in request body" }, { status: 400 });
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const cacheKey = `tts:${voice || 'default'}:${text.trim().toLowerCase()}`;
    const cached = getCostCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json({ ...cached, cached: true });
      res.headers.set('X-Cache', 'HIT');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    if (apiKey) {
      const ttsEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      const response = await fetch(ttsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voice || `${languageCode}-Neural2-F`
          },
          audioConfig: {
            audioEncoding: "MP3"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const res = NextResponse.json({ error: `TTS API error: ${errorText}` }, { status: 500 });
        return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
      }

      const data = await response.json();
      const payload = {
        audioBase64: data.audioContent,
        mimeType: "audio/mp3",
        source: "google-cloud-tts"
      };

      setCostCache(cacheKey, payload);

      const res = NextResponse.json(payload);
      res.headers.set('X-Cache', 'MISS');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // Default to telling browser to use native Web Speech Synthesis API
    const res = NextResponse.json({
      useBrowserTTS: true,
      text,
      source: "fallback-browser"
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
