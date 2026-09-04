-- ==============================================================================
-- Migration: 20260904000000_init_accessibility_suite.sql
-- Companio Accessibility Suite — Database Migration & RLS Setup
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL DEFAULT 'Alex',
  preset              TEXT        NOT NULL DEFAULT 'standard',
  font_size           SMALLINT    NOT NULL DEFAULT 3,
  high_contrast       BOOLEAN     NOT NULL DEFAULT false,
  tts_enabled         BOOLEAN     NOT NULL DEFAULT true,
  tts_voice           TEXT        DEFAULT 'neural-f',
  speech_rate         NUMERIC(3,1) DEFAULT 1.0,
  speech_pitch        NUMERIC(3,1) DEFAULT 1.0,
  caption_size        TEXT        DEFAULT 'md',
  reduced_motion      BOOLEAN     DEFAULT false,
  ocr_auto_translate  BOOLEAN     DEFAULT false,
  lang                TEXT        NOT NULL DEFAULT 'en',
  emergency_contacts  JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile" ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

-- Table: user_phrases
CREATE TABLE IF NOT EXISTS public.user_phrases (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  text        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'custom',
  icon        TEXT,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_phrases_user_id_idx ON public.user_phrases(user_id);

ALTER TABLE public.user_phrases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own phrases" ON public.user_phrases;
CREATE POLICY "Users can read own phrases" ON public.user_phrases FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own phrases" ON public.user_phrases;
CREATE POLICY "Users can insert own phrases" ON public.user_phrases FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own phrases" ON public.user_phrases;
CREATE POLICY "Users can update own phrases" ON public.user_phrases FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own phrases" ON public.user_phrases;
CREATE POLICY "Users can delete own phrases" ON public.user_phrases FOR DELETE USING (auth.uid() = user_id);

-- Table: activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  summary     TEXT        NOT NULL,
  icon        TEXT,
  source      TEXT        DEFAULT 'app',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON public.activity_log(user_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own activity" ON public.activity_log;
CREATE POLICY "Users can read own activity" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
CREATE POLICY "Users can insert own activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activity" ON public.activity_log;
CREATE POLICY "Users can delete own activity" ON public.activity_log FOR DELETE USING (auth.uid() = user_id);

-- Table: caption_rooms
CREATE TABLE IF NOT EXISTS public.caption_rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code   TEXT        NOT NULL UNIQUE,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
);

CREATE INDEX IF NOT EXISTS caption_rooms_code_idx ON public.caption_rooms(room_code);

ALTER TABLE public.caption_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room owner can manage room" ON public.caption_rooms;
CREATE POLICY "Room owner can manage room" ON public.caption_rooms USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Authenticated users can read active rooms" ON public.caption_rooms;
CREATE POLICY "Authenticated users can read active rooms" ON public.caption_rooms FOR SELECT TO authenticated USING (is_active = true AND expires_at > NOW());

-- Functions & Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Alex')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
