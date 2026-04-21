"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedEssay, GradingResult } from "@/lib/types";

const STORAGE_KEY = "essay-grader-history";

function loadHistory(): SavedEssay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(essays: SavedEssay[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essays));
  } catch (e) {
    console.warn("Could not save essay history:", e);
  }
}

function generateTitle(text: string): string {
  // Use the first ~40 characters of the essay as the title
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 40) return clean || "Untitled Essay";
  return clean.slice(0, 40).trim() + "...";
}

interface UseEssayHistoryReturn {
  readonly essays: SavedEssay[];
  readonly save: (essayText: string, result: GradingResult) => void;
  readonly load: (id: string) => SavedEssay | null;
  readonly remove: (id: string) => void;
  readonly rename: (id: string, newTitle: string) => void;
}

export function useEssayHistory(): UseEssayHistoryReturn {
  const [essays, setEssays] = useState<SavedEssay[]>([]);

  // Load on mount
  useEffect(() => {
    setEssays(loadHistory());
  }, []);

  const save = useCallback((essayText: string, result: GradingResult) => {
    const newEssay: SavedEssay = {
      id: crypto.randomUUID(),
      title: generateTitle(essayText),
      essayText,
      result,
      savedAt: Date.now(),
    };

    setEssays((prev) => {
      const updated = [newEssay, ...prev];
      persistHistory(updated);
      return updated;
    });
  }, []);

  const load = useCallback((id: string): SavedEssay | null => {
    return essays.find((e) => e.id === id) ?? null;
  }, [essays]);

  const remove = useCallback((id: string) => {
    setEssays((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      persistHistory(updated);
      return updated;
    });
  }, []);

  const rename = useCallback((id: string, newTitle: string) => {
    setEssays((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, title: newTitle } : e
      );
      persistHistory(updated);
      return updated;
    });
  }, []);

  return { essays, save, load, remove, rename };
}
