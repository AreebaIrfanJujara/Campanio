"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { fetchUserActivities, logUserActivity, clearUserActivities } from "@/lib/supabaseService";

export interface ActivityEntry {
  id: string;
  type: "ocr" | "scene" | "captions" | "tts" | "translation" | "conversation" | "explore" | "assistant" | "currency" | "navigation";
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load from localStorage on mount and check Supabase session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ActivityEntry[] = JSON.parse(raw);
        const cutoff = Date.now() - 48 * 60 * 60 * 1000;
        const filtered = parsed.filter((a) => a.timestamp > cutoff);
        setActivities(filtered);
      }
    } catch (e) {
      console.error("Failed to load activity history", e);
    }

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (uid) {
        setCurrentUserId(uid);
        fetchUserActivities(uid, MAX_ENTRIES).then((dbLogs) => {
          if (dbLogs && dbLogs.length > 0) {
            const mapped: ActivityEntry[] = dbLogs.map((l) => ({
              id: l.id || `db-${Date.now()}`,
              type: (l.feature as ActivityEntry["type"]) || "assistant",
              title: l.title || l.summary || "Accessibility action",
              icon: l.icon || "bolt",
              timestamp: l.created_at ? new Date(l.created_at).getTime() : Date.now(),
              summary: l.summary,
            }));
            setActivities(mapped);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
          }
        }).catch(() => {});
      }
    }).catch(() => {});

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        fetchUserActivities(uid, MAX_ENTRIES).then((dbLogs) => {
          if (dbLogs && dbLogs.length > 0) {
            const mapped: ActivityEntry[] = dbLogs.map((l) => ({
              id: l.id || `db-${Date.now()}`,
              type: (l.feature as ActivityEntry["type"]) || "assistant",
              title: l.title || l.summary || "Accessibility action",
              icon: l.icon || "bolt",
              timestamp: l.created_at ? new Date(l.created_at).getTime() : Date.now(),
              summary: l.summary,
            }));
            setActivities(mapped);
          }
        }).catch(() => {});
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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

      if (currentUserId) {
        logUserActivity(currentUserId, {
          feature: type,
          title,
          summary: summary || title,
          icon,
          source: "app",
        }).catch(() => {});
      }
    },
    [currentUserId]
  );

  const clearActivity = useCallback(() => {
    setActivities([]);
    localStorage.removeItem(STORAGE_KEY);
    if (currentUserId) {
      clearUserActivities(currentUserId).catch(() => {});
    }
  }, [currentUserId]);

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
