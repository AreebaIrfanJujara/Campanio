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
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

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

    if (apiKey) {
      const cleanedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const visionEndpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const response = await fetch(visionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanedBase64 },
              features: [
                { type: "TEXT_DETECTION" },
                { type: "DOCUMENT_TEXT_DETECTION" }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const res = NextResponse.json({ error: `Vision API error: ${errorText}` }, { status: 500 });
        return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
      }

      const data = await response.json();
      const annotation = data.responses?.[0]?.fullTextAnnotation;
      const text = annotation?.text || "";
      const confidence = data.responses?.[0]?.textAnnotations?.[0] ? 0.95 : 0;
      
      const payload = {
        text: text.trim() || "No text detected in the image.",
        confidence,
        language: annotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || "en",
        source: "google-cloud-vision"
      };

      setCostCache(cacheKey, payload);

      const res = NextResponse.json(payload);
      res.headers.set('X-Cache', 'MISS');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // Mock Fallback
    const mockPhrases = [
      "Pharmacy label: Take one tablet by mouth daily in the morning with food. Quantity 30. Prescribed to Alex Smith.",
      "Street Sign: Caution, Pedestrian Crossing Ahead. Speed Limit 25 Miles Per Hour.",
      "Emergency Exit → Please use stairs in case of fire.",
      "Store Flyer: Fresh apples one dollar ninety-nine cents per pound. Organic milk three dollars forty-nine cents.",
    ];

    const randomIndex = Math.floor(Math.random() * mockPhrases.length);
    const mockPayload = {
      text: mockPhrases[randomIndex],
      confidence: 0.98,
      language: "en",
      source: "mock"
    };

    const res = NextResponse.json(mockPayload);
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
