"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { wearableBridge } from "@/lib/wearableBridge";
import { useToast } from "@/context/ToastContext";

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: "Emergency Caregiver (Mom)", phone: "+15550192834", relation: "Primary" },
  { name: "Support Services", phone: "911", relation: "Dispatch" },
];

export default function EmergencyPage() {
  const { speak } = useAccessibility();
  const { addToast } = useToast();

  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locating, setLocating] = useState(true);
  const [isEstimatedLocation, setIsEstimatedLocation] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [strobeActive, setStrobeActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // stopSiren is declared before useEffect to avoid hoisting issues
  const stopSiren = useCallback(() => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch { /* already stopped */ }
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch { /* already closed */ }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    speak("Emergency Assistance Center opened. Determining your current GPS coordinates.", true);
    wearableBridge.triggerHaptic("sos");

    const fallbackLocation = {
      lat: 0,
      lng: 0,
      address: "Location unavailable — GPS permission denied or not supported",
    };

    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const address = `Approx. Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocation({ lat, lng, address });
          setIsEstimatedLocation(false);
          setLocating(false);
          speak(`Location acquired. ${address}`, true);
        },
        (err) => {
          console.warn("Geolocation acquisition failed:", err);
          setLocation(fallbackLocation);
          setIsEstimatedLocation(true);
          setLocating(false);
          speak("Warning. Your exact location could not be determined. Please state your location verbally if you can.", true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      // Microtask to avoid synchronous setState inside effect
      Promise.resolve().then(() => {
        setLocation(fallbackLocation);
        setIsEstimatedLocation(true);
        setLocating(false);
        speak("Warning. Your exact location could not be determined. Please state your location verbally if you can.", true);
      });
    }

    return () => {
      stopSiren();
    };
  }, [speak, stopSiren]);

  const startSiren = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      const now = ctx.currentTime;
      for (let i = 0; i < 20; i++) {
        osc.frequency.linearRampToValueAtTime(1400, now + i * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(700, now + i * 0.5 + 0.5);
      }

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      audioCtxRef.current = ctx;
      oscRef.current = osc;
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }, []);

  const toggleSiren = () => {
    if (sirenActive) {
      stopSiren();
      setSirenActive(false);
      setStrobeActive(false);
      speak("Siren and visual beacon stopped.", true);
    } else {
      startSiren();
      setSirenActive(true);
      setStrobeActive(true);
      wearableBridge.triggerHaptic("sos");
      speak("High-decibel emergency siren activated.", true);
    }
  };

  const getEmergencyMessage = () => {
    if (isEstimatedLocation || !location) {
      return `EMERGENCY ALERT: [APPROXIMATE - GPS UNAVAILABLE] I need immediate assistance! Exact location could not be determined (GPS permission denied or unavailable). Sent via Companio Accessibility Suite.`;
    }
    const locStr = `https://maps.google.com/?q=${location.lat},${location.lng} (${location.address})`;
    return `EMERGENCY ALERT: I need immediate assistance! My current location is: ${locStr}. Sent via Companio Accessibility Suite.`;
  };

  const handleSendSMS = (phone: string) => {
    const msg = encodeURIComponent(getEmergencyMessage());
    window.location.href = `sms:${phone}?body=${msg}`;
    addToast("Emergency SMS opened", "success");
    speak("Opening emergency SMS with your live coordinates.", true);
  };

  const handleSendWhatsApp = () => {
    const msg = encodeURIComponent(getEmergencyMessage());
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    addToast("WhatsApp emergency link opened", "success");
    speak("Sharing emergency coordinates via WhatsApp.", true);
  };

  return (
    <div className={`flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full text-on-surface transition-colors ${strobeActive ? "bg-red-950/40" : ""}`}>
      {/* Top Header */}
      <div className="bg-red-600 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between gap-4 border-2 border-red-400">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-4xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
              sos
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black font-display-ocr">Emergency Assistance</h1>
            <p className="text-sm font-semibold opacity-90">Live GPS tracking &amp; 1-tap dispatch</p>
          </div>
        </div>

        <a
          href="tel:911"
          className="h-14 px-6 bg-white text-red-600 font-extrabold text-lg rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer"
          aria-label="Call 911 immediately"
        >
          <span className="material-symbols-outlined text-2xl">call</span>
          <span>911</span>
        </a>
      </div>

      {/* Live Location Card */}
      <section className="bg-surface-container rounded-3xl p-6 border-2 border-outline-variant flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined">location_on</span>
            <h2 className="text-base uppercase tracking-wider">Your Live Coordinates</h2>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              locating
                ? "bg-primary/10 text-primary"
                : isEstimatedLocation
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {locating
              ? "Acquiring GPS..."
              : isEstimatedLocation
              ? "Location Unavailable"
              : "GPS Locked"}
          </span>
        </div>

        <div className="py-2 flex flex-col gap-2">
          <p className="text-xl font-extrabold text-on-surface">
            {location ? location.address : "Retrieving satellite signal..."}
          </p>

          {/* Warning Banner when GPS is unavailable */}
          {isEstimatedLocation && (
            <div
              className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-semibold"
              role="alert"
            >
              <span className="material-symbols-outlined text-lg shrink-0">warning</span>
              <span>
                Your exact location could not be determined. Emergency responders may not receive an accurate location — please state your location verbally if possible.
              </span>
            </div>
          )}

          {location && !isEstimatedLocation && (
            <p className="text-sm text-on-surface-variant font-mono mt-1">
              Latitude: {location.lat.toFixed(5)}, Longitude: {location.lng.toFixed(5)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleSendSMS(EMERGENCY_CONTACTS[0].phone)}
            className="h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow"
          >
            <span className="material-symbols-outlined">sms</span>
            SMS Location
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow"
          >
            <span className="material-symbols-outlined">share_location</span>
            WhatsApp SOS
          </button>
        </div>
      </section>

      {/* Siren & Strobe Controls */}
      <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Auditory &amp; Visual Alarm</h2>
          <p className="text-sm text-on-surface-variant">Attract bystanders with a loud siren and strobe light</p>
        </div>

        <button
          onClick={toggleSiren}
          className={`h-14 px-6 rounded-2xl font-black text-base flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow ${
            sirenActive ? "bg-red-600 text-white animate-bounce" : "bg-surface border-2 border-outline hover:bg-surface-container-high text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">
            {sirenActive ? "volume_off" : "campaign"}
          </span>
          <span>{sirenActive ? "Stop Siren" : "Sound Siren"}</span>
        </button>
      </section>

      {/* Emergency Contacts List */}
      <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
        <h2 className="text-base font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
          Designated Emergency Contacts
        </h2>

        <div className="flex flex-col gap-3">
          {EMERGENCY_CONTACTS.map((contact, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant">
              <div>
                <strong className="block text-base text-on-surface">{contact.name}</strong>
                <span className="text-xs text-on-surface-variant">{contact.phone} &bull; {contact.relation}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${contact.phone}`}
                  className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 flex items-center justify-center cursor-pointer"
                  aria-label={`Call ${contact.name}`}
                >
                  <span className="material-symbols-outlined text-xl">call</span>
                </a>
                <button
                  onClick={() => handleSendSMS(contact.phone)}
                  className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer"
                  aria-label={`Send SMS to ${contact.name}`}
                >
                  <span className="material-symbols-outlined text-xl">sms</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
