import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, applyRateLimitHeaders, getCostCache, setCostCache } from "@/lib/rateLimit";

const CURRENCY_CONTEXTS: Record<string, string[]> = {
  USD: ["usd", "dollar", "dollars", "federal reserve", "united states", "america", "$"],
  EUR: ["eur", "euro", "euros", "bce", "ecb", "€"],
  GBP: ["gbp", "pound", "pounds", "bank of england", "£"],
  PKR: ["pkr", "pakistan", "rupee", "rupees", "state bank", "بینک دولت پاکستان", "حکومت پاکستان", "rs"],
  INR: ["inr", "india", "rupee", "rupees", "reserve bank", "₹"],
};

const BANKNOTE_PATTERNS = [
  // PKR (Ordered by denomination, with landmarks, Urdu words, and Urdu numerals)
  {
    denomination: 5000,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["5000", "five thousand", "پانچ ہزار", "۵۰۰۰", "faisal mosque", "faisal masjid"],
  },
  {
    denomination: 1000,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["1000", "one thousand", "ایک ہزار", "۱۰۰۰", "islamia college"],
  },
  {
    denomination: 500,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["500", "five hundred", "پانچ سو", "۵۰۰", "badshahi mosque", "badshahi"],
  },
  {
    denomination: 100,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["100", "one hundred", "ایک سو", "۱۰۰", "ziarat residency", "ziarat"],
  },
  {
    denomination: 75,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["75", "seventy five", "پچھتر", "۷۵", "commemorative"],
  },
  {
    denomination: 50,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["50", "fifty", "پچاس", "۵۰", "karakoram", "k2"],
  },
  {
    denomination: 20,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["20", "twenty", "بیس", "۲۰", "mohenjo-daro", "mohenjodaro"],
  },
  {
    denomination: 10,
    currency: "PKR",
    symbol: "Rs ",
    keywords: ["10", "ten", "دس", "۱۰", "khyber pass", "khyber"],
  },

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

  // GBP
  { denomination: 50, currency: "GBP", symbol: "£", keywords: ["50", "fifty"] },
  { denomination: 20, currency: "GBP", symbol: "£", keywords: ["20", "twenty"] },
  { denomination: 10, currency: "GBP", symbol: "£", keywords: ["10", "ten"] },
  { denomination: 5, currency: "GBP", symbol: "£", keywords: ["5", "five"] },
];

