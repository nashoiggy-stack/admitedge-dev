-- Run this in your Supabase Dashboard → SQL Editor
-- Adds missing columns to user_profiles for full cross-device sync

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS resume_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS essay_history JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pinned_colleges JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dream_school TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS strategy_result JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_checklist JSONB DEFAULT NULL;
