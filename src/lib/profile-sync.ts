"use client";

import { supabase } from "./supabase";
import { PROFILE_STORAGE_KEY } from "./profile-types";

const SYNC_DEBOUNCE_MS = 2000;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

// ── All localStorage keys that participate in cloud sync ──────────────────
// Maps localStorage key → Supabase column name.
export const CLOUD_SYNC_MAP: Record<string, string> = {
  [PROFILE_STORAGE_KEY]:              "profile_data",
  "gpa-calc-v1":                      "gpa_data",
  "essay-grader-result":              "essay_data",
  "ec-evaluator-activities":          "ec_activities",
  "ec-evaluator-result":              "ec_result",
  "admitedge-resume":                 "resume_data",
  "essay-grader-history":             "essay_history",
  "admitedge-pinned-colleges":        "pinned_colleges",
  "admitedge-dream-school":           "dream_school",
  "admitedge-strategy-last-result":   "strategy_result",
  "admitedge-strategy-action-checklist": "action_checklist",
  "admitedge-bg-preference":           "bg_preference",
};

/** All localStorage keys tracked by cloud sync. */
export const SYNC_KEYS = Object.keys(CLOUD_SYNC_MAP);

// ── Save to Supabase (debounced) ────────────────────────────────────────────

export function scheduleSyncToCloud(userId: string) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncToCloud(userId), SYNC_DEBOUNCE_MS);
}

async function syncToCloud(userId: string) {
  try {
    // Build upsert payload from all tracked localStorage keys
    const row: Record<string, unknown> = { user_id: userId };

    for (const [lsKey, column] of Object.entries(CLOUD_SYNC_MAP)) {
      const raw = localStorage.getItem(lsKey);
      if (raw === null) {
        row[column] = null;
        continue;
      }
      // dream_school and bg_preference are stored as plain strings, not JSON
      if (column === "dream_school" || column === "bg_preference") {
        row[column] = raw.startsWith('"') ? JSON.parse(raw) : raw;
      } else {
        try { row[column] = JSON.parse(raw); } catch { row[column] = null; }
      }
    }

    const { error } = await supabase
      .from("user_profiles")
      .upsert(row, { onConflict: "user_id" });

    if (error) console.warn("Cloud sync failed:", error.message);
  } catch (e) {
    console.warn("Cloud sync error:", e);
  }
}

// ── Load from Supabase ──────────────────────────────────────────────────────
// Cloud-first: always overwrites localStorage with cloud data on sign-in.
// This ensures the user sees the same state on every device/browser.

export async function loadFromCloud(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("profile_data, gpa_data, essay_data, ec_activities, ec_result, resume_data, essay_history, pinned_colleges, dream_school, strategy_result, action_checklist, bg_preference, updated_at")
      .eq("user_id", userId)
      .single();

    if (error || !data) return false;

    // Write each cloud column back to its localStorage key
    const row = data as Record<string, unknown>;
    for (const [lsKey, column] of Object.entries(CLOUD_SYNC_MAP)) {
      const value = row[column];
      if (value === null || value === undefined) continue;

      if (column === "dream_school" || column === "bg_preference") {
        // Stored as plain strings
        localStorage.setItem(lsKey, typeof value === "string" ? value : String(value));
      } else {
        localStorage.setItem(lsKey, JSON.stringify(value));
      }
    }

    return true;
  } catch (e) {
    console.warn("Cloud load error:", e);
    return false;
  }
}
