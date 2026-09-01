/**
 * Offline Storage Manager for Companio
 * Manages local persistence for offline activities, custom phrases, and cached logs.
 */

export const OFFLINE_STORAGE_KEYS = {
  SETTINGS: "companio_accessibility_settings",
  CUSTOM_PHRASES: "companio_custom_phrases",
  RECENT_ACTIVITY: "companio_recent_activity",
  OFFLINE_QUEUE: "companio_offline_sync_queue",
  CACHE_VERSION: "companio_cache_version",
};

export interface SyncQueueItem {
  id: string;
  type: "activity" | "settings" | "transcription";
  payload: any;
  timestamp: number;
}

export const OfflineStorage = {
  isAvailable(): boolean {
    return typeof window !== "undefined" && "localStorage" in window;
  },

  getSyncQueue(): SyncQueueItem[] {
    if (!this.isAvailable()) return [];
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEYS.OFFLINE_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addToSyncQueue(item: Omit<SyncQueueItem, "id" | "timestamp">): void {
    if (!this.isAvailable()) return;
    try {
      const queue = this.getSyncQueue();
      const newItem: SyncQueueItem = {
        ...item,
        id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      queue.push(newItem);
      localStorage.setItem(OFFLINE_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to add item to offline sync queue", e);
    }
  },

  clearSyncQueue(): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.removeItem(OFFLINE_STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (e) {
      console.error(e);
    }
  },

  async getStorageEstimate(): Promise<{ usageKB: number; quotaKB: number } | null> {
    if (typeof navigator !== "undefined" && "storage" in navigator && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageKB = Math.round((estimate.usage || 0) / 1024);
        const quotaKB = Math.round((estimate.quota || 0) / 1024);
        return { usageKB, quotaKB };
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  },

  async clearAllCaches(): Promise<boolean> {
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        return true;
      } catch (e) {
        console.error("Error clearing caches", e);
      }
    }
    return false;
  },
};
