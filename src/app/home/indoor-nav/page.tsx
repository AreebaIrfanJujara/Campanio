"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { wearableBridge } from "@/lib/wearableBridge";
import { useToast } from "@/context/ToastContext";

interface NavWaypoint {
  stepNumber: number;
  instruction: string;
  distance: string;
  icon: string;
  landmark: string;
}

const DESTINATIONS: Record<string, { title: string; waypoints: NavWaypoint[] }> = {
  elevator: {
    title: "Main Elevator (West Wing)",
    waypoints: [
      { stepNumber: 1, instruction: "Walk straight ahead 12 paces along the main corridor.", distance: "25 ft", icon: "straight", landmark: "Pass the reception desk on your left." },
      { stepNumber: 2, instruction: "Turn right at the corridor junction.", distance: "10 ft", icon: "turn_right", landmark: "Notice tactile floor guide strips." },
      { stepNumber: 3, instruction: "Walk forward 8 paces. Elevator call button is on the right wall.", distance: "15 ft", icon: "elevator", landmark: "Arrived at Main Elevator." },
    ],
  },
  restroom: {
    title: "Accessible Restroom",
    waypoints: [
      { stepNumber: 1, instruction: "Turn left and walk forward 15 paces.", distance: "30 ft", icon: "turn_left", landmark: "Water dispenser on right." },
      { stepNumber: 2, instruction: "Doorway on right with tactile braille sign.", distance: "5 ft", icon: "wc", landmark: "Arrived at Accessible Restroom." },
    ],
  },
  pharmacy: {
    title: "Pharmacy & Dispensary",
    waypoints: [
      { stepNumber: 1, instruction: "Walk straight 20 paces through the lobby atrium.", distance: "45 ft", icon: "straight", landmark: "Information kiosk in center." },
      { stepNumber: 2, instruction: "Turn slight left towards Counter 4.", distance: "12 ft", icon: "local_pharmacy", landmark: "Arrived at Pharmacy Desk." },
    ],
  },
  exit: {
    title: "Emergency Exit Route",
    waypoints: [
      { stepNumber: 1, instruction: "Head directly towards green illuminated exit sign ahead.", distance: "35 ft", icon: "exit_to_app", landmark: "Follow emergency wall markers." },
      { stepNumber: 2, instruction: "Push emergency push-bar door to exit building.", distance: "8 ft", icon: "door_front", landmark: "Outside assembly area." },
    ],
  },
};

export default function IndoorNavPage() {
  const { speak } = useAccessibility();
  const { addToast } = useToast();

  const [selectedDest, setSelectedDest] = useState<string>("elevator");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [compassHeading, setCompassHeading] = useState<number>(340);

  const beepIntervalRef = useRef<any>(null);

  const route = DESTINATIONS[selectedDest];
  const currentWaypoint = route.waypoints[currentStepIndex];

  useEffect(() => {
    speak("Indoor navigation and wayfinding active. Select your destination.", true);
  }, []);

  useEffect(() => {
    if (isNavigating) {
      startProximityBeeps();
    } else {
      stopProximityBeeps();
    }
    return () => stopProximityBeeps();
  }, [isNavigating, currentStepIndex]);

  const startProximityBeeps = () => {
    stopProximityBeeps();
    const interval = Math.max(400, 1200 - currentStepIndex * 300);

    beepIntervalRef.current = setInterval(() => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600 + currentStepIndex * 150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch {}
    }, interval);
  };

  const stopProximityBeeps = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  const handleStartNav = () => {
    setIsNavigating(true);
    setCurrentStepIndex(0);
    wearableBridge.triggerHaptic("nav_turn");
    speak(`Starting navigation to ${route.title}. Step 1: ${route.waypoints[0].instruction}`, true);
    addToast(`Navigating to ${route.title}`, "success");
  };

  const handleNextStep = () => {
    if (currentStepIndex < route.waypoints.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      wearableBridge.triggerHaptic("nav_turn");
      speak(`Step ${nextIdx + 1}: ${route.waypoints[nextIdx].instruction}`, true);
    } else {
      setIsNavigating(false);
      wearableBridge.triggerHaptic("success");
      speak(`You have reached your destination: ${route.title}!`, true);
      addToast("Destination reached!", "success");
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      speak(`Step ${prevIdx + 1}: ${route.waypoints[prevIdx].instruction}`, true);
    }
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div>
          <h1 className="text-3xl font-bold font-display-ocr">Indoor Wayfinding</h1>
          <p className="text-sm text-on-surface-variant font-semibold">Step-by-step indoor spatial guidance</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black">
          <span className="material-symbols-outlined text-2xl">explore</span>
        </div>
      </div>

      {/* Destination Picker */}
      {!isNavigating ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-black uppercase tracking-wider text-on-surface-variant">
            Choose Destination
          </h2>

          <div role="radiogroup" aria-label="Choose Destination" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(DESTINATIONS).map(([key, item]) => {
              const isSelected = selectedDest === key;
              return (
                <button
                  key={key}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedDest(key);
                    speak(`Selected ${item.title}`);
                  }}
                  className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 cursor-pointer transition-all active:scale-95 ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-surface-container border-outline-variant hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {item.waypoints[item.waypoints.length - 1].icon}
                  </span>
                  <div>
                    <strong className="block text-base">{item.title}</strong>
                    <span className="text-xs opacity-80">{item.waypoints.length} waypoints</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleStartNav}
            className="w-full h-[60px] bg-primary text-white font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer mt-3"
          >
            <span className="material-symbols-outlined text-3xl">near_me</span>
            <span>Start Guided Wayfinding</span>
          </button>
        </section>
      ) : (
        /* Active Navigation View */
        <section className="flex flex-col gap-5">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-sm font-bold text-on-surface-variant">
            <span>Destination: {route.title}</span>
            <span>Step {currentStepIndex + 1} of {route.waypoints.length}</span>
          </div>

          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={route.waypoints.length}
            aria-valuenow={currentStepIndex + 1}
            aria-label="Route progress"
            className="w-full h-3 bg-surface-container rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStepIndex + 1) / route.waypoints.length) * 100}%` }}
            ></div>
          </div>

          {/* Waypoint Direction Card */}
          <div
            role="region"
            aria-live="polite"
            aria-label="Current Navigation Step"
            className="bg-primary text-white rounded-3xl p-8 shadow-xl flex flex-col gap-6 text-center items-center border-2 border-primary-container"
          >
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-6xl animate-pulse">
                {currentWaypoint.icon}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest font-black opacity-80">
                Step {currentStepIndex + 1} • {currentWaypoint.distance} remaining
              </span>
              <h2 className="text-2xl font-black leading-tight">
                {currentWaypoint.instruction}
              </h2>
              <p className="text-base text-white/80 font-medium">
                📍 {currentWaypoint.landmark}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePreviousStep}
              disabled={currentStepIndex === 0}
              className="h-[56px] bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-base rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Previous
            </button>

            <button
              onClick={handleNextStep}
              className="h-[56px] bg-primary text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>{currentStepIndex === route.waypoints.length - 1 ? "Finish" : "Next Step"}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          <button
            onClick={() => {
              setIsNavigating(false);
              speak("Navigation cancelled", true);
            }}
            className="text-center text-sm font-bold text-red-500 hover:underline py-2 cursor-pointer"
          >
            Cancel Route
          </button>
        </section>
      )}
    </div>
  );
}