function parseCurrencyFromText(rawText: string) {
  const text = rawText.toLowerCase();

  // 1. Direct price tag match: e.g. $4.99 or Rs 500 or 20 EUR
  const priceMatch =
    rawText.match(/(\$|€|£|Rs\.?|PKR|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
    rawText.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(usd|eur|gbp|pkr|inr|dollars?|euros?|rupees?)/i);

  // Check currency context
  for (const [curr, indicators] of Object.entries(CURRENCY_CONTEXTS)) {
    const hasContext = indicators.some((ind) => text.includes(ind.toLowerCase()));
    if (hasContext) {
      const candidates = BANKNOTE_PATTERNS.filter((b) => b.currency === curr);
      for (const pattern of candidates) {
        for (const kw of pattern.keywords) {
          // Guard against partial serial number matches if kw is purely digits
          const isNumeric = /^\d+$/.test(kw);
          const regex = isNumeric
            ? new RegExp(`(?<!\\d)${kw}(?!\\d)`)
            : new RegExp(`(?:^|[^a-zA-Z0-9\u0600-\u06FF])${kw}(?:[^a-zA-Z0-9\u0600-\u06FF]|$)`, "i");

          if (regex.test(text)) {
            return {
              type: "banknote",
              denomination: pattern.denomination,
              currency: pattern.currency,
              symbol: pattern.symbol,
              description: `${pattern.symbol}${pattern.denomination} ${pattern.currency} Banknote`,
              visualFeatures: `Matched ${kw} keyword from banknote text`,
              confidence: 0.92,
              rawText: rawText.slice(0, 100),
            };
          }
        }
      }
    }
  }

  if (priceMatch) {
    const val = parseFloat(priceMatch[2] || priceMatch[1]);
    const sym =
      priceMatch[1] === "€"
        ? "€"
        : priceMatch[1] === "£"
        ? "£"
        : priceMatch[1]?.toLowerCase().includes("rs") || priceMatch[1]?.toLowerCase().includes("pkr")
        ? "Rs "
        : "$";
    return {
      type: "product",
      denomination: val,
      currency: sym === "€" ? "EUR" : sym === "£" ? "GBP" : sym === "Rs " ? "PKR" : "USD",
      symbol: sym,
      description: `Scanned Item Price: ${sym}${val.toFixed(2)}`,
      visualFeatures: "Price tag detected",
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

    const cleanedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // SHA-256 hash based cache key to eliminate identical prefix collisions
    const imageHash = crypto.createHash("sha256").update(cleanedBase64).digest("hex");
    const cacheKey = `currency:${imageHash}`;
    const cached = getCostCache<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json({ ...cached, cached: true });
      res.headers.set("X-Cache", "HIT");
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 1: Primary Gemini Multimodal Vision AI
    // ─────────────────────────────────────────────────────────────────────────────
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && cleanedBase64 && cleanedBase64 !== "simulated") {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

        const prompt = `You are an expert currency and price tag recognition system designed for visually impaired and blind users.
Analyze the image to accurately identify any cash banknote, coin, or product price tag.

Pakistani Rupee (PKR) banknotes have distinctive characteristics:
- 10 PKR: Olive green color, Khyber Pass Peshawar on back, Quaid-e-Azam portrait on front, Urdu numeral ۱۰
- 20 PKR: Orange-brown color, Mohenjo-daro Larkana on back, Quaid-e-Azam portrait on front, Urdu numeral ۲۰
- 50 PKR: Purple color, Karakoram K2 peak on back, Quaid-e-Azam portrait on front, Urdu numeral ۵۰
- 75 PKR: Emerald green color, 75 Years Commemorative Note, Urdu numeral ۷۵
- 100 PKR: Red / maroon color, Quaid-e-Azam Residency Ziarat on back, Quaid-e-Azam portrait on front, Urdu numeral ۱۰۰
- 500 PKR: Greenish-tan / rich green-brown color, Badshahi Mosque Lahore on back, Quaid-e-Azam portrait on front, Urdu numeral ۵۰۰
- 1000 PKR: Dark navy blue color, Islamia College Peshawar on back, Quaid-e-Azam portrait on front, Urdu numeral ۱۰۰۰
- 5000 PKR: Mustard yellow / golden brown color, Faisal Mosque Islamabad on back, Quaid-e-Azam portrait on front, Urdu numeral ۵۰۰۰

Also recognize other major currencies:
- US Dollar (USD): $1, $2, $5, $10, $20, $50, $100
- Euro (EUR): €5, €10, €20, €50, €100, €200, €500
- British Pound (GBP): £5, £10, £20, £50
- Indian Rupee (INR), Saudi Riyal (SAR), UAE Dirham (AED), Canadian Dollar (CAD), etc.
- Also detect product price tags or receipt subtotals if visible.

CRITICAL RULES:
- DO NOT default to 100 PKR! Each PKR note has completely different colors and monuments. Inspect the color and landmarks carefully.
- If no banknote, coin, or price tag is clearly visible, or if the image is too blurry/dark to identify with certainty, return "detected": false.
- Never guess 100 PKR when the note is blue (1000 PKR), tan/green (500 PKR), mustard (5000 PKR), purple (50 PKR), brown (20 PKR), or olive (10 PKR).

Return JSON ONLY with this schema:
{
  "detected": true or false,
  "type": "banknote" | "product" | "coin" | "unknown",
  "denomination": number or null,
  "currency": string or null,
  "symbol": string or null,
  "description": string,
  "visualFeatures": string,
  "confidence": number
}`;

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
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.detected && parsed.denomination && typeof parsed.denomination === "number") {
              const defaultSym = parsed.currency === "PKR" ? "Rs " : parsed.currency === "EUR" ? "€" : parsed.currency === "GBP" ? "£" : "$";
              const payload = {
                type: parsed.type || "banknote",
                denomination: parsed.denomination,
                currency: parsed.currency || "PKR",
                symbol: parsed.symbol || defaultSym,
                description: parsed.description || `${parsed.symbol || defaultSym}${parsed.denomination} ${parsed.currency || "PKR"} Banknote`,
                visualFeatures: parsed.visualFeatures || "",
                confidence: parsed.confidence || 0.95,
                source: "gemini-vision",
              };
              setCostCache(cacheKey, payload);
              const res = NextResponse.json(payload);
              res.headers.set("X-Cache", "MISS");
              return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
            }
          }
        }
      } catch (geminiErr) {
        console.warn("[Currency] Gemini Vision error, falling back to OCR:", geminiErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Step 2: Fallback OCR Engine (OCR.space)
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
        console.warn("[Currency] OCR.space fallback failed:", ocrErr);
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
