"use client";

import { useState, useEffect, useCallback } from "react";
import { DREAM_SCHOOL_KEY } from "@/lib/strategy-types";

export interface UseDreamSchoolReturn {
  readonly dreamSchool: string | null;
  readonly loaded: boolean;
  readonly setDreamSchool: (name: string | null) => void;
  readonly clear: () => void;
}

/**
 * Persists the user's single selected dream school name in localStorage.
 * The Strategy Engine reads this separately and passes it to the LLM prompt
 * so the dream-school card gets a dedicated decision block.
 *
 * Only one dream school at a time — picking a new one replaces the old.
 */
export function useDreamSchool(): UseDreamSchoolReturn {
  const [dreamSchool, setDreamSchoolState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DREAM_SCHOOL_KEY);
      if (raw) {
        // Accept both plain string and JSON-quoted for backward compat.
        const trimmed = raw.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          setDreamSchoolState(JSON.parse(trimmed) as string);
        } else if (trimmed.length > 0) {
          setDreamSchoolState(trimmed);
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);

    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === DREAM_SCHOOL_KEY) {
        setDreamSchoolState(e.newValue || null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setDreamSchool = useCallback((name: string | null) => {
    setDreamSchoolState(name);
    try {
      if (name) {
        localStorage.setItem(DREAM_SCHOOL_KEY, name);
      } else {
        localStorage.removeItem(DREAM_SCHOOL_KEY);
      }
    } catch {
      // Quota or disabled — silently degrade.
    }
  }, []);

  const clear = useCallback(() => setDreamSchool(null), [setDreamSchool]);

  return { dreamSchool, loaded, setDreamSchool, clear };
}
