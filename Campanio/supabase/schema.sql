-- ============================================================
-- Companio Accessibility Suite — Supabase Schema
-- Run this in the Supabase SQL editor after creating a project.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- Table: user_profiles
-- Stores per-user accessibility preferences and profile data
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  preset      TEXT        NOT NULL DEFAULT 'standard',   -- standard | low-vision | deaf | motor
  font_size   SMALLINT    NOT NULL DEFAULT 3,             -- 1–5 scale
  high_contrast BOOLEAN   NOT NULL DEFAULT false,
  tts_enabled BOOLEAN     NOT NULL DEFAULT true,
  tts_voice   TEXT,
  lang        TEXT        NOT NULL DEFAULT 'en',
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One profile per user
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);

-- RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Table: user_phrases
-- Custom phrase board entries saved by the user
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_phrases (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'custom',  -- emergency | medical | social | custom
  icon        TEXT,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_phrases_user_id_idx ON user_phrases(user_id);

ALTER TABLE user_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own phrases"
  ON user_phrases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phrases"
  ON user_phrases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phrases"
  ON user_phrases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phrases"
  ON user_phrases FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Table: caption_rooms
-- Supabase Realtime caption sync rooms
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS caption_rooms (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code   TEXT        NOT NULL UNIQUE,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
);

CREATE INDEX IF NOT EXISTS caption_rooms_code_idx ON caption_rooms(room_code);

ALTER TABLE caption_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room owner can manage room"
  ON caption_rooms
  USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can read active rooms"
  ON caption_rooms FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > NOW());

-- ─────────────────────────────────────────────
-- Table: activity_log
-- Stores recent user activity (for the dashboard feed)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT        NOT NULL,    -- scene | captions | translation | ocr | assistant
  summary     TEXT        NOT NULL,
  icon        TEXT,
  source      TEXT,                    -- api | offline-fallback | mock
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON activity_log(user_id, created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Function: update_updated_at
-- Auto-set updated_at on user_profiles update
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
