"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile, SATScores, ACTScores, BasicStudentInfo } from "@/lib/profile-types";
import { EMPTY_PROFILE, PROFILE_STORAGE_KEY, EMPTY_BASIC_STUDENT_INFO } from "@/lib/profile-types";
import { bandFromEvaluation } from "@/lib/extracurricular-types";
import { setItemAndNotify } from "@/lib/sync-event";

interface ComputedValues {
  gpaUW: string;
  gpaW: string;
  essayCommonApp: string;
  essayVspice: string;
  ecBand: string;
  ecStrength: "low" | "medium" | "high";
  rigor: "low" | "medium" | "high";
}

function readComputedValues(): ComputedValues {
  const result: ComputedValues = {
    gpaUW: "",
    gpaW: "",
    essayCommonApp: "",
    essayVspice: "",
    ecBand: "",
    ecStrength: "medium",
    rigor: "medium",
  };

  try {
    const gpaRaw = localStorage.getItem("gpa-calc-v1");
    if (gpaRaw) {
      const state = JSON.parse(gpaRaw);
      if (state?.years?.length) {
        const COL_UW: Record<string, number> = {
          "A+":4.00,"A":4.00,"A−":3.70,"B+":3.30,"B":3.00,"B−":2.70,
          "C+":2.30,"C":2.00,"C−":1.70,"D+":1.00,"D":1.00,"F":0.00,
        };
        const COL_BONUS: Record<string, number> = { CP:0, Honors:0.5, DE:1.0, HDE:1.0, AP:1.0 };
        let colUW = 0, colW = 0, totalCredits = 0;
        for (const year of state.years) {
          for (const row of year.rows) {
            if (!row.grade || row.nonCore) continue;
            const credits = parseFloat(row.credits) || 1;
            const base = COL_UW[row.grade] ?? 0;
            const isF = row.grade === "F";
            colUW += base * credits;
            colW += (isF ? 0 : base + (COL_BONUS[row.level] ?? 0)) * credits;
            totalCredits += credits;
          }
        }
        if (totalCredits > 0) {
          const computedW = colW / totalCredits;
          result.gpaUW = (colUW / totalCredits).toFixed(2);
          result.gpaW = computedW.toFixed(2);
          result.rigor = computedW >= 4.4 ? "high" : computedW >= 4.0 ? "medium" : "low";
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const essayRaw = localStorage.getItem("essay-grader-result");
    if (essayRaw) {
      const r = JSON.parse(essayRaw);
      if (r?.rawScore != null) result.essayCommonApp = String(r.rawScore);
      if (r?.vspiceComposite != null) result.essayVspice = String(r.vspiceComposite);
    }
  } catch { /* ignore */ }

  try {
    const ecRaw = localStorage.getItem("ec-evaluator-result");
    if (ecRaw) {
      const r = JSON.parse(ecRaw);
      // Derive band from the readiness score — same source-of-truth as the
      // EC evaluator UI. Fall back to r.band only if activities are missing.
      let band: string | undefined;
      if (Array.isArray(r?.activities) && r.activities.length > 0) {
        band = bandFromEvaluation({
          activities: r.activities,
          spikes: Array.isArray(r.spikes) ? r.spikes : [],
        });
      } else if (r?.band) {
        band = r.band;
      }
      if (band) {
        result.ecBand = band;
        const map: Record<string, "low" | "medium" | "high"> = {
          exceptional: "high", strong: "high", solid: "medium", developing: "low", limited: "low",
        };
        result.ecStrength = map[band] ?? "medium";
      }
    }
  } catch { /* ignore */ }

  return result;
}

// Tracks which fields the user has manually edited so auto-sync won't stomp them
const OVERRIDES_KEY = "admitedge-profile-overrides";

interface FieldOverrides {
  gpaUW?: boolean;
  gpaW?: boolean;
  essayCommonApp?: boolean;
  essayVspice?: boolean;
  ecBand?: boolean;
  ecStrength?: boolean;
  rigor?: boolean;
}

function readOverrides(): FieldOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOverrides(o: FieldOverrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
  } catch { /* ignore */ }
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [computed, setComputed] = useState<ComputedValues | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Merge computed values into current profile, respecting overrides
  const syncFromComputed = useCallback(() => {
    const computedVals = readComputedValues();
    const overrides = readOverrides();
    setComputed(computedVals);

    setProfile((prev) => {
      // Merge rule: fresh computed values always win UNLESS the user manually
      // edited that field (tracked in overrides).
      return {
        ...prev,
        gpaUW: overrides.gpaUW ? prev.gpaUW : (computedVals.gpaUW || prev.gpaUW),
        gpaW: overrides.gpaW ? prev.gpaW : (computedVals.gpaW || prev.gpaW),
        essayCommonApp: overrides.essayCommonApp ? prev.essayCommonApp : (computedVals.essayCommonApp || prev.essayCommonApp),
        essayVspice: overrides.essayVspice ? prev.essayVspice : (computedVals.essayVspice || prev.essayVspice),
        ecBand: overrides.ecBand ? prev.ecBand : (computedVals.ecBand || prev.ecBand),
        ecStrength: overrides.ecStrength ? prev.ecStrength : computedVals.ecStrength,
        rigor: overrides.rigor ? prev.rigor : computedVals.rigor,
      };
    });
  }, []);

  // Initial load
  useEffect(() => {
    const computedVals = readComputedValues();
    const overrides = readOverrides();
    setComputed(computedVals);

    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        // Merge rule: fresh computed values always overwrite the saved ones
        // UNLESS the user manually edited that field.
        setProfile({
          ...parsed,
          gpaUW: overrides.gpaUW ? parsed.gpaUW : (computedVals.gpaUW || parsed.gpaUW),
          gpaW: overrides.gpaW ? parsed.gpaW : (computedVals.gpaW || parsed.gpaW),
          essayCommonApp: overrides.essayCommonApp ? parsed.essayCommonApp : (computedVals.essayCommonApp || parsed.essayCommonApp),
          essayVspice: overrides.essayVspice ? parsed.essayVspice : (computedVals.essayVspice || parsed.essayVspice),
          ecBand: overrides.ecBand ? parsed.ecBand : (computedVals.ecBand || parsed.ecBand),
          ecStrength: overrides.ecStrength ? parsed.ecStrength : computedVals.ecStrength,
          rigor: overrides.rigor ? parsed.rigor : computedVals.rigor,
        });
      } else {
        setProfile({
          ...EMPTY_PROFILE,
          gpaUW: computedVals.gpaUW,
          gpaW: computedVals.gpaW,
          essayCommonApp: computedVals.essayCommonApp,
          essayVspice: computedVals.essayVspice,
          ecBand: computedVals.ecBand,
          ecStrength: computedVals.ecStrength,
          rigor: computedVals.rigor,
        });
      }
    } catch {
      setProfile({
        ...EMPTY_PROFILE,
        ...computedVals,
      });
    }

    setLoaded(true);
  }, []);

  // Re-sync when tab regains focus or another tab updates localStorage
  useEffect(() => {
    if (!loaded) return;

    const SOURCE_KEYS = ["gpa-calc-v1", "essay-grader-result", "ec-evaluator-result"];

    // When a source tool produces a fresh result, it should be authoritative —
    // clear stale manual overrides for the fields it owns so auto-sync wins.
    const OVERRIDES_BY_SOURCE: Record<string, Array<keyof FieldOverrides>> = {
      "gpa-calc-v1": ["gpaUW", "gpaW", "rigor"],
      "essay-grader-result": ["essayCommonApp", "essayVspice"],
      "ec-evaluator-result": ["ecBand", "ecStrength"],
    };

    const clearOverridesFor = (key: string) => {
      const fields = OVERRIDES_BY_SOURCE[key];
      if (!fields) return;
      const current = readOverrides();
      let changed = false;
      for (const f of fields) {
        if (current[f]) { delete current[f]; changed = true; }
      }
      if (changed) writeOverrides(current);
    };

    const onFocus = () => syncFromComputed();

    // Cross-tab: StorageEvent
    const onStorage = (e: StorageEvent) => {
      if (e.key && SOURCE_KEYS.includes(e.key)) {
        clearOverridesFor(e.key);
        syncFromComputed();
      }
    };

    // Same-tab: custom event dispatched by setItemAndNotify
    const onSourceUpdated = (e: Event) => {
      const key = (e as CustomEvent).detail?.key;
      if (SOURCE_KEYS.includes(key)) {
        clearOverridesFor(key);
        syncFromComputed();
      }
    };

    // Cloud restore: re-read everything after cloud data loads
    const onCloudLoaded = () => syncFromComputed();

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("profile-source-updated", onSourceUpdated);
    window.addEventListener("cloud-sync-loaded", onCloudLoaded);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("profile-source-updated", onSourceUpdated);
      window.removeEventListener("cloud-sync-loaded", onCloudLoaded);
    };
  }, [loaded, syncFromComputed]);

  // Save on change — notify downstream hooks (chance calc, college filter)
  useEffect(() => {
    if (loaded) {
      setItemAndNotify(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile, loaded]);

  const updateField = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    // Mark auto-synced fields as manually overridden so future auto-syncs
    // don't overwrite the user's edit.
    const autoSyncedKeys: Array<keyof FieldOverrides> = [
      "gpaUW", "gpaW", "essayCommonApp", "essayVspice", "ecBand", "ecStrength", "rigor",
    ];
    if (autoSyncedKeys.includes(key as keyof FieldOverrides)) {
      const overrides = readOverrides();
      overrides[key as keyof FieldOverrides] = true;
      writeOverrides(overrides);
    }
  }, []);

  const updateSAT = useCallback((field: keyof SATScores, value: string) => {
    setProfile((prev) => ({ ...prev, sat: { ...prev.sat, [field]: value } }));
  }, []);

  const updateACT = useCallback((field: keyof ACTScores, value: string) => {
    setProfile((prev) => ({ ...prev, act: { ...prev.act, [field]: value } }));
  }, []);

  const updateBasicInfo = useCallback((patch: Partial<BasicStudentInfo>) => {
    setProfile((prev) => ({
      ...prev,
      basicInfo: { ...(prev.basicInfo ?? EMPTY_BASIC_STUDENT_INFO), ...patch },
    }));
  }, []);

  const resetToComputed = useCallback(() => {
    const fresh = readComputedValues();
    setComputed(fresh);
    setProfile({
      ...EMPTY_PROFILE,
      gpaUW: fresh.gpaUW,
      gpaW: fresh.gpaW,
      essayCommonApp: fresh.essayCommonApp,
      essayVspice: fresh.essayVspice,
      ecBand: fresh.ecBand,
      ecStrength: fresh.ecStrength,
      rigor: fresh.rigor,
    });
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(OVERRIDES_KEY);
  }, []);

  return { profile, computed, loaded, updateField, updateSAT, updateACT, updateBasicInfo, resetToComputed };
}
