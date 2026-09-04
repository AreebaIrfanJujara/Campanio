import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, applyRateLimitHeaders, getCostCache, setCostCache } from '@/lib/rateLimit';
import { detectHazards } from '@/lib/hazardDetection';

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

    const cacheKey = `describe:${imageBase64.slice(0, 100)}:${imageBase64.length}`;
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
        const prompt = "Describe this scene for a blind or low-vision person navigating it. Mention the walking path, any obstacles or hazards, and 2-4 notable objects. Keep it to 1-2 short sentences, spoken-language style, no markdown.\nAt the very end of your response on a new line, write: OBJECTS: Object1, Object2, Object3 (list 2 to 4 comma-separated notable object names).";

        const geminiRes = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
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
            let description = "";
            let objectsDetected: Array<{ name: string; confidence: number }> = [];

            const objectsMatch = rawText.match(/OBJECTS:\s*([^\n\r]+)/i);
            if (objectsMatch) {
              const objNames = objectsMatch[1]
                .split(",")
                .map((s) => s.trim().replace(/^[-*•\s]+/, ""))
                .filter((s) => s.length > 0);

              objectsDetected = objNames.map((name) => ({
                name,
                confidence: 0.85, // estimated placeholder confidence since Gemini does not provide object-level detection scores
              }));
              description = rawText.replace(/OBJECTS:\s*[^\n\r]+/i, "").trim();
            } else {
              description = rawText.trim();
            }

            if (!description) {
              description = "I see a room environment ahead. Walking space scanned.";
            }

            const objectNames = objectsDetected.map((o) => o.name);
            const hazardEvals = detectHazards(objectNames, description);
            const hazards = hazardEvals.map((h) => h.alertText);

            const payload = {
              description,
              objects: objectsDetected,
              hazards,
              source: "gemini-vision",
            };

            setCostCache(cacheKey, payload);
            const res = NextResponse.json(payload);
            res.headers.set('X-Cache', 'MISS');
            return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
          }
        } else {
          console.warn(`[Describe] Gemini API returned status ${geminiRes.status}, falling through to next provider.`);
        }
      } catch (geminiErr) {
        console.warn("[Describe] Gemini provider failed, falling through:", geminiErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 2: Google Cloud Vision (Optional secondary fallback)
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
                  { type: "LABEL_DETECTION", maxResults: 10 },
                  { type: "OBJECT_LOCALIZATION", maxResults: 10 },
                ],
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const responseObj = data.responses?.[0];

          const labels = responseObj?.labelAnnotations || [];
          const localizedObjects = responseObj?.localizedObjectAnnotations || [];

          const objectsDetected = localizedObjects.map((obj: any) => ({
            name: obj.name,
            confidence: obj.score,
          }));

          const labelDescriptions = labels.map((l: any) => l.description);
          const topLabels = labelDescriptions.slice(0, 5);
          const description = "I see a scene with " + (topLabels.join(", ") || "various objects") + ". Walking space scanned.";

          // Advanced spatial hazard evaluations
          const hazardEvals = detectHazards(labelDescriptions, description);
          const hazards = hazardEvals.map((h) => h.alertText);

          const payload = {
            description,
            objects: objectsDetected,
            hazards,
            source: "google-cloud-vision",
          };

          setCostCache(cacheKey, payload);
          const res = NextResponse.json(payload);
          res.headers.set('X-Cache', 'MISS');
          return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
        } else {
          console.warn(`[Describe] Google Cloud Vision returned status ${response.status}, falling through to mock.`);
        }
      } catch (visionErr) {
        console.warn("[Describe] Google Cloud Vision provider failed, falling through:", visionErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Final: All providers exhausted — return honest empty result
    // ─────────────────────────────────────────────────────────────────────────────
    const res = NextResponse.json({
      description: "Scene could not be analyzed. Please ensure camera has a clear view.",
      objects: [],
      hazards: [],
      source: "none",
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
