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
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

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
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 }
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
        source: "google-cloud-vision"
      };

      setCostCache(cacheKey, payload);

      const res = NextResponse.json(payload);
      res.headers.set('X-Cache', 'MISS');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // Mock Fallback
    const mockScenes = [
      {
        description: "A tidy indoor living room. There is a gray couch straight ahead, a wooden coffee table in front of it, and a doorway on the right. Path is clear.",
        objects: [
          { name: "Couch", confidence: 0.94 },
          { name: "Coffee Table", confidence: 0.89 },
          { name: "Doorway", confidence: 0.92 }
        ],
        hazards: []
      },
      {
        description: "An office corridor. There is a water dispenser on the right, a desktop setup on the left, and a safety exit sign visible ahead.",
        objects: [
          { name: "Water Dispenser", confidence: 0.91 },
          { name: "Desktop PC", confidence: 0.87 },
          { name: "Exit Sign", confidence: 0.96 }
        ],
        hazards: []
      },
      {
        description: "A hallway with a low step down about three feet ahead. Please take caution.",
        objects: [
          { name: "Stairs", confidence: 0.93 },
          { name: "Handrail", confidence: 0.85 }
        ],
        hazards: ["Critical: STAIRS detected ahead. Please stop and verify your footing."]
      }
    ];

    const randomIndex = Math.floor(Math.random() * mockScenes.length);
    const res = NextResponse.json({
      ...mockScenes[randomIndex],
      source: "mock"
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
