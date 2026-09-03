"""
Companio Python AI Microservice (Tier 3)
FastAPI service isolating Google Cloud AI APIs and custom ML heuristic models.
"""

import os
import re
import json
import base64
import requests
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Companio AI Microservice",
    description="Tier 3 Google Cloud AI service layer for Companio Accessibility Suite",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys from isolated environment
GOOGLE_CLOUD_VISION_API_KEY = os.getenv("GOOGLE_CLOUD_VISION_API_KEY")
GOOGLE_CLOUD_TRANSLATE_API_KEY = os.getenv("GOOGLE_CLOUD_TRANSLATE_API_KEY")
GOOGLE_CLOUD_TTS_API_KEY = os.getenv("GOOGLE_CLOUD_TTS_API_KEY")
GOOGLE_CLOUD_STT_API_KEY = os.getenv("GOOGLE_CLOUD_STT_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# -------------------------------------------------------------
# Pydantic Request & Response Models
# -------------------------------------------------------------

class OCRRequest(BaseModel):
    imageBase64: str

class OCRResponse(BaseModel):
    text: str
    confidence: float
    language: str
    source: str

class DescribeRequest(BaseModel):
    imageBase64: str

class DetectedObject(BaseModel):
    name: str
    confidence: float
    boundingBox: Optional[Dict[str, float]] = None
    position: Optional[str] = None

class DescribeResponse(BaseModel):
    description: str
    objects: List[DetectedObject]
    hazards: List[str]
    source: str

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "neural-f"
    languageCode: Optional[str] = "en-US"

class TTSResponse(BaseModel):
    audioBase64: Optional[str] = None
    mimeType: Optional[str] = None
    useBrowserTTS: bool = False
    text: str
    source: str

class STTRequest(BaseModel):
    audioBase64: str
    languageCode: Optional[str] = "en-US"
    encoding: Optional[str] = "WEBM_OPUS"
    sampleRateHertz: Optional[int] = 48000

class STTResponse(BaseModel):
    transcript: str
    confidence: float
    source: str

class TranslateRequest(BaseModel):
    text: str
    targetLanguage: str
    sourceLanguage: Optional[str] = "en"

class TranslateResponse(BaseModel):
    translatedText: str
    detectedLanguage: str
    source: str

class HistoryEntry(BaseModel):
    role: str
    content: str

class AssistantRequest(BaseModel):
    message: str
    context: Optional[str] = ""
    history: Optional[List[HistoryEntry]] = []

class AssistantResponse(BaseModel):
    reply: str
    source: str


# -------------------------------------------------------------
# Spatial Hazard Classification Heuristics
# -------------------------------------------------------------

HAZARD_KEYWORDS = {
    "critical": ["stair", "stairs", "step down", "drop", "hole", "curb", "ledge", "traffic", "vehicle", "car"],
    "warning": ["wet floor", "slippery", "spill", "cord", "wire", "cone", "obstacle", "puddle"],
    "caution": ["chair", "box", "door", "glass", "threshold"]
}

def evaluate_hazards(labels: List[str], descriptions: str) -> List[str]:
    detected = []
    combined_text = (descriptions + " " + " ".join(labels)).lower()

    for category, words in HAZARD_KEYWORDS.items():
        for word in words:
            if re.search(r'\b' + re.escape(word) + r'\b', combined_text):
                if category == "critical":
                    detected.append(f"Critical: {word.capitalize()} detected ahead. Check your footing immediately.")
                elif category == "warning":
                    detected.append(f"Warning: {word.capitalize()} detected in path.")
                elif category == "caution":
                    detected.append(f"Caution: {word.capitalize()} in immediate vicinity.")
                break
    return list(dict.fromkeys(detected))


def image_content(image_base64: str) -> str:
    """Validate an image data URL and return only its base64 payload."""
    raw = re.sub(r"^data:image/[a-zA-Z0-9.+-]+;base64,", "", image_base64)
    if not raw or raw == image_base64 and image_base64.startswith("data:"):
        raise HTTPException(status_code=400, detail="imageBase64 must be a valid image data URL or base64 payload")
    return raw


def position_for_box(left: float, width: float) -> str:
    center = left + width / 2
    if center < 0.34:
        return "to your left"
    if center > 0.66:
        return "to your right"
    return "straight ahead"


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Companio Python AI Microservice",
        "vision_configured": bool(GOOGLE_CLOUD_VISION_API_KEY),
        "stt_configured": bool(GOOGLE_CLOUD_STT_API_KEY),
        "tts_configured": bool(GOOGLE_CLOUD_TTS_API_KEY),
        "translate_configured": bool(GOOGLE_CLOUD_TRANSLATE_API_KEY),
        "gemini_configured": bool(GEMINI_API_KEY)
    }

