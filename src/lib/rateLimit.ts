import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const cacheStore = new Map<string, { data: any; expiresAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests/minute per client
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Checks client rate limit and returns remaining quota and reset time.
 */
export function checkRateLimit(req: NextRequest): {
  allowed: boolean;
  remaining: number;
  reset: number;
} {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
  } else {
    record.count += 1;
  }

  rateLimitMap.set(ip, record);

  const remaining = Math.max(0, MAX_REQUESTS - record.count);
  const reset = Math.ceil((record.resetTime - now) / 1000);

  return {
    allowed: record.count <= MAX_REQUESTS,
    remaining,
    reset,
  };
}

/**
 * Attaches standard rate-limiting headers to the Next.js response.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());
  return response;
}

/**
 * In-memory response cache to minimize duplicate Google Cloud API costs.
 */
export function getCostCache<T>(key: string): T | null {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCostCache(key: string, data: any, ttlMs: number = CACHE_TTL_MS): void {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}
