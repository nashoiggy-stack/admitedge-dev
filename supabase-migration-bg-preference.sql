-- Phase 6 — Background picker preference column
-- Adds bg_preference to user_profiles for cross-device sync of the
-- background-picker choice. Additive + backward compatible: existing rows
-- get the default 'shader' (the WebGL shader background); main can ignore
-- the column safely until this migration is applied locally.

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS bg_preference TEXT DEFAULT 'shader';
