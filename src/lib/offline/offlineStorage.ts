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
  CURRENCY_TALLY: "companio_currency_tally",
};

export interface SyncQueueItem {
  id: string;
  type: "activity" | "settings" | "transcription";
  payload: any;
  timestamp: number;
}

export interface StoredScannedItem {
  id: number;
  description: string;
  amount: number;
  currency: string;
  symbol: string;
  time: string;
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

  /** Remove a single item from the queue once it has been successfully synced. */
  removeFromSyncQueue(id: string): void {
    if (!this.isAvailable()) return;
    try {
      const queue = this.getSyncQueue().filter((item) => item.id !== id);
      localStorage.setItem(OFFLINE_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to remove item from offline sync queue", e);
    }
  },

  getSyncQueueCount(): number {
    return this.getSyncQueue().length;
  },

  // ─────────────────────────────────────────────────────────────
  // Currency scanner tally persistence — survives refreshes so an
  // offline reload (which happens more often on flaky connections)
  // doesn't silently wipe a person's running total.
  // ─────────────────────────────────────────────────────────────
  getCurrencyTally(): { history: StoredScannedItem[]; runningTotal: number } {
    if (!this.isAvailable()) return { history: [], runningTotal: 0 };
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEYS.CURRENCY_TALLY);
      if (!raw) return { history: [], runningTotal: 0 };
      const parsed = JSON.parse(raw);
      return {
        history: Array.isArray(parsed.history) ? parsed.history : [],
        runningTotal: typeof parsed.runningTotal === "number" ? parsed.runningTotal : 0,
      };
    } catch {
      return { history: [], runningTotal: 0 };
    }
  },

  setCurrencyTally(history: StoredScannedItem[], runningTotal: number): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.setItem(
        OFFLINE_STORAGE_KEYS.CURRENCY_TALLY,
        JSON.stringify({ history, runningTotal })
      );
    } catch (e) {
      console.error("Failed to persist currency tally", e);
    }
  },

  clearCurrencyTally(): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.removeItem(OFFLINE_STORAGE_KEYS.CURRENCY_TALLY);
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