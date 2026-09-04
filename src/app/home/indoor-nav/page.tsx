"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { wearableBridge } from "@/lib/wearableBridge";
import { useToast } from "@/context/ToastContext";
import { playTone } from "@/lib/audioManager";
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth";

export interface NavWaypoint {
  stepNumber: number;
  instruction: string;
  distance: string;
  icon: string;
  landmark: string;
}

export interface RouteDefinition {
  id: string;
  title: string;
  category?: string;
  isCustom?: boolean;
  waypoints: NavWaypoint[];
}

const PRESET_DESTINATIONS: RouteDefinition[] = [
  {
    id: "elevator",
    title: "Main Elevator (West Wing)",
    category: "Sample Building",
    isCustom: false,
    waypoints: [
      { stepNumber: 1, instruction: "Walk straight ahead 12 paces along the main corridor.", distance: "25 ft", icon: "straight", landmark: "Pass the reception desk on your left." },
      { stepNumber: 2, instruction: "Turn right at the corridor junction.", distance: "10 ft", icon: "turn_right", landmark: "Notice tactile floor guide strips." },
      { stepNumber: 3, instruction: "Walk forward 8 paces. Elevator call button is on the right wall.", distance: "15 ft", icon: "elevator", landmark: "Arrived at Main Elevator." },
    ],
  },
  {
    id: "restroom",
    title: "Accessible Restroom",
    category: "Sample Building",
    isCustom: false,
    waypoints: [
      { stepNumber: 1, instruction: "Turn left and walk forward 15 paces.", distance: "30 ft", icon: "turn_left", landmark: "Water dispenser on right." },
      { stepNumber: 2, instruction: "Doorway on right with tactile braille sign.", distance: "5 ft", icon: "wc", landmark: "Arrived at Accessible Restroom." },
    ],
  },
  {
    id: "pharmacy",
    title: "Pharmacy & Dispensary",
    category: "Sample Building",
    isCustom: false,
    waypoints: [
      { stepNumber: 1, instruction: "Walk straight 20 paces through the lobby atrium.", distance: "45 ft", icon: "straight", landmark: "Information kiosk in center." },
      { stepNumber: 2, instruction: "Turn slight left towards Counter 4.", distance: "12 ft", icon: "local_pharmacy", landmark: "Arrived at Pharmacy Desk." },
    ],
  },
  {
    id: "exit",
    title: "Emergency Exit Route",
    category: "Sample Building",
    isCustom: false,
    waypoints: [
      { stepNumber: 1, instruction: "Head directly towards green illuminated exit sign ahead.", distance: "35 ft", icon: "exit_to_app", landmark: "Follow emergency wall markers." },
      { stepNumber: 2, instruction: "Push emergency push-bar door to exit building.", distance: "8 ft", icon: "door_front", landmark: "Outside assembly area." },
    ],
  },
];

const LOCAL_STORAGE_KEY = "companio_custom_indoor_routes";

const DIRECTION_ICONS = [
  { id: "straight", label: "Straight", icon: "straight" },
  { id: "turn_left", label: "Turn Left", icon: "turn_left" },
  { id: "turn_right", label: "Turn Right", icon: "turn_right" },
  { id: "stairs", label: "Stairs / Ramp", icon: "stairs" },
  { id: "door_front", label: "Doorway", icon: "door_front" },
  { id: "room", label: "Destination", icon: "room" },
];

