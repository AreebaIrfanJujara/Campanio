import { supabase } from "./supabase";

export interface CaptionMessage {
  id: string;
  text: string;
  speaker: "them" | "you";
  timestamp: number;
}

export type CaptionListener = (msg: CaptionMessage) => void;

class RealtimeCaptionManager {
  private currentChannel: any = null;
  private currentRoomId: string | null = null;
  private listeners: Set<CaptionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel("companio_captions_sync");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === "NEW_CAPTION") {
            this.notifyListeners(event.data.payload);
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel not supported", e);
      }
    }
  }

  joinRoom(roomId: string, onNewCaption?: CaptionListener): string {
    this.currentRoomId = roomId;
    if (onNewCaption) {
      this.listeners.add(onNewCaption);
    }

    if (supabase) {
      try {
        if (this.currentChannel) {
          supabase.removeChannel(this.currentChannel);
        }

        this.currentChannel = supabase
          .channel(`captions:${roomId}`)
          .on("broadcast", { event: "caption" }, (payload) => {
            if (payload?.payload) {
              this.notifyListeners(payload.payload);
            }
          })
          .subscribe();
      } catch (e) {
        console.warn("Supabase Realtime subscribe failed, using local broadcast channel", e);
      }
    }

    return roomId;
  }

  leaveRoom(): void {
    if (this.currentChannel && supabase) {
      try {
        supabase.removeChannel(this.currentChannel);
      } catch (e) {
        console.warn(e);
      }
    }
    this.currentChannel = null;
    this.currentRoomId = null;
    this.listeners.clear();
  }

  broadcastCaption(caption: Omit<CaptionMessage, "id" | "timestamp">): CaptionMessage {
    const fullMessage: CaptionMessage = {
      ...caption,
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    // 1. Supabase Realtime broadcast
    if (this.currentChannel && supabase) {
      try {
        this.currentChannel.send({
          type: "broadcast",
          event: "caption",
          payload: fullMessage,
        });
      } catch (e) {
        console.warn("Supabase broadcast send failed", e);
      }
    }

    // 2. Tab/window BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: "NEW_CAPTION",
          payload: fullMessage,
        });
      } catch (e) {
        console.warn(e);
      }
    }

    return fullMessage;
  }

  subscribe(listener: CaptionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(msg: CaptionMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (e) {
        console.error("Caption listener error", e);
      }
    });
  }

  getCurrentRoom(): string | null {
    return this.currentRoomId;
  }
}

export const realtimeCaptions = new RealtimeCaptionManager();
