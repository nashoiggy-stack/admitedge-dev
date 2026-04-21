"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { InlineSuggestion } from "@/lib/types";
import type { SuggestionFocus } from "@/lib/suggestions-prompt";
import { SUGGESTION_CATEGORIES } from "@/lib/suggestions-prompt";

type IntentGroup = {
  key: string;
  label: string;
  description: string;
  categories: readonly SuggestionFocus[];
};

const INTENT_GROUPS: readonly IntentGroup[] = [
  {
    key: "overall",
    label: "Overall Score",
    description: "Optimize across the full rubric — highest-leverage edits.",
    categories: ["Improve Overall Common App Score", "Improve Overall VSPICE Score"],
  },
  {
    key: "voice",
    label: "Voice",
    description: "Make it sound like you — honest, specific, real.",
    categories: ["Authenticity", "Passion", "Vulnerability", "Selflessness", "Expression"],
  },
  {
    key: "story",
    label: "Story",
    description: "Structure, hook, tension, and landing.",
    categories: ["Compelling Story", "Perseverance", "Initiative", "Curiosity"],
  },
  {
    key: "impact",
    label: "Impact",
    description: "Reflection, values, insight, and ambition.",
    categories: ["Insight", "Values", "Ambition"],
  },
  {
    key: "craft",
    label: "Craft",
    description: "Polish — sentence rhythm, clarity, word count.",
    categories: ["Writing Skills", "Lower Word Count"],
  },
];

// Suppress unused import warning — categories exported for type integrity
void SUGGESTION_CATEGORIES;

const TYPE_COLORS = {
  cut: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", label: "Cut", dot: "bg-red-500" },
  add: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", label: "Add", dot: "bg-emerald-500" },
  rewrite: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400", label: "Rewrite", dot: "bg-blue-500" },
  strengthen: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400", label: "Strengthen", dot: "bg-blue-500" },
} as const;

