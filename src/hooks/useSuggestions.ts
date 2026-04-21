"use client";

import { useState } from "react";
import type { InlineSuggestion } from "@/lib/types";
import type { SuggestionFocus } from "@/lib/suggestions-prompt";

interface UseSuggestionsReturn {
  readonly suggestions: InlineSuggestion[];
  readonly loading: boolean;
  readonly error: string;
  readonly activeFocus: SuggestionFocus | null;
  readonly fetch: (essayText: string, focus: SuggestionFocus) => Promise<void>;
  readonly clear: () => void;
  readonly accept: (index: number) => string | null;
  readonly dismiss: (index: number) => void;
}

export function useSuggestions(essayText: string): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFocus, setActiveFocus] = useState<SuggestionFocus | null>(null);

  const fetchSuggestions = async (text: string, focus: SuggestionFocus) => {
    setError("");
    setSuggestions([]);
    setActiveFocus(focus);
    setLoading(true);

    // 4-minute client timeout — Opus can take 30-90s per call, and the
    // 2-stage pipeline doubles that. Browser default (~60s) is too short.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayText: text, focus }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to get suggestions.");
        return;
      }

      // Filter to only suggestions whose original text actually exists in the essay.
      // Normalize whitespace for matching (model sometimes collapses newlines or
      // extra spaces) but keep the original text for display/replacement.
      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      const normalizedEssay = normalize(text);

      const all: InlineSuggestion[] = data.suggestions || [];
      const valid = all.filter((s: InlineSuggestion) => {
        // Try exact match first
        if (text.includes(s.original)) return true;
        // Try whitespace-normalized match
        if (normalizedEssay.includes(normalize(s.original))) return true;
        return false;
      });

      // Fix originals that only matched after normalization — find the actual
      // substring in the essay so accept/dismiss works correctly.
      for (const s of valid) {
        if (!text.includes(s.original)) {
          const normOrig = normalize(s.original);
          // Find the position in the normalized essay, then map back
          const idx = normalizedEssay.indexOf(normOrig);
          if (idx !== -1) {
            // Walk through the original text to find the matching span
            let origIdx = 0, normIdx = 0;
            while (normIdx < idx && origIdx < text.length) {
              if (/\s/.test(text[origIdx])) {
                // consume all whitespace in original, one space in normalized
                while (origIdx < text.length && /\s/.test(text[origIdx])) origIdx++;
                normIdx++; // the single space in normalized
              } else {
                origIdx++;
                normIdx++;
              }
            }
            const start = origIdx;
            let matchLen = 0;
            normIdx = 0;
            while (normIdx < normOrig.length && (start + matchLen) < text.length) {
              if (/\s/.test(text[start + matchLen])) {
                while ((start + matchLen) < text.length && /\s/.test(text[start + matchLen])) matchLen++;
                normIdx++; // single space
              } else {
                matchLen++;
                normIdx++;
              }
            }
            s.original = text.substring(start, start + matchLen);
          }
        }
      }

      setSuggestions(valid);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. The AI is taking too long — please try again.");
      } else {
        setError("Network error getting suggestions.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const accept = (index: number): string | null => {
    const s = suggestions[index];
    if (!s) return null;

    let newText: string;
    if (s.type === "cut") {
      newText = essayText.replace(s.original, "").replace(/  +/g, " ").trim();
    } else if (s.type === "add") {
      newText = essayText.replace(s.original, s.original + " " + s.replacement);
    } else {
      newText = essayText.replace(s.original, s.replacement);
    }

    // Remove the accepted suggestion and update any others whose original text still exists
    setSuggestions((prev) =>
      prev.filter((_, i) => i !== index).filter((sg) => newText.includes(sg.original))
    );

    return newText;
  };

  const dismiss = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const clear = () => {
    setSuggestions([]);
    setActiveFocus(null);
    setError("");
  };

  return {
    suggestions,
    loading,
    error,
    activeFocus,
    fetch: fetchSuggestions,
    clear,
    accept,
    dismiss,
  };
}
