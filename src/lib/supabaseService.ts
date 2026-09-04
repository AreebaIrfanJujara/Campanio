import { supabase } from "./supabase";

export interface SupabaseUserProfile {
  id?: string;
  user_id: string;
  name: string;
  preset: string;
  font_size?: number;
  high_contrast?: boolean;
  tts_enabled?: boolean;
  tts_voice?: string;
  speech_rate?: number;
  speech_pitch?: number;
  caption_size?: string;
  reduced_motion?: boolean;
  ocr_auto_translate?: boolean;
  lang?: string;
  emergency_contacts?: Array<{ name: string; phone: string; relation: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseUserPhrase {
  id?: string;
  user_id: string;
  label: string;
  text: string;
  category?: string;
  icon?: string;
  sort_order?: number;
  created_at?: string;
}

export interface SupabaseActivityLog {
  id?: string;
  user_id: string;
  feature: string;
  title: string;
  summary?: string;
  icon?: string;
  source?: string;
  created_at?: string;
}

export interface SupabaseCaptionRoom {
  id?: string;
  room_code: string;
  owner_id: string;
  is_active?: boolean;
  created_at?: string;
  expires_at?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const isSupabaseConfigured = (): boolean => {
  return !!SUPABASE_URL && !SUPABASE_URL.includes("placeholder");
};

// ==========================================
// 1. User Profile Operations
// ==========================================
export async function fetchUserProfile(userId: string): Promise<SupabaseUserProfile | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("fetchUserProfile error:", error.message);
      return null;
    }
    return data as SupabaseUserProfile;
  } catch (err) {
    console.warn("fetchUserProfile catch:", err);
    return null;
  }
}

export async function upsertUserProfile(
  userId: string,
  profile: Partial<SupabaseUserProfile>
): Promise<SupabaseUserProfile | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const payload = {
      user_id: userId,
      ...profile,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("upsertUserProfile error:", error.message);
      return null;
    }
    return data as SupabaseUserProfile;
  } catch (err) {
    console.warn("upsertUserProfile catch:", err);
    return null;
  }
}

// ==========================================
// 2. Custom Phrases Operations
// ==========================================
export async function fetchUserPhrases(userId: string): Promise<SupabaseUserPhrase[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("user_phrases")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("fetchUserPhrases error:", error.message);
      return [];
    }
    return (data as SupabaseUserPhrase[]) || [];
  } catch (err) {
    console.warn("fetchUserPhrases catch:", err);
    return [];
  }
}

export async function createUserPhrase(
  userId: string,
  phrase: { label: string; text: string; category?: string; icon?: string; sort_order?: number }
): Promise<SupabaseUserPhrase | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("user_phrases")
      .insert({
        user_id: userId,
        label: phrase.label,
        text: phrase.text,
        category: phrase.category || "custom",
        icon: phrase.icon || null,
        sort_order: phrase.sort_order || 0,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("createUserPhrase error:", error.message);
      return null;
    }
    return data as SupabaseUserPhrase;
  } catch (err) {
    console.warn("createUserPhrase catch:", err);
    return null;
  }
}

export async function deleteUserPhrase(phraseId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || !phraseId) return false;
  try {
    const { error } = await supabase
      .from("user_phrases")
      .delete()
      .eq("id", phraseId)
      .eq("user_id", userId);

    if (error) {
      console.warn("deleteUserPhrase error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("deleteUserPhrase catch:", err);
    return false;
  }
}

// ==========================================
// 3. Activity Log Operations
// ==========================================
export async function fetchUserActivities(userId: string, limit = 20): Promise<SupabaseActivityLog[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("fetchUserActivities error:", error.message);
      return [];
    }
    return (data as SupabaseActivityLog[]) || [];
  } catch (err) {
    console.warn("fetchUserActivities catch:", err);
    return [];
  }
}

export async function logUserActivity(
  userId: string,
  entry: { feature: string; title: string; summary?: string; icon?: string; source?: string }
): Promise<SupabaseActivityLog | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("activity_log")
      .insert({
        user_id: userId,
        feature: entry.feature,
        title: entry.title,
        summary: entry.summary || entry.title,
        icon: entry.icon || null,
        source: entry.source || "app",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("logUserActivity error:", error.message);
      return null;
    }
    return data as SupabaseActivityLog;
  } catch (err) {
    console.warn("logUserActivity catch:", err);
    return null;
  }
}

export async function clearUserActivities(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return false;
  try {
    const { error } = await supabase
      .from("activity_log")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.warn("clearUserActivities error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("clearUserActivities catch:", err);
    return false;
  }
}

// ==========================================
// 4. Caption Rooms Operations
// ==========================================
export async function registerCaptionRoom(userId: string, roomCode: string): Promise<SupabaseCaptionRoom | null> {
  if (!isSupabaseConfigured() || !userId || !roomCode) return null;
  try {
    const { data, error } = await supabase
      .from("caption_rooms")
      .upsert({
        room_code: roomCode,
        owner_id: userId,
        is_active: true,
      }, { onConflict: "room_code" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("registerCaptionRoom error:", error.message);
      return null;
    }
    return data as SupabaseCaptionRoom;
  } catch (err) {
    console.warn("registerCaptionRoom catch:", err);
    return null;
  }
}
