"use client";

import { useState, useRef } from "react";
import type { GradingResult } from "@/lib/types";
import { APP_CONFIG } from "@/data/mockData";
import { setItemAndNotify } from "@/lib/sync-event";

// ── UNDO [grade-cache] ──────────────────────────────────────────────────────
// Client-side content-hash cache: same essay text → same cached result →
// same score every time. Fixes the "grade the same essay 3 times, get 3
// scores" problem caused by temperature:0 being only near-deterministic on
// Anthropic's API (no seed param available).
//
// To revert: delete this block AND the two call sites inside grade() marked
// with `UNDO [grade-cache]`.
//
// To invalidate every user's cache without a deploy: bump GRADING_CACHE_VERSION
// — the next read will miss and the next grade will refresh the cached entry.
// ────────────────────────────────────────────────────────────────────────────

// Bump when the grading prompt changes materially so cached scores don't
// stick around with the old calibration. v4 = strict grading restored.
const GRADING_CACHE_VERSION = "v5";
const GRADING_CACHE_PREFIX = "essay-grader-cache";

function hashEssay(text: string): string {
  // djb2 — not cryptographic, just a stable string key for localStorage
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function gradingCacheKey(text: string): string {
  return `${GRADING_CACHE_PREFIX}:${GRADING_CACHE_VERSION}:${hashEssay(text)}`;
}

function readCachedGrade(text: string): GradingResult | null {
  try {
    const raw = localStorage.getItem(gradingCacheKey(text));
    return raw ? (JSON.parse(raw) as GradingResult) : null;
  } catch {
    return null;
  }
}

function writeCachedGrade(text: string, result: GradingResult): void {
  try {
    localStorage.setItem(gradingCacheKey(text), JSON.stringify(result));
  } catch {
    // Quota exceeded or disabled — cache silently degrades, grading still works.
  }
}
// end UNDO [grade-cache]

interface UseGradingReturn {
  readonly result: GradingResult | null;
  readonly loading: boolean;
  readonly error: string;
  readonly errorCode: string | null;
  readonly canRetry: boolean;
  readonly grade: (essayText: string, file: File | null) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly reset: () => void;
  readonly loadResult: (result: GradingResult) => void;
}

export function useGrading(): UseGradingReturn {
  const [result, setResult] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const lastArgsRef = useRef<{ essayText: string; file: File | null } | null>(null);

  const grade = async (essayText: string, file: File | null) => {
    setError("");
    setErrorCode(null);
    setResult(null);

    const hasFile = file && file.size > 0;
    const hasText = essayText.trim().length > 0;

    if (!hasFile && !hasText) {
      setError("Please paste your essay or upload a PDF/Doc file.");
      setErrorCode("EMPTY_INPUT");
      return;
    }

    lastArgsRef.current = { essayText, file };

    // UNDO [grade-cache]: delete this block to always hit the API.
    // Cache lookup: text-input only (file uploads have no stable client hash
    // without parsing them first). If we have a cached result for this exact
    // essay text, return it immediately — no loading state, no API call.
    if (!hasFile && hasText) {
      const trimmed = essayText.trim();
      const cached = readCachedGrade(trimmed);
      if (cached) {
        setResult(cached);
        // Mirror the side-effect the API path writes so Chance Calculator
        // auto-fill stays consistent.
        try {
          setItemAndNotify("essay-grader-result", JSON.stringify({
            rawScore: cached.rawScore,
            vspiceComposite: cached.vspiceComposite,
          }));
        } catch {}
        return;
      }
    }
    // end UNDO [grade-cache]

    setLoading(true);

    try {
      let res: Response;

      if (hasFile) {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch(APP_CONFIG.gradeEndpoint, { method: "POST", body: fd });
      } else {
        res = await fetch(APP_CONFIG.gradeEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: essayText }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setErrorCode(`HTTP_${res.status}`);
        return;
      }

      setResult(data as GradingResult);

      // UNDO [grade-cache]: delete this if-block to stop writing cached grades.
      // Write-through: store the fresh result keyed by essay text so the
      // next rapid-fire re-grade returns the exact same scores.
      if (!hasFile && hasText) {
        writeCachedGrade(essayText.trim(), data as GradingResult);
      }

      // Save scores to localStorage so Chance Calculator can auto-fill essay strength
      try {
        setItemAndNotify("essay-grader-result", JSON.stringify({
          rawScore: (data as GradingResult).rawScore,
          vspiceComposite: (data as GradingResult).vspiceComposite,
        }));
      } catch {}
    } catch {
      setError("Network error. Please check your connection.");
      setErrorCode("NETWORK");
    } finally {
      setLoading(false);
    }
  };

  const retry = async () => {
    if (!lastArgsRef.current) return;
    const { essayText, file } = lastArgsRef.current;
    await grade(essayText, file);
  };

  const reset = () => {
    setResult(null);
    setError("");
    setErrorCode(null);
  };

  const loadResult = (savedResult: GradingResult) => {
    setResult(savedResult);
    setError("");
    setErrorCode(null);
  };

  return {
    result,
    loading,
    error,
    errorCode,
    canRetry: !!lastArgsRef.current && errorCode !== "EMPTY_INPUT",
    grade,
    retry,
    reset,
    loadResult,
  };
}
