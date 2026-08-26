import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, languageCode = 'en-US' } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

    if (!text) {
      return NextResponse.json({ error: "Missing text in request body" }, { status: 400 });
    }

    if (apiKey) {
      const ttsEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      const response = await fetch(ttsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voice || `${languageCode}-Neural2-F`
          },
          audioConfig: {
            audioEncoding: "MP3"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `TTS API error: ${errorText}` }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json({
        audioBase64: data.audioContent,
        mimeType: "audio/mp3",
        source: "google-cloud-tts"
      });
    }

    // Default to telling browser to use native Web Speech Synthesis API
    return NextResponse.json({
      useBrowserTTS: true,
      text,
      source: "fallback-browser"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
