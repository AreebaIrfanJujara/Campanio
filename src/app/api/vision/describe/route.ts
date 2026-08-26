import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64 in request body" }, { status: 400 });
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
        return NextResponse.json({ error: `Vision API error: ${errorText}` }, { status: 500 });
      }

      const data = await response.json();
      const responseObj = data.responses?.[0];
      
      const labels = responseObj?.labelAnnotations || [];
      const localizedObjects = responseObj?.localizedObjectAnnotations || [];

      // Generate a descriptive sentence based on labels
      const objectsDetected = localizedObjects.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score,
        box: obj.boundingPoly
      }));

      const topLabels = labels.slice(0, 5).map((l: any) => l.description.toLowerCase());
      let description = "I see a scene with " + (topLabels.join(", ") || "various objects") + ".";
      
      // Look for obstacles
      const hazards: string[] = [];
      const hazardKeywords = ["stair", "curb", "hole", "ledge", "drop", "step"];
      topLabels.forEach((label: string) => {
        if (hazardKeywords.some(keyword => label.includes(keyword))) {
          hazards.push(`Potential elevation change or step detected: ${label}`);
        }
      });

      return NextResponse.json({
        description,
        objects: objectsDetected.map((o: any) => ({ name: o.name, confidence: o.confidence })),
        hazards,
        source: "google-cloud-vision"
      });
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
        hazards: ["staircase / step down ahead"]
      }
    ];

    const randomIndex = Math.floor(Math.random() * mockScenes.length);
    return NextResponse.json({
      ...mockScenes[randomIndex],
      source: "mock"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