export default function IndoorNavPage() {
  const { speak } = useAccessibility();
  const { addToast } = useToast();
  const { user } = useSupabaseAuth();

  const [customRoutes, setCustomRoutes] = useState<RouteDefinition[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("elevator");
  const [activeTab, setActiveTab] = useState<"my_places" | "presets">("my_places");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState<boolean>(false);

  // New route form state
  const [newRouteTitle, setNewRouteTitle] = useState<string>("");
  const [newWaypoints, setNewWaypoints] = useState<Array<{ instruction: string; distance: string; icon: string; landmark: string }>>([
    { instruction: "Walk straight 10 paces", distance: "20 ft", icon: "straight", landmark: "Front hallway" },
    { instruction: "Turn left at the doorway", distance: "10 ft", icon: "turn_left", landmark: "Kitchen entrance" },
  ]);

  const beepIntervalRef = useRef<any>(null);

  // Load custom routes from localStorage on mount
  useEffect(() => {
    speak("Indoor navigation and wayfinding active. Select or create your personal route.");
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomRoutes(parsed);
            setSelectedRouteId(parsed[0].id);
            setActiveTab("my_places");
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to load custom indoor routes", e);
      }
    }
  }, []);

  // Save custom routes to localStorage whenever updated
  const saveCustomRoutes = (routes: RouteDefinition[]) => {
    setCustomRoutes(routes);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(routes));
    }
  };

  // Find all available routes
  const allRoutes = [...customRoutes, ...PRESET_DESTINATIONS];
  const activeRoute = allRoutes.find((r) => r.id === selectedRouteId) || PRESET_DESTINATIONS[0];
  const currentWaypoint = activeRoute.waypoints[currentStepIndex] || activeRoute.waypoints[0];

  // Radar proximity audio feedback
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
    const totalSteps = activeRoute.waypoints.length;
    const interval = Math.max(350, 1100 - (currentStepIndex / Math.max(1, totalSteps)) * 600);

    beepIntervalRef.current = setInterval(() => {
      playTone(550 + currentStepIndex * 120, 0.08, "sine", 0.15);
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
    speak(`Starting guided wayfinding to ${activeRoute.title}. Step 1: ${activeRoute.waypoints[0].instruction}`, true);
    addToast(`Navigating to ${activeRoute.title}`, "success");
  };

  const handleNextStep = () => {
    if (currentStepIndex < activeRoute.waypoints.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      wearableBridge.triggerHaptic("nav_turn");
      speak(`Step ${nextIdx + 1}: ${activeRoute.waypoints[nextIdx].instruction}. Landmark: ${activeRoute.waypoints[nextIdx].landmark}`, true);
    } else {
      setIsNavigating(false);
      wearableBridge.triggerHaptic("success");
      speak(`You have arrived at your destination: ${activeRoute.title}!`, true);
      addToast("Destination reached!", "success");
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      speak(`Step ${prevIdx + 1}: ${activeRoute.waypoints[prevIdx].instruction}`, true);
    }
  };

  // Add waypoint row in route builder
  const handleAddWaypointField = () => {
    setNewWaypoints((prev) => [
      ...prev,
      {
        instruction: "Walk forward 10 paces",
        distance: "15 ft",
        icon: "straight",
        landmark: "Target landmark",
      },
    ]);
  };

  // Remove waypoint row
  const handleRemoveWaypointField = (index: number) => {
    if (newWaypoints.length <= 1) {
      addToast("A route must have at least one step", "warning");
      return;
    }
    setNewWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Save new custom route
  const handleSaveNewRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteTitle.trim()) {
      addToast("Please enter a route title (e.g. My Bedroom to Kitchen)", "warning");
      speak("Please enter a route title.", true);
      return;
    }

    const createdRoute: RouteDefinition = {
      id: `custom_${Date.now()}`,
      title: newRouteTitle.trim(),
      category: "Personal Route",
      isCustom: true,
      waypoints: newWaypoints.map((wp, index) => ({
        stepNumber: index + 1,
        instruction: wp.instruction.trim() || `Walk step ${index + 1}`,
        distance: wp.distance.trim() || "15 ft",
        icon: wp.icon || "straight",
        landmark: wp.landmark.trim() || "Landmark guide",
      })),
    };

    const updated = [createdRoute, ...customRoutes];
    saveCustomRoutes(updated);
    setSelectedRouteId(createdRoute.id);
    setIsCreatingRoute(false);
    setActiveTab("my_places");
    setNewRouteTitle("");
    addToast(`Saved route: ${createdRoute.title}`, "success");
    speak(`Saved custom route ${createdRoute.title} with ${createdRoute.waypoints.length} steps. Ready to navigate!`, true);
  };

  // Delete custom route
  const handleDeleteCustomRoute = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = customRoutes.filter((r) => r.id !== id);
    saveCustomRoutes(filtered);
    if (selectedRouteId === id) {
      setSelectedRouteId(filtered.length > 0 ? filtered[0].id : "elevator");
    }
    addToast(`Deleted route: ${title}`, "info");
    speak(`Deleted route ${title}`, true);
  };

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div>
          <h1 className="text-3xl font-bold font-display-ocr">Indoor Wayfinding</h1>
          <p className="text-sm text-on-surface-variant font-semibold">Real step-by-step indoor spatial guidance for your home & office</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0">
          <span className="material-symbols-outlined text-2xl">explore</span>
        </div>
      </div>

      {/* MODAL / VIEW: Create Custom Route */}
      {isCreatingRoute ? (
        <section className="bg-surface border-2 border-primary rounded-3xl p-6 shadow-xl flex flex-col gap-6 animate-slide-up">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">add_location_alt</span>
              <h2 className="text-xl font-black text-on-surface">Create My Custom Route</h2>
            </div>
            <button
              onClick={() => setIsCreatingRoute(false)}
              className="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              aria-label="Close route creator"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSaveNewRoute} className="flex flex-col gap-5">
            <div>
              <label htmlFor="routeTitle" className="block text-sm font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Route Name / Destination
              </label>
              <input
                id="routeTitle"
                type="text"
                value={newRouteTitle}
                onChange={(e) => setNewRouteTitle(e.target.value)}
                placeholder="e.g. My Bedroom to Kitchen, Living Room to Front Door"
                className="w-full h-12 px-4 rounded-xl border-2 border-outline-variant bg-surface-container text-on-surface focus:border-primary focus:outline-none font-semibold text-base"
                required
              />
            </div>

            {/* Waypoint Steps Builder */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
                  Navigation Steps ({newWaypoints.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddWaypointField}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Step</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {newWaypoints.map((wp, idx) => (
                  <div key={idx} className="bg-surface-container p-4 rounded-2xl border border-outline-variant flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-primary tracking-wider">
                        Step {idx + 1}
                      </span>
                      {newWaypoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveWaypointField(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-bold text-on-surface-variant block mb-1">Instruction</span>
                        <input
                          type="text"
                          value={wp.instruction}
                          onChange={(e) => {
                            const updated = [...newWaypoints];
                            updated[idx].instruction = e.target.value;
                            setNewWaypoints(updated);
                          }}
                          placeholder="e.g. Walk straight 12 paces"
                          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-medium text-sm"
                          required
                        />
                      </div>

                      <div>
                        <span className="text-xs font-bold text-on-surface-variant block mb-1">Distance / Paces</span>
                        <input
                          type="text"
                          value={wp.distance}
                          onChange={(e) => {
                            const updated = [...newWaypoints];
                            updated[idx].distance = e.target.value;
                            setNewWaypoints(updated);
                          }}
                          placeholder="e.g. 20 ft or 10 paces"
                          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-medium text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-bold text-on-surface-variant block mb-1">Direction Type</span>
                        <select
                          value={wp.icon}
                          onChange={(e) => {
                            const updated = [...newWaypoints];
                            updated[idx].icon = e.target.value;
                            setNewWaypoints(updated);
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-medium text-sm"
                        >
                          {DIRECTION_ICONS.map((d) => (
                            <option key={d.id} value={d.icon}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-on-surface-variant block mb-1">Tactile Landmark / Cue</span>
                        <input
                          type="text"
                          value={wp.landmark}
                          onChange={(e) => {
                            const updated = [...newWaypoints];
                            updated[idx].landmark = e.target.value;
                            setNewWaypoints(updated);
                          }}
                          placeholder="e.g. Pass table on left, door handle on right"
                          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-medium text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingRoute(false)}
                className="flex-1 h-12 bg-surface-container border border-outline text-on-surface font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-primary text-white font-black text-base rounded-xl shadow-md cursor-pointer hover:bg-primary-container active:scale-95 transition-all"
              >
                Save My Route
              </button>
            </div>
          </form>
        </section>
      ) : !isNavigating ? (
        /* MAIN VIEW: Route Chooser */
        <section className="flex flex-col gap-5">
          {/* Top Actions: Create Route Button + Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Segmented Tabs */}
            <div className="flex items-center p-1 bg-surface-container rounded-2xl border border-outline-variant">
              <button
                onClick={() => setActiveTab("my_places")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 justify-center ${
                  activeTab === "my_places"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-base">home_pin</span>
                <span>My Saved Places ({customRoutes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("presets")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 justify-center ${
                  activeTab === "presets"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-base">apartment</span>
                <span>Sample Buildings ({PRESET_DESTINATIONS.length})</span>
              </button>
            </div>

            {/* Create Custom Route Button */}
            <button
              onClick={() => {
                speak("Opening custom route builder. Add your own home or office path.", true);
                setIsCreatingRoute(true);
              }}
              className="h-11 px-4 bg-primary text-white font-black text-sm rounded-2xl flex items-center gap-2 shadow hover:bg-primary-container cursor-pointer active:scale-95 transition-all self-stretch sm:self-auto justify-center"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              <span>Create My Route</span>
            </button>
          </div>

          {/* Route Cards Grid */}
          <div role="radiogroup" aria-label="Choose Destination Route" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(activeTab === "my_places" ? customRoutes : PRESET_DESTINATIONS).map((item) => {
              const isSelected = selectedRouteId === item.id;
              const lastWaypoint = item.waypoints[item.waypoints.length - 1];

              return (
                <div
                  key={item.id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedRouteId(item.id);
                    speak(`Selected ${item.title}`);
                  }}
                  className={`p-5 rounded-2xl border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-95 ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-surface-container border-outline-variant hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {lastWaypoint?.icon || "place"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-base font-bold truncate">{item.title}</strong>
                      <span className={`text-xs block ${isSelected ? "text-white/80" : "text-on-surface-variant"}`}>
                        {item.waypoints.length} steps • {item.category || "Route"}
                      </span>
                    </div>
                  </div>

                  {item.isCustom && (
                    <button
                      onClick={(e) => handleDeleteCustomRoute(item.id, item.title, e)}
                      title="Delete custom route"
                      aria-label={`Delete ${item.title}`}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:bg-red-500/20 cursor-pointer ${
                        isSelected ? "text-white hover:text-red-200" : "text-red-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state for custom places */}
          {activeTab === "my_places" && customRoutes.length === 0 && (
            <div className="bg-surface-container p-8 rounded-3xl border-2 border-dashed border-outline-variant text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">add_home</span>
              </div>
              <h3 className="text-lg font-black text-on-surface">No Custom Places Saved Yet</h3>
              <p className="text-sm text-on-surface-variant max-w-md font-medium">
                Record real routes for your home, room, or office. Set custom footsteps, turns, and tactile landmarks to guide you anytime.
              </p>
              <button
                onClick={() => setIsCreatingRoute(true)}
                className="mt-2 px-5 py-2.5 bg-primary text-white font-black text-sm rounded-xl shadow cursor-pointer hover:bg-primary-container"
              >
                + Create Your First Real Route
              </button>
            </div>
          )}

          {/* Start Navigation Button */}
          {((activeTab === "my_places" && customRoutes.length > 0) || activeTab === "presets") && (
            <button
              onClick={handleStartNav}
              className="w-full h-[60px] bg-primary text-white font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer mt-2"
            >
              <span className="material-symbols-outlined text-3xl">near_me</span>
              <span>Start Guided Wayfinding</span>
            </button>
          )}
        </section>
      ) : (
        /* ACTIVE NAVIGATION VIEW */
        <section className="flex flex-col gap-5 animate-fade-in">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-sm font-bold text-on-surface-variant">
            <span className="font-extrabold text-on-surface">Destination: {activeRoute.title}</span>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">
              Step {currentStepIndex + 1} of {activeRoute.waypoints.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={activeRoute.waypoints.length}
            aria-valuenow={currentStepIndex + 1}
            aria-label="Route progress"
            className="w-full h-3 bg-surface-container rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStepIndex + 1) / activeRoute.waypoints.length) * 100}%` }}
            ></div>
          </div>

          {/* Direction Card */}
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
                Step {currentStepIndex + 1} • {currentWaypoint.distance}
              </span>
              <h2 className="text-2xl font-black leading-tight">
                {currentWaypoint.instruction}
              </h2>
              <p className="text-base text-white/80 font-medium">
                📍 {currentWaypoint.landmark}
              </p>
            </div>
          </div>

          {/* Navigation Step Controls */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePreviousStep}
              disabled={currentStepIndex === 0}
              className="h-[56px] bg-surface-container border-2 border-outline hover:bg-surface-container-high text-on-surface font-bold text-base rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Previous</span>
            </button>

            <button
              onClick={handleNextStep}
              className="h-[56px] bg-primary text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>{currentStepIndex === activeRoute.waypoints.length - 1 ? "Finish Route" : "Next Step"}</span>
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