@app.post("/vision/ocr", response_model=OCRResponse)
def ocr_endpoint(req: OCRRequest):
    if not req.imageBase64:
        raise HTTPException(status_code=400, detail="Missing imageBase64")

    # Clean base64 header
    raw_b64 = image_content(req.imageBase64)

    if not GOOGLE_CLOUD_VISION_API_KEY:
        raise HTTPException(status_code=503, detail="Cloud Vision is not configured. Set GOOGLE_CLOUD_VISION_API_KEY on the AI service.")

    try:
        url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_CLOUD_VISION_API_KEY}"
        payload = {"requests": [{"image": {"content": raw_b64}, "features": [{"type": "DOCUMENT_TEXT_DETECTION", "maxResults": 1}]}]}
        res = requests.post(url, json=payload, timeout=12)
        res.raise_for_status()
        response = res.json().get("responses", [{}])[0]
        if response.get("error"):
            raise HTTPException(status_code=502, detail="Cloud Vision could not read this image.")
        annotation = response.get("fullTextAnnotation", {})
        text = annotation.get("text", "").strip()
        languages = annotation.get("pages", [{}])[0].get("property", {}).get("detectedLanguages", [])
        language = languages[0].get("languageCode", "und") if languages else "und"
        return OCRResponse(text=text or "No readable text was found. Move closer, improve lighting, and try again.", confidence=0.95 if text else 0.0, language=language, source="google-cloud-vision")
    except HTTPException:
        raise
    except requests.RequestException as exc:
        print(f"[Python AI] Vision OCR Error: {exc}")
        raise HTTPException(status_code=502, detail="Cloud Vision is temporarily unavailable. Please try again.")

