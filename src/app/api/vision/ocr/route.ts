import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64 in request body" }, { status: 400 });
    }

    if (apiKey) {
      // Strip out base64 prefixes if any
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
        return NextResponse.json({ error: `Vision API error: ${errorText}` }, { status: 500 });
      }

      const data = await response.json();
      const annotation = data.responses?.[0]?.fullTextAnnotation;
      const text = annotation?.text || "";
      const confidence = data.responses?.[0]?.textAnnotations?.[0] ? 0.95 : 0;
      
      return NextResponse.json({
        text: text.trim() || "No text detected in the image.",
        confidence,
        language: annotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || "en",
        source: "google-cloud-vision"
      });
    }

    // Mock Fallback
    const mockPhrases = [
      "Pharmacy label: Take one tablet by mouth daily in the morning with food. Quantity 30. Prescribed to Alex Smith.",
      "Street Sign: Caution, Pedestrian Crossing Ahead. Speed Limit 25 Miles Per Hour.",
      "Emergency Exit → Please use stairs in case of fire.",
      "Store Flyer: Fresh apples one dollar ninety-nine cents per pound. Organic milk three dollars forty-nine cents.",
    ];

    const randomIndex = Math.floor(Math.random() * mockPhrases.length);
    return NextResponse.json({
      text: mockPhrases[randomIndex],
      confidence: 0.98,
      language: "en",
      source: "mock"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
