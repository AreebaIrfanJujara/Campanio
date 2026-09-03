"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ActivityEntry {
  id: string;
  type: "ocr" | "scene" | "captions" | "tts" | "translation" | "conversation" | "explore" | "assistant";
  title: string;
  icon: string;
  timestamp: number;
  summary?: string;
}

const STORAGE_KEY = "companio_recent_activity";
const MAX_ENTRIES = 20;

interface ActivityContextType {
  activities: ActivityEntry[];
  logActivity: (type: ActivityEntry["type"], title: string, icon: string, summary?: string) => void;
  clearActivity: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ActivityEntry[] = JSON.parse(raw);
        // Only keep entries from last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = parsed.filter((a) => a.timestamp > cutoff);
        setActivities(filtered);
      }
    } catch (e) {
      console.error("Failed to load activity history", e);
    }
  }, []);

  // Persist whenever activities change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.slice(0, MAX_ENTRIES)));
    } catch (e) {
      console.error("Failed to persist activity", e);
    }
  }, [activities]);

  const logActivity = useCallback(
    (type: ActivityEntry["type"], title: string, icon: string, summary?: string) => {
      const entry: ActivityEntry = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        title,
        icon,
        timestamp: Date.now(),
        summary,
      };
      setActivities((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    },
    []
  );

  const clearActivity = useCallback(() => {
    setActivities([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ActivityContext.Provider value={{ activities, logActivity, clearActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
};
