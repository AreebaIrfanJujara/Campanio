/**
 * Shared High-Performance Web Audio Manager
 * Eliminates garbage-collection pauses and AudioContext leaks
 */

let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (err) {
    console.warn("Shared AudioContext init error:", err);
    return null;
  }
}

/**
 * Play a fast feedback tone with zero garbage collection overhead
 */
export function playTone(frequency = 600, duration = 0.15, type: OscillatorType = "sine", gainValue = 0.25): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn("playTone error:", err);
  }
}

/**
 * Play an urgent dual-frequency hazard warning tone
 */
export function playHazardAlarm(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(440, now + 0.12);
    osc.frequency.setValueAtTime(880, now + 0.24);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.38);
  } catch (err) {
    console.warn("playHazardAlarm error:", err);
  }
}

let activeAudioSource: AudioBufferSourceNode | null = null;

/**
 * Stop any active WebAudio sound stream
 */
export function stopAudioData(): void {
  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
      activeAudioSource.disconnect();
    } catch {}
    activeAudioSource = null;
  }
}

/**
 * Play audio from base64 data URI or ArrayBuffer via WebAudio
 * Bypasses mobile HTML5 audio autoplay restrictions
 */
export async function playAudioData(
  audioData: string | ArrayBuffer,
  onEnd?: () => void
): Promise<boolean> {
  const ctx = getSharedAudioContext();
  if (!ctx) return false;

  try {
    stopAudioData();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    let arrayBuffer: ArrayBuffer;
    if (typeof audioData === "string") {
      // Clean data URI prefix if present
      const base64 = audioData.includes(",") ? audioData.split(",")[1] : audioData;
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      arrayBuffer = audioData;
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    activeAudioSource = source;

    source.onended = () => {
      if (activeAudioSource === source) {
        activeAudioSource = null;
      }
      onEnd?.();
    };

    source.start(0);
    return true;
  } catch (err) {
    console.warn("playAudioData WebAudio error:", err);
    return false;
  }
}

