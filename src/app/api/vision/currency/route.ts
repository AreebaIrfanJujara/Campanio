import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, applyRateLimitHeaders, getCostCache, setCostCache } from "@/lib/rateLimit";

const CURRENCY_CONTEXTS: Record<string, string[]> = {
  USD: ["usd", "dollar", "dollars", "federal reserve", "united states", "america", "$"],
  EUR: ["eur", "euro", "euros", "bce", "ecb", "€"],
  GBP: ["gbp", "pound", "pounds", "bank of england", "£"],
  PKR: ["pkr", "pakistan", "rupee", "rupees", "state bank", "rs"],
  INR: ["inr", "india", "rupee", "rupees", "reserve bank", "₹"],
};

const BANKNOTE_PATTERNS = [
  // USD
  { denomination: 100, currency: "USD", symbol: "$", keywords: ["100", "one hundred", "franklin"] },
  { denomination: 50, currency: "USD", symbol: "$", keywords: ["50", "fifty", "grant"] },
  { denomination: 20, currency: "USD", symbol: "$", keywords: ["20", "twenty", "jackson"] },
  { denomination: 10, currency: "USD", symbol: "$", keywords: ["10", "ten", "hamilton"] },
  { denomination: 5, currency: "USD", symbol: "$", keywords: ["5", "five", "lincoln"] },
  { denomination: 1, currency: "USD", symbol: "$", keywords: ["1", "one dollar", "washington"] },

  // EUR
  { denomination: 500, currency: "EUR", symbol: "€", keywords: ["500", "five hundred"] },
  { denomination: 200, currency: "EUR", symbol: "€", keywords: ["200", "two hundred"] },
  { denomination: 100, currency: "EUR", symbol: "€", keywords: ["100", "one hundred"] },
  { denomination: 50, currency: "EUR", symbol: "€", keywords: ["50", "fifty"] },
  { denomination: 20, currency: "EUR", symbol: "€", keywords: ["20", "twenty"] },
  { denomination: 10, currency: "EUR", symbol: "€", keywords: ["10", "ten"] },
  { denomination: 5, currency: "EUR", symbol: "€", keywords: ["5", "five"] },

  // PKR
  { denomination: 5000, currency: "PKR", symbol: "Rs ", keywords: ["5000", "five thousand"] },
  { denomination: 1000, currency: "PKR", symbol: "Rs ", keywords: ["1000", "one thousand"] },
  { denomination: 500, currency: "PKR", symbol: "Rs ", keywords: ["500", "five hundred"] },
  { denomination: 100, currency: "PKR", symbol: "Rs ", keywords: ["100", "one hundred"] },
  { denomination: 75, currency: "PKR", symbol: "Rs ", keywords: ["75", "seventy five"] },
  { denomination: 50, currency: "PKR", symbol: "Rs ", keywords: ["50", "fifty"] },
  { denomination: 20, currency: "PKR", symbol: "Rs ", keywords: ["20", "twenty"] },
  { denomination: 10, currency: "PKR", symbol: "Rs ", keywords: ["10", "ten"] },

  // GBP
  { denomination: 50, currency: "GBP", symbol: "£", keywords: ["50", "fifty"] },
  { denomination: 20, currency: "GBP", symbol: "£", keywords: ["20", "twenty"] },
  { denomination: 10, currency: "GBP", symbol: "£", keywords: ["10", "ten"] },
  { denomination: 5, currency: "GBP", symbol: "£", keywords: ["5", "five"] },
];

function parseCurrencyFromText(rawText: string) {
  const text = rawText.toLowerCase();

  // 1. Direct price tag match: e.g. $4.99 or Rs 500 or 20 EUR
  const priceMatch = rawText.match(/(\$|€|£|Rs\.?|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                     rawText.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(usd|eur|gbp|pkr|inr|dollars?|euros?|rupees?)/i);

  // Check which currency context is present
  for (const [curr, indicators] of Object.entries(CURRENCY_CONTEXTS)) {
    const hasContext = indicators.some((ind) => text.includes(ind));
    if (hasContext) {
      const candidates = BANKNOTE_PATTERNS.filter((b) => b.currency === curr);
      for (const pattern of candidates) {
        for (const kw of pattern.keywords) {
          const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${kw}(?:[^a-zA-Z0-9]|$)`, "i");
          if (regex.test(text)) {
            return {
              type: "banknote",
              denomination: pattern.denomination,
              currency: pattern.currency,
              symbol: pattern.symbol,
              description: `${pattern.symbol}${pattern.denomination} ${pattern.currency} Banknote`,
              confidence: 0.94,
              rawText: rawText.slice(0, 100),
            };
          }
        }
      }
    }
  }

  if (priceMatch) {
    const val = parseFloat(priceMatch[2] || priceMatch[1]);
    const sym = priceMatch[1] === "€" ? "€" : priceMatch[1] === "£" ? "£" : (priceMatch[1]?.toLowerCase().includes("rs") ? "Rs " : "$");
    return {
      type: "product",
      denomination: val,
      currency: sym === "€" ? "EUR" : sym === "£" ? "GBP" : sym === "Rs " ? "PKR" : "USD",
      symbol: sym,
      description: `Scanned Item Price: ${sym}${val.toFixed(2)}`,
      confidence: 0.88,
      rawText: rawText.slice(0, 100),
    };
  }

  return null;
}

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

    const cleanedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 1: Real Live OCR-based Banknote & Price Detection (OCR.space Engine)
    // ─────────────────────────────────────────────────────────────────────────────
    if (cleanedBase64 && cleanedBase64 !== "simulated") {
      try {
        const ocrSpaceApiKey = process.env.OCR_SPACE_API_KEY || "helloworld";
        const params = new URLSearchParams();
        params.append("apikey", ocrSpaceApiKey);
        params.append("base64Image", `data:image/jpeg;base64,${cleanedBase64}`);
        params.append("filetype", "JPG");
        params.append("language", "eng");
        params.append("isOverlayRequired", "false");
        params.append("OCREngine", "2");

        const ocrRes = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          const parsedText = ocrData.ParsedResults?.[0]?.ParsedText;
          if (parsedText && typeof parsedText === "string") {
            const detectedItem = parseCurrencyFromText(parsedText);
            if (detectedItem) {
              const payload = {
                ...detectedItem,
                source: "ocr-space",
              };
              setCostCache(cacheKey, payload);
              const res = NextResponse.json(payload);
              res.headers.set("X-Cache", "MISS");
              return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
            }
          }
        }
      } catch (ocrErr) {
        console.warn("[Currency] OCR.space extraction failed, falling through:", ocrErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 2: Google Cloud Vision (Optional fallback)
    // ─────────────────────────────────────────────────────────────────────────────
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (apiKey && cleanedBase64 && cleanedBase64 !== "simulated") {
      try {
        const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: cleanedBase64 },
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
          const fullText = (data.responses?.[0]?.fullTextAnnotation?.text || "");
          const detected = parseCurrencyFromText(fullText);
          if (detected) {
            const payload = {
              ...detected,
              source: "google-cloud-vision",
            };
            setCostCache(cacheKey, payload);
            const res = NextResponse.json(payload);
            res.headers.set("X-Cache", "MISS");
            return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
          }
        }
      } catch (gcvErr) {
        console.warn("[Currency] Google Cloud Vision failed, falling through:", gcvErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Final: No currency text detected in image
    // ─────────────────────────────────────────────────────────────────────────────
    const res = NextResponse.json({
      error: "No banknote or price detected in image.",
      denomination: null,
      source: "none",
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
