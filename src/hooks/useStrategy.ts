"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  StrategyProfile,
  StrategyAnalysis,
  StrategyResult,
} from "@/lib/strategy-types";
import { STRATEGY_CACHE_KEY, STRATEGY_CACHE_VERSION } from "@/lib/strategy-types";
import { readStrategyProfile } from "@/lib/strategy-profile";
import { runStrategyAnalysis } from "@/lib/strategy-engine";

// ── Content-hash cache ─────────────────────────────────────────────────────
// Same pattern as useGrading: hash the input StrategyProfile so regenerating
// against an unchanged profile returns instantly. Profile changes → new hash
// → fresh call.

function hashInput(profile: StrategyProfile): string {
  // djb2 over a deterministic JSON projection of the fields that actually
  // matter for strategy generation. Excludes timestamps/booleans that would
  // flap without changing the analysis.
  const projected = {
    gpa: profile.gpa,
    tests: profile.tests,
    ec: profile.ec
      ? {
          band: profile.ec.band,
          spikes: profile.ec.spikes,
          activities: profile.ec.activities.map((a) => ({
            name: a.activityName,
            tier: a.tier,
            scores: a.scores,
          })),
        }
      : null,
    essay: profile.essay
      ? {
          summaryScore: profile.essay.summaryScore,
          vspice: profile.essay.vspice,
          latestId: profile.essay.latest?.rawScore ?? null,
        }
      : null,
    pinned: profile.pinnedSchools.map((s) => s.pin.name).sort(),
  };
  const str = JSON.stringify(projected);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(profile: StrategyProfile): string {
  return `${STRATEGY_CACHE_KEY}:${STRATEGY_CACHE_VERSION}:${hashInput(profile)}`;
}

function readCached(profile: StrategyProfile): StrategyResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(profile));
    return raw ? (JSON.parse(raw) as StrategyResult) : null;
  } catch {
    return null;
  }
}

function writeCached(profile: StrategyProfile, result: StrategyResult): void {
  try {
    localStorage.setItem(cacheKey(profile), JSON.stringify(result));
  } catch {
    // Quota or disabled — silently degrade.
  }
}

// ── Stable "last result" persistence ────────────────────────────────────────
// The hash-based cache only hits when the profile is byte-identical to the
// generation that produced the result. If any field drifts between sessions
// (GPA recalculation, essay timestamp, etc.) the hash misses and the user
// sees an empty page. This stable key always holds the most recent result
// regardless of profile changes, so the user never loses their strategy.
const LAST_RESULT_KEY = "admitedge-strategy-last-result";

function readLastResult(): StrategyResult | null {
  try {
    const raw = localStorage.getItem(LAST_RESULT_KEY);
    return raw ? (JSON.parse(raw) as StrategyResult) : null;
  } catch {
    return null;
  }
}

function writeLastResult(result: StrategyResult): void {
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
  } catch {
    // Quota or disabled — silently degrade.
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseStrategyReturn {
  readonly profile: StrategyProfile | null;
  readonly analysis: StrategyAnalysis | null;
  readonly result: StrategyResult | null;
  readonly loading: boolean;
  readonly error: string;
  readonly generate: (opts?: { bypassCache?: boolean }) => Promise<void>;
  readonly refresh: () => void;
}

export function useStrategy(): UseStrategyReturn {
  const [profile, setProfile] = useState<StrategyProfile | null>(null);
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load profile + analysis + cached/last result on mount and refresh()
  const refresh = useCallback(() => {
    try {
      const p = readStrategyProfile();
      const a = runStrategyAnalysis(p);
      setProfile(p);
      setAnalysis(a);
      // 1. Try exact-match hash cache (profile unchanged since last gen)
      const cached = readCached(p);
      if (cached) {
        setResult(cached);
      } else {
        // 2. Fall back to the most recent result regardless of profile drift.
        // This ensures the user always sees their last strategy on page load
        // even if some field (GPA recalc, essay timestamp, etc.) shifted the
        // profile hash since the last generation.
        const last = readLastResult();
        setResult(last);
      }
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to read profile data.",
      );
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(
    async (opts: { bypassCache?: boolean } = {}) => {
      // Always rebuild profile+analysis at generate time so we use the
      // latest data, not the snapshot from mount.
      const p = readStrategyProfile();
      const a = runStrategyAnalysis(p);
      setProfile(p);
      setAnalysis(a);
      setError("");

      if (!opts.bypassCache) {
        const cached = readCached(p);
        if (cached) {
          setResult(cached);
          return;
        }
      }

      setLoading(true);
      // Abort at 290s — just below the serverless maxDuration of 300s.
      // This gives us a clean client-side error instead of waiting for the
      // browser's default fetch timeout.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 290_000);
      try {
        const res = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: p, analysis: a }),
          signal: controller.signal,
        });
        // Detect the 504 Gateway Timeout that Vercel sends when the serverless
        // function times out. Body is usually HTML, not JSON, so parse safely.
        if (res.status === 504) {
          setError(
            "Generation timed out on the server. Opus is slow on large profiles — try again, or trim unused data (activities, essays) for a faster run.",
          );
          return;
        }
        let data: { error?: string } & Partial<StrategyResult>;
        try {
          data = await res.json();
        } catch {
          setError(
            `Server returned an unexpected response (${res.status}). Try again in a moment.`,
          );
          return;
        }
        if (!res.ok) {
          setError(data.error || `Request failed (${res.status}). Try again.`);
          return;
        }
        const parsed = data as StrategyResult;
        setResult(parsed);
        writeCached(p, parsed);
        writeLastResult(parsed);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setError(
            "Generation took longer than 5 minutes and was cancelled. This is unusual — try again, or contact support if it keeps happening.",
          );
        } else {
          setError("Network error. Check your connection and try again.");
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [],
  );

  return { profile, analysis, result, loading, error, generate, refresh };
}
