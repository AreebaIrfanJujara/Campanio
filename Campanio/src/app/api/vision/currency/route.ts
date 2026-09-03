import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, applyRateLimitHeaders, getCostCache, setCostCache } from "@/lib/rateLimit";

interface BanknotePattern {
  denomination: number;
  currency: string;
  symbol: string;
  keywords: string[];
}

const BANKNOTE_PATTERNS: BanknotePattern[] = [
  // US Dollars
  { denomination: 100, currency: "USD", symbol: "$", keywords: ["100", "one hundred", "franklin"] },
  { denomination: 50, currency: "USD", symbol: "$", keywords: ["50", "fifty", "grant"] },
  { denomination: 20, currency: "USD", symbol: "$", keywords: ["20", "twenty", "jackson"] },
  { denomination: 10, currency: "USD", symbol: "$", keywords: ["10", "ten", "hamilton"] },
  { denomination: 5, currency: "USD", symbol: "$", keywords: ["5", "five", "lincoln"] },
  { denomination: 1, currency: "USD", symbol: "$", keywords: ["1", "one dollar", "washington"] },
  // Euros
  { denomination: 50, currency: "EUR", symbol: "€", keywords: ["50 euro", "50 eur"] },
  { denomination: 20, currency: "EUR", symbol: "€", keywords: ["20 euro", "20 eur"] },
  { denomination: 10, currency: "EUR", symbol: "€", keywords: ["10 euro", "10 eur"] },
  { denomination: 5, currency: "EUR", symbol: "€", keywords: ["5 euro", "5 eur"] },
  // Pakistani Rupee
  { denomination: 1000, currency: "PKR", symbol: "Rs", keywords: ["1000", "one thousand rupee", "state bank of pakistan"] },
  { denomination: 500, currency: "PKR", symbol: "Rs", keywords: ["500", "five hundred rupee"] },
  { denomination: 100, currency: "PKR", symbol: "Rs", keywords: ["100 rupee", "one hundred rupee"] },
];

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
      const res = NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const cacheKey = `currency:${imageBase64.slice(0, 80)}`;
    const cached = getCostCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json({ ...cached, cached: true });
      res.headers.set("X-Cache", "HIT");
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    if (apiKey) {
      const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleaned },
              features: [
                { type: "TEXT_DETECTION" },
                { type: "OBJECT_LOCALIZATION" },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const fullText = (data.responses?.[0]?.fullTextAnnotation?.text || "").toLowerCase();
        
        for (const pattern of BANKNOTE_PATTERNS) {
          for (const kw of pattern.keywords) {
            if (fullText.includes(kw)) {
              const payload = {
                type: "banknote",
                denomination: pattern.denomination,
                currency: pattern.currency,
                symbol: pattern.symbol,
                description: `${pattern.symbol}${pattern.denomination} ${pattern.currency} Banknote`,
                confidence: 0.94,
                rawText: fullText.slice(0, 100),
                source: "google-cloud-vision",
              };
              setCostCache(cacheKey, payload);
              const res = NextResponse.json(payload);
              return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
            }
          }
        }
      }
    }

    // Default simulation banknote detection
    const mockNotes = [
      { type: "banknote", denomination: 20, currency: "USD", symbol: "$", description: "$20 US Dollar Banknote", confidence: 0.92 },
      { type: "banknote", denomination: 50, currency: "USD", symbol: "$", description: "$50 US Dollar Banknote", confidence: 0.95 },
      { type: "product", denomination: 3.49, currency: "USD", symbol: "$", description: "Organic Whole Milk (1 Gallon)", confidence: 0.89 },
      { type: "banknote", denomination: 100, currency: "USD", symbol: "$", description: "$100 US Dollar Banknote", confidence: 0.98 },
    ];
    const item = mockNotes[Math.floor(Math.random() * mockNotes.length)];

    const payload = {
      ...item,
      source: "currency-scanner-sim",
    };
    const res = NextResponse.json(payload);
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
