-- Run this in your Supabase Dashboard → SQL Editor
-- This creates the user_profiles table for cross-device sync

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  gpa_data JSONB DEFAULT NULL,
  essay_data JSONB DEFAULT NULL,
  ec_activities JSONB DEFAULT NULL,
  ec_result JSONB DEFAULT NULL,
  resume_data JSONB DEFAULT NULL,
  essay_history JSONB DEFAULT NULL,
  pinned_colleges JSONB DEFAULT NULL,
  dream_school TEXT DEFAULT NULL,
  strategy_result JSONB DEFAULT NULL,
  action_checklist JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
