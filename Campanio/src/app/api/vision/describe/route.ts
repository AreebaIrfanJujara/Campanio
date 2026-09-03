import { NextRequest, NextResponse } from "next/server";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rateLimit";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

/** Proxies camera frames to the CV service; client and gateway never receive cloud keys. */
export async function POST(req: NextRequest) {
  const rateStatus = checkRateLimit(req);
  if (!rateStatus.allowed) {
    return applyRateLimitHeaders(NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 }), rateStatus.remaining, rateStatus.reset);
  }

  try {
    const body = await req.json();
    if (typeof body.imageBase64 !== "string" || !body.imageBase64) {
      return applyRateLimitHeaders(NextResponse.json({ error: "Missing imageBase64 in request body" }, { status: 400 }), rateStatus.remaining, rateStatus.reset);
    }

    const serviceResponse = await fetch(`${AI_SERVICE_URL.replace(/\/$/, "")}/vision/describe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: body.imageBase64 }),
      cache: "no-store",
    });
    const payload = await serviceResponse.json().catch(() => ({ detail: "The AI service returned an invalid response." }));
    const response = NextResponse.json(serviceResponse.ok ? payload : { error: payload.detail ?? "Scene analysis is unavailable." }, { status: serviceResponse.status });
    return applyRateLimitHeaders(response, rateStatus.remaining, rateStatus.reset);
  } catch {
    return applyRateLimitHeaders(NextResponse.json({ error: "The vision service is offline. Start services/ai_service before using live scene description." }, { status: 503 }), rateStatus.remaining, rateStatus.reset);
  }
}
