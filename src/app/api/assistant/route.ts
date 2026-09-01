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
    const { message, context = "", history = [] } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!message) {
      const res = NextResponse.json({ error: "Missing message in request body" }, { status: 400 });
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const cacheKey = `assistant:${message.trim().toLowerCase()}`;
    const cached = getCostCache<any>(cacheKey);
    if (cached && (!history || history.length === 0)) {
      const res = NextResponse.json({ ...cached, cached: true });
      res.headers.set('X-Cache', 'HIT');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    const systemInstruction = "You are Companio, an intelligent accessibility companion assistant. You help people with disabilities (visual, hearing, speech, motor, cognitive) understand their surroundings. Answer questions about what the user can see or hear based on the context. Keep your responses very concise (maximum 3 sentences). Never give medical or emergency response advice beyond directing to call for help.";

    if (apiKey) {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const contents: Array<{role: string; parts: Array<{text: string}>}> = [];
      
      contents.push({
        role: "user",
        parts: [{ text: systemInstruction + "\n\nContext details of what user currently sees/hears: " + context }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I am Companio, your accessibility assistant. I will help you understand your surroundings and answer questions concisely." }]
      });

      if (history && history.length > 0) {
        for (const entry of history) {
          contents.push({
            role: entry.role === "assistant" ? "model" : "user",
            parts: [{ text: entry.content }]
          });
        }
      } else {
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });
      }

      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const res = NextResponse.json({ error: `Gemini API error: ${errorText}` }, { status: 500 });
        return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that request.";

      const payload = {
        reply: reply.trim(),
        source: "gemini-api"
      };

      setCostCache(cacheKey, payload);

      const res = NextResponse.json(payload);
      res.headers.set('X-Cache', 'MISS');
      return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
    }

    // Smart Mock responses
    let reply = `I heard you say: "${message}". How can I assist you with your accessibility options?`;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("contrast") || lowerMessage.includes("theme") || lowerMessage.includes("black")) {
      reply = "High contrast mode is designed for extreme legibility. You can enable it by pressing the visibility eye icon in the top right corner of the header or in Settings.";
    } else if (lowerMessage.includes("settings") || lowerMessage.includes("preferences")) {
      reply = "To open Settings, click the gear icon on the bottom right of the navigation bar. There, you can adjust speech rates and preset profiles.";
    } else if (lowerMessage.includes("camera") || lowerMessage.includes("describe") || lowerMessage.includes("ocr") || lowerMessage.includes("see")) {
      reply = "You can open OCR text reading or live room narration from the Home page bento grid, or do a slow explore scan.";
    } else if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      reply = "Hello! I am Companio, your accessibility assistant. How can I help you today?";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("emergency") || lowerMessage.includes("doctor")) {
      reply = "If this is an emergency, please contact 911 or emergency services immediately. Let me know if you would like me to announce your location.";
    }

    const res = NextResponse.json({
      reply,
      source: "mock"
    });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rateStatus.remaining, rateStatus.reset);
  }
}
