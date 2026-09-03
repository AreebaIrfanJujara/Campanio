/**
 * Spatial Hazard Detection Engine for Companio
 * Classifies surrounding obstacles and generates directional audio & spoken alerts.
 */

export type HazardSeverity = "critical" | "warning" | "caution";

export interface HazardEvaluation {
  hazard: string;
  severity: HazardSeverity;
  alertText: string;
  audioFrequency: number; // in Hz for Web Audio tone
}

const CRITICAL_HAZARDS = [
  "stair",
  "stairs",
  "step down",
  "drop",
  "hole",
  "curb",
  "ledge",
  "traffic",
  "vehicle",
  "car",
  "train",
  "open window",
  "balcony",
];

const WARNING_HAZARDS = [
  "wet floor",
  "slippery",
  "puddle",
  "spill",
  "cable",
  "cord",
  "wire",
  "cone",
  "construction",
  "threshold",
  "pavement crack",
];

const CAUTION_HAZARDS = [
  "chair",
  "box",
  "doorway",
  "low ceiling",
  "hanging branch",
  "table edge",
  "cart",
  "pedestrian",
];

export function detectHazards(
  labels: string[],
  scannedText: string = ""
): HazardEvaluation[] {
  const combined = (labels.join(" ") + " " + scannedText).toLowerCase();
  const evaluations: HazardEvaluation[] = [];

  for (const crit of CRITICAL_HAZARDS) {
    const regex = new RegExp(`\\b${crit}\\b`, "i");
    if (regex.test(combined)) {
      evaluations.push({
        hazard: crit,
        severity: "critical",
        alertText: `Critical: ${crit.toUpperCase()} detected ahead. Please stop and verify your footing.`,
        audioFrequency: 1200,
      });
      break;
    }
  }

  for (const warn of WARNING_HAZARDS) {
    const regex = new RegExp(`\\b${warn}\\b`, "i");
    if (regex.test(combined)) {
      evaluations.push({
        hazard: warn,
        severity: "warning",
        alertText: `Warning: ${warn} in your direct walking path.`,
        audioFrequency: 880,
      });
      break;
    }
  }

  for (const caut of CAUTION_HAZARDS) {
    const regex = new RegExp(`\\b${caut}\\b`, "i");
    if (regex.test(combined)) {
      evaluations.push({
        hazard: caut,
        severity: "caution",
        alertText: `Caution: ${caut} nearby.`,
        audioFrequency: 600,
      });
      break;
    }
  }

  return evaluations;
}

/**
 * Plays a distinct directional acoustic alert for detected hazards.
 */
export function playHazardAcousticAlert(frequency: number = 880): void {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = frequency > 1000 ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    osc.frequency.setValueAtTime(frequency * 0.8, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    console.error("Audio alert error", e);
  }
}
