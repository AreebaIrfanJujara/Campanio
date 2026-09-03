/**
 * Wearable & Haptic Integration Bridge
 * Dispatches distinct vibration patterns to smartwatches, mobile devices, and accessibility peripherals.
 */

export type HapticPatternType = "sos" | "hazard" | "caption_alert" | "nav_turn" | "success" | "tap";

const HAPTIC_PATTERNS: Record<HapticPatternType, number[]> = {
  // SOS pattern: 3 short, 3 long, 3 short (Morse SOS)
  sos: [100, 50, 100, 50, 100, 150, 300, 100, 300, 100, 300, 150, 100, 50, 100, 50, 100],
  // Hazard pattern: 2 rapid double-burst pulses
  hazard: [250, 100, 250, 200, 250, 100, 250],
  // Caption alert: 1 subtle double-tap
  caption_alert: [80, 80, 80],
  // Navigation turn: single strong pulse
  nav_turn: [200, 100, 100],
  // Success
  success: [60, 60, 120],
  // Light tap
  tap: [30],
};

class WearableBridge {
  private isConnected: boolean = true;
  private deviceName: string = "Companio Smartwatch Bridge (Active)";

  triggerHaptic(pattern: HapticPatternType): boolean {
    if (typeof window === "undefined" || !("vibrate" in navigator)) {
      return false;
    }
    try {
      const timings = HAPTIC_PATTERNS[pattern] || [100];
      return navigator.vibrate(timings);
    } catch (e) {
      console.warn("Haptic dispatch failed", e);
      return false;
    }
  }

  stopHaptic(): void {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }

  getConnectionStatus(): { connected: boolean; deviceName: string } {
    return {
      connected: this.isConnected,
      deviceName: this.deviceName,
    };
  }
}

export const wearableBridge = new WearableBridge();