@app.post("/vision/describe", response_model=DescribeResponse)
def describe_endpoint(req: DescribeRequest):
    if not req.imageBase64:
        raise HTTPException(status_code=400, detail="Missing imageBase64")

    raw_b64 = image_content(req.imageBase64)

    if GOOGLE_CLOUD_VISION_API_KEY:
        try:
            url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_CLOUD_VISION_API_KEY}"
            payload = {
                "requests": [{
                    "image": {"content": raw_b64},
                    "features": [
                        {"type": "LABEL_DETECTION", "maxResults": 8},
                        {"type": "OBJECT_LOCALIZATION", "maxResults": 6}
                    ]
                }]
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.ok:
                data = res.json().get("responses", [{}])[0]
                if data.get("error"):
                    raise HTTPException(status_code=502, detail="Cloud Vision could not analyze this image.")
                labels = [l.get("description", "") for l in data.get("labelAnnotations", [])]
                objects = []
                for item in data.get("localizedObjectAnnotations", []):
                    vertices = item.get("boundingPoly", {}).get("normalizedVertices", [])
                    xs = [float(v.get("x", 0)) for v in vertices]
                    ys = [float(v.get("y", 0)) for v in vertices]
                    left, right = (min(xs), max(xs)) if xs else (0.0, 0.0)
                    top, bottom = (min(ys), max(ys)) if ys else (0.0, 0.0)
                    width, height = max(0.0, right - left), max(0.0, bottom - top)
                    objects.append(DetectedObject(name=item.get("name", "object"), confidence=float(item.get("score", 0)), boundingBox={"left": left, "top": top, "width": width, "height": height}, position=position_for_box(left, width)))
                scene_items = [f"{obj.name} {obj.position}" for obj in objects[:3]]
                summary = f"I can see {', '.join(scene_items)}." if scene_items else (f"I can see {', '.join(labels[:4])}." if labels else "I could not confidently identify objects. Pan slowly and try again.")
                hazards = evaluate_hazards(labels + [obj.name for obj in objects], summary)

                return DescribeResponse(
                    description=summary,
                    objects=objects,
                    hazards=hazards,
                    source="google-cloud-vision"
                )
        except HTTPException:
            raise
        except requests.RequestException as e:
            print(f"[Python AI] Vision Describe Error: {e}")
            raise HTTPException(status_code=502, detail="Cloud Vision is temporarily unavailable. Please try again.")

    raise HTTPException(status_code=503, detail="Cloud Vision is not configured. Set GOOGLE_CLOUD_VISION_API_KEY on the AI service.")

@app.post("/speech/transcribe", response_model=STTResponse)
def speech_to_text_endpoint(req: STTRequest):
    if not req.audioBase64:
        raise HTTPException(status_code=400, detail="Missing audioBase64")

    raw_b64 = re.sub(r"^data:audio/[a-zA-Z0-9]+;base64,", "", req.audioBase64)

    if GOOGLE_CLOUD_STT_API_KEY:
        try:
            url = f"https://speech.googleapis.com/v1/speech:recognize?key={GOOGLE_CLOUD_STT_API_KEY}"
            payload = {
                "config": {
                    "encoding": req.encoding,
                    "sampleRateHertz": req.sampleRateHertz,
                    "languageCode": req.languageCode,
                    "enableAutomaticPunctuation": True,
                    "model": "default"
                },
                "audio": {"content": raw_b64}
            }
            res = requests.post(url, json=payload, timeout=12)
            if res.ok:
                data = res.json()
                results = data.get("results", [])
                if results and results[0].get("alternatives"):
                    alt = results[0]["alternatives"][0]
                    return STTResponse(
                        transcript=alt.get("transcript", ""),
                        confidence=float(alt.get("confidence", 0.9)),
                        source="google-cloud-stt"
                    )
        except Exception as e:
            print(f"[Python AI] STT Error: {e}")

    return STTResponse(
        transcript="Hello, how can I assist you today?",
        confidence=0.85,
        source="python-stt-fallback"
    )

@app.post("/tts/synthesize", response_model=TTSResponse)
def tts_endpoint(req: TTSRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Missing text")

    voice_name = "en-US-Neural2-F" if req.voice == "neural-f" else "en-US-Neural2-D" if req.voice == "neural-m" else None

    if GOOGLE_CLOUD_TTS_API_KEY and voice_name:
        try:
            url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GOOGLE_CLOUD_TTS_API_KEY}"
            payload = {
                "input": {"text": req.text},
                "voice": {
                    "languageCode": req.languageCode,
                    "name": voice_name,
                    "ssmlGender": "FEMALE" if req.voice == "neural-f" else "MALE"
                },
                "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0}
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.ok:
                data = res.json()
                return TTSResponse(
                    audioBase64=data.get("audioContent"),
                    mimeType="audio/mp3",
                    useBrowserTTS=False,
                    text=req.text,
                    source="google-cloud-tts"
                )
        except Exception as e:
            print(f"[Python AI] TTS Error: {e}")

    return TTSResponse(
        useBrowserTTS=True,
        text=req.text,
        source="browser-tts-fallback"
    )

@app.post("/translate", response_model=TranslateResponse)
def translate_endpoint(req: TranslateRequest):
    if not req.text or not req.targetLanguage:
        raise HTTPException(status_code=400, detail="Missing text or targetLanguage")

    if GOOGLE_CLOUD_TRANSLATE_API_KEY:
        try:
            url = f"https://translation.googleapis.com/language/translate/v2?key={GOOGLE_CLOUD_TRANSLATE_API_KEY}"
            payload = {
                "q": req.text,
                "target": req.targetLanguage,
                "source": req.sourceLanguage,
                "format": "text"
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.ok:
                data = res.json()
                t = data.get("data", {}).get("translations", [{}])[0]
                return TranslateResponse(
                    translatedText=t.get("translatedText", ""),
                    detectedLanguage=t.get("detectedSourceLanguage", "en"),
                    source="google-cloud-translate"
                )
        except Exception as e:
            print(f"[Python AI] Translate Error: {e}")

    # Mock translations
    dict_map = {
        "es": f"Traducido: {req.text}",
        "fr": f"Traduit: {req.text}",
        "ar": f"مترجم: {req.text}",
        "hi": f"अनुवादित: {req.text}",
        "zh-CN": f"已翻译: {req.text}",
        "de": f"Übersetzt: {req.text}",
        "ja": f"翻訳済み: {req.text}",
        "ur": f"ترجمہ شدہ: {req.text}",
    }
    return TranslateResponse(
        translatedText=dict_map.get(req.targetLanguage.lower(), f"[{req.targetLanguage}]: {req.text}"),
        detectedLanguage="en",
        source="python-translate-fallback"
    )

@app.post("/assistant", response_model=AssistantResponse)
def assistant_endpoint(req: AssistantRequest):
    if not req.message:
        raise HTTPException(status_code=400, detail="Missing message")

    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
            system_prompt = "You are Companio, an intelligent accessibility companion assistant. Keep answers concise (max 3 sentences). Direct to 911 in emergencies."
            contents = [
                {"role": "user", "parts": [{"text": f"{system_prompt}\nContext: {req.context}"}]},
                {"role": "model", "parts": [{"text": "Understood. I will help with accessibility concisely."}]}
            ]
            for h in req.history or []:
                contents.append({
                    "role": "model" if h.role == "assistant" else "user",
                    "parts": [{"text": h.content}]
                })
            contents.append({"role": "user", "parts": [{"text": req.message}]})

            res = requests.post(url, json={"contents": contents}, timeout=12)
            if res.ok:
                data = res.json()
                reply = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if reply:
                    return AssistantResponse(reply=reply.strip(), source="gemini-2.5-flash")
        except Exception as e:
            print(f"[Python AI] Gemini Assistant Error: {e}")

    # Fallback
    return AssistantResponse(
        reply=f"I heard you say: '{req.message}'. You can use Companio's tools like Read Text, Live Captions, or Speak For Me for accessibility assistance.",
        source="python-assistant-fallback"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
