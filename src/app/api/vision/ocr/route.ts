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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      const res = NextResponse.json({ error: "Missing imageBase64 in request body" }, { status: 400 });
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // Cost caching based on image hash snippet
    const cacheKey = `ocr:${imageBase64.slice(0, 100)}:${imageBase64.length}`;
    const cached = getCostCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json({ ...cached, cached: true });
      res.headers.set('X-Cache', 'HIT');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const cleanedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 1: Gemini multimodal vision (Free tier / primary)
    // ─────────────────────────────────────────────────────────────────────────────
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Extract and transcribe ALL text visible in this image exactly as written. If there is no readable text, respond with exactly: No text detected in the image. Do not add commentary, only the transcribed text.",
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: cleanedBase64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText && typeof rawText === "string") {
            const trimmed = rawText.trim();
            const payload = {
              text: trimmed || "No text detected in the image.",
              confidence: 0.9, // placeholder confidence since Gemini does not provide character-level confidence
              language: "en",
              source: "gemini-vision",
            };

            setCostCache(cacheKey, payload);
            const res = NextResponse.json(payload);
            res.headers.set('X-Cache', 'MISS');
            return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
          }
        } else {
          console.warn(`[OCR] Gemini API returned status ${geminiRes.status}, falling through to next provider.`);
        }
      } catch (geminiErr) {
        console.warn("[OCR] Gemini provider failed, falling through:", geminiErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 2: OCR.space (Free tier / secondary fallback)
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      const ocrSpaceApiKey = process.env.OCR_SPACE_API_KEY || "helloworld";
      const params = new URLSearchParams();
      params.append("apikey", ocrSpaceApiKey);
      params.append("base64Image", `data:image/jpeg;base64,${cleanedBase64}`);
      params.append("filetype", "JPG");
      params.append("language", "eng");
      params.append("isOverlayRequired", "false");
      params.append("OCREngine", "2");

      const ocrSpaceRes = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (ocrSpaceRes.ok) {
        const ocrData = await ocrSpaceRes.json();
        if (ocrData.IsErroredOnProcessing === false && Array.isArray(ocrData.ParsedResults) && ocrData.ParsedResults.length > 0) {
          const parsed = ocrData.ParsedResults[0]?.ParsedText;
          if (typeof parsed === "string") {
            const trimmed = parsed.trim();
            const payload = {
              text: trimmed || "No text detected in the image.",
              confidence: 0.85,
              language: "en",
              source: "ocr-space",
            };

            setCostCache(cacheKey, payload);
            const res = NextResponse.json(payload);
            res.headers.set('X-Cache', 'MISS');
            return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
          }
        }
      } else {
        console.warn(`[OCR] OCR.space returned status ${ocrSpaceRes.status}, falling through to next provider.`);
      }
    } catch (ocrSpaceErr) {
      console.warn("[OCR] OCR.space provider failed, falling through:", ocrSpaceErr);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 3: Google Cloud Vision (Optional tertiary fallback)
    // ─────────────────────────────────────────────────────────────────────────────
    const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (visionApiKey) {
      try {
        const visionEndpoint = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;
        const response = await fetch(visionEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: cleanedBase64 },
                features: [
                  { type: "TEXT_DETECTION" },
                  { type: "DOCUMENT_TEXT_DETECTION" },
                ],
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const annotation = data.responses?.[0]?.fullTextAnnotation;
          const text = annotation?.text || "";
          const confidence = data.responses?.[0]?.textAnnotations?.[0] ? 0.95 : 0;

          const payload = {
            text: text.trim() || "No text detected in the image.",
            confidence,
            language: annotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || "en",
            source: "google-cloud-vision",
          };

          setCostCache(cacheKey, payload);
          const res = NextResponse.json(payload);
          res.headers.set('X-Cache', 'MISS');
          return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
        } else {
          console.warn(`[OCR] Google Cloud Vision returned status ${response.status}, falling through to mock.`);
        }
      } catch (visionErr) {
        console.warn("[OCR] Google Cloud Vision provider failed, falling through:", visionErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Final: All providers exhausted — return honest empty result
    // ─────────────────────────────────────────────────────────────────────────────
    const res = NextResponse.json({
      text: "No text detected in the image.",
      confidence: 0,
      language: "en",
      source: "none",
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
