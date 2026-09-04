export const REAL_SOURCES = ["gemini-vision", "ocr-space", "google-cloud-vision"];

export function getSourceLabel(
  source: string,
  actionType: "ocr" | "scene" = "ocr"
): { badge: string; toast: string } {
  const actionVerb = actionType === "scene" ? "Scene analyzed" : "Text scanned";

  if (REAL_SOURCES.includes(source)) {
    const engineNames: Record<string, string> = {
      "gemini-vision": "Gemini AI",
      "ocr-space": "OCR.space",
      "google-cloud-vision": "Vision API",
    };
    const name = engineNames[source] || "Live API";
    return {
      badge: name,
      toast: `${actionVerb} (${name})`,
    };
  }

  // covers "mock", "mock-fallback", "client-fallback", "offline-local", and anything else
  return {
    badge: "Demo",
    toast: `${actionVerb} (demo mode)`,
  };
}