interface InlineEditorProps {
  readonly essayText: string;
  readonly suggestions: InlineSuggestion[];
  readonly suggestionsLoading: boolean;
  readonly suggestionsError: string;
  readonly activeFocus: SuggestionFocus | null;
  readonly onTextChange: (text: string) => void;
  readonly onFetchSuggestions: (focus: SuggestionFocus) => void;
  readonly onAcceptSuggestion: (index: number) => void;
  readonly onDismissSuggestion: (index: number) => void;
  readonly onClearSuggestions: () => void;
  readonly hasResult: boolean;
  readonly onRegrade: () => void;
  readonly essayModified: boolean;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  essayText, suggestions, suggestionsLoading, suggestionsError, activeFocus,
  onFetchSuggestions, onAcceptSuggestion, onDismissSuggestion, onClearSuggestions,
  hasResult, onRegrade, essayModified,
}) => {
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>("overall");

  const highlightedParts = useMemo(() => {
    if (!suggestions.length) return null;

    const indexed = suggestions
      .map((s, i) => ({ ...s, index: i, pos: essayText.indexOf(s.original) }))
      .filter((s) => s.pos !== -1)
      .sort((a, b) => a.pos - b.pos);

    const parts: { text: string; suggestionIndex: number | null }[] = [];
    let cursor = 0;

    for (const s of indexed) {
      if (s.pos < cursor) continue;
      if (s.pos > cursor) {
        parts.push({ text: essayText.substring(cursor, s.pos), suggestionIndex: null });
      }
      parts.push({ text: s.original, suggestionIndex: s.index });
      cursor = s.pos + s.original.length;
    }
    if (cursor < essayText.length) {
      parts.push({ text: essayText.substring(cursor), suggestionIndex: null });
    }
    return parts;
  }, [essayText, suggestions]);

  const activeS = activeSuggestion !== null ? suggestions[activeSuggestion] : null;
  const activeColors = activeS ? TYPE_COLORS[activeS.type] : null;

  return (
    <div className="space-y-4">
      {/* ── Controls row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={suggestionsLoading}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {suggestionsLoading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Analyzing...
            </>
          ) : (
            "Get Suggestions"
          )}
        </button>

        {suggestions.length > 0 && (
          <>
            <span className="text-xs text-zinc-500">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
              {activeFocus && <> for <span className="text-blue-400">{activeFocus}</span></>}
            </span>
            <button onClick={onClearSuggestions} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Clear all
            </button>
          </>
        )}

        {hasResult && essayModified && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onRegrade}
            className="ml-auto rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors flex items-center gap-2"
          >
            Re-grade
          </motion.button>
        )}
      </div>

      {/* ── Category picker — intent-grouped ──────────────────────── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.08] p-5">
              <p className="text-xs text-zinc-400 font-medium mb-4">What do you want to improve?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INTENT_GROUPS.map((group) => {
                  const isOpen = openGroup === group.key;
                  const hasActive = group.categories.some((c) => c === activeFocus);
                  return (
                    <div key={group.key} className="rounded-xl bg-[#0c0c1a]/90 ring-1 ring-white/[0.05] overflow-hidden">
                      <button
                        onClick={() => setOpenGroup(isOpen ? null : group.key)}
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left transition-[background-color] duration-200 hover:bg-white/[0.03]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-semibold ${hasActive ? "text-blue-300" : "text-zinc-200"}`}>
                            {group.label}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                            {group.description}
                          </p>
                        </div>
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`shrink-0 text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap gap-1.5 px-3.5 pb-3 pt-1">
                              {group.categories.map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => {
                                    setShowPicker(false);
                                    setActiveSuggestion(null);
                                    onFetchSuggestions(cat);
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-[background-color,color] duration-200 ${
                                    activeFocus === cat
                                      ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                                      : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {(Object.entries(TYPE_COLORS) as [keyof typeof TYPE_COLORS, (typeof TYPE_COLORS)[keyof typeof TYPE_COLORS]][]).map(([, c]) => (
            <span key={c.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {suggestionsError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-sm text-red-400">{suggestionsError}</p>
        </div>
      )}

      {/* ── Highlighted essay ─────────────────────────────────────── */}
      {highlightedParts && highlightedParts.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {highlightedParts.map((part, i) => {
            if (part.suggestionIndex === null) {
              return <span key={i}>{part.text}</span>;
            }

            const s = suggestions[part.suggestionIndex];
            const colors = TYPE_COLORS[s.type];
            const isActive = activeSuggestion === part.suggestionIndex;

            return (
              <span
                key={i}
                onClick={() => setActiveSuggestion(isActive ? null : part.suggestionIndex)}
                className={`${colors.bg} border-b-2 ${colors.border} cursor-pointer transition-[background-color,color,opacity,box-shadow] duration-200 hover:opacity-80 ${
                  s.type === "cut" ? "line-through decoration-red-500/50" : ""
                } ${isActive ? "ring-1 ring-offset-1 ring-offset-transparent " + colors.border : ""}`}
              >
                {part.text}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Active suggestion detail (below the essay, not floating) ── */}
      <AnimatePresence>
        {activeS && activeColors && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl bg-[#12121f] border border-white/[0.08] p-5 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${activeColors.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${activeColors.text}`}>
                {activeColors.label}
              </span>
            </div>

            <p className="text-sm text-zinc-400 mb-3">{activeS.reason}</p>

            {activeS.type === "cut" ? (
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 mb-4">
                <p className="text-xs text-zinc-500 mb-1">Will remove:</p>
                <p className="text-sm text-red-400 line-through">{activeS.original}</p>
              </div>
            ) : activeS.replacement ? (
              <div className="rounded-lg bg-[#1a1a2e] border border-white/[0.08] p-3 mb-4">
                <p className="text-xs text-zinc-500 mb-1">
                  {activeS.type === "add" ? "Will insert after the highlighted text:" : "Will replace with:"}
                </p>
                <p className={`text-sm ${activeColors.text}`}>{activeS.replacement}</p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={() => { onAcceptSuggestion(activeSuggestion!); setActiveSuggestion(null); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-opacity hover:opacity-80 ${activeColors.bg} ${activeColors.text} ring-1 ${activeColors.border}`}
              >
                Accept
              </button>
              <button
                onClick={() => { onDismissSuggestion(activeSuggestion!); setActiveSuggestion(null); }}
                className="flex-1 rounded-lg bg-[#0c0c1a]/90 text-zinc-500 py-2 text-sm font-semibold hover:text-zinc-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
