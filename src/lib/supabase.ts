import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  name: string;
  preset: 'visual' | 'hearing' | 'motor' | 'standard';
  voice: string;
  caption_size: number;
  haptic_intensity: number;
  default_mode: 'voice-first' | 'caption-first' | 'tts-first';
  language_pair: { source: string; target: string };
};

export type UserPhrase = {
  id: string;
  user_id: string;
  text: string;
  label: string;
  category: string;
  order: number;
  created_at: string;
};
