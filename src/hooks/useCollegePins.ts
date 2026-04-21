"use client";

import { useState, useEffect, useCallback } from "react";
import type { PinnedCollege, ApplicationPlan } from "@/lib/college-types";
import { PINNED_COLLEGES_KEY } from "@/lib/college-types";

function readPinned(): PinnedCollege[] {
  try {
    const raw = localStorage.getItem(PINNED_COLLEGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PinnedCollege =>
        typeof p?.name === "string" && typeof p?.pinnedAt === "number",
    );
  } catch {
    return [];
  }
}

function writePinned(list: PinnedCollege[]): void {
  try {
    localStorage.setItem(PINNED_COLLEGES_KEY, JSON.stringify(list));
  } catch {
    // Quota or disabled — silently degrade.
  }
}

export interface UseCollegePinsReturn {
  readonly pinned: readonly PinnedCollege[];
  readonly loaded: boolean;
  readonly isPinned: (name: string) => boolean;
  readonly togglePin: (name: string) => void;
  readonly setPlanFor: (name: string, plan: ApplicationPlan | undefined) => void;
  readonly clearAll: () => void;
}

export function useCollegePins(): UseCollegePinsReturn {
  const [pinned, setPinned] = useState<PinnedCollege[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load + cross-tab sync
  useEffect(() => {
    setPinned(readPinned());
    setLoaded(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === PINNED_COLLEGES_KEY) setPinned(readPinned());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) writePinned(pinned);
  }, [pinned, loaded]);

  const isPinned = useCallback(
    (name: string) => pinned.some((p) => p.name === name),
    [pinned],
  );

  const togglePin = useCallback((name: string) => {
    setPinned((prev) => {
      const existing = prev.find((p) => p.name === name);
      if (existing) {
        return prev.filter((p) => p.name !== name);
      }
      return [...prev, { name, pinnedAt: Date.now() }];
    });
  }, []);

  const setPlanFor = useCallback(
    (name: string, plan: ApplicationPlan | undefined) => {
      setPinned((prev) =>
        prev.map((p) =>
          p.name === name ? { ...p, applicationPlan: plan } : p,
        ),
      );
    },
    [],
  );

  const clearAll = useCallback(() => setPinned([]), []);

  return { pinned, loaded, isPinned, togglePin, setPlanFor, clearAll };
}
