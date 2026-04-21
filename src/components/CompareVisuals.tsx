"use client";

import React, { useState, useMemo, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, ChevronDown, Info } from "lucide-react";
import { COLLEGES } from "@/data/colleges";

// ── Per-school color system ─────────────────────────────────────────────────
//
// Each selected school gets a consistent color that carries through every
// bar, card, chart, and header. This is THE primary visual tracking signal
// — users identify "their school" by color, not by reading name labels.
//
// 4 distinct hues chosen for dark-theme legibility + color-blind safety:
//   Slot 0 = blue    (primary, trustworthy)
//   Slot 1 = emerald (positive, distinct from blue)
//   Slot 2 = amber   (warm, distinct from cool tones)
//   Slot 3 = violet  (unique, doesn't clash with the above)

export const SCHOOL_COLORS = [
  { name: "blue",    bar: "from-blue-500 to-blue-400",    bg: "bg-blue-500/8",    border: "border-blue-500/25",  text: "text-blue-300",    dot: "bg-blue-400",    hex: "#60a5fa" },
  { name: "emerald", bar: "from-emerald-500 to-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/25", text: "text-emerald-300", dot: "bg-emerald-400", hex: "#34d399" },
  { name: "amber",   bar: "from-amber-500 to-amber-400",  bg: "bg-amber-500/8",   border: "border-amber-500/25", text: "text-amber-300",   dot: "bg-amber-400",   hex: "#fbbf24" },
  { name: "violet",  bar: "from-violet-500 to-violet-400", bg: "bg-violet-500/8",  border: "border-violet-500/25", text: "text-violet-300",  dot: "bg-violet-400",  hex: "#a78bfa" },
] as const;

export type SchoolColor = (typeof SCHOOL_COLORS)[number];

/** Map school name → assigned color index. Built from the selection order. */
export function buildSchoolColorMap(names: readonly string[]): Map<string, SchoolColor> {
  const map = new Map<string, SchoolColor>();
  names.forEach((name, i) => map.set(name, SCHOOL_COLORS[i % SCHOOL_COLORS.length]));
  return map;
}

// React context so all nested components can access school colors without prop drilling
const SchoolColorCtx = createContext<Map<string, SchoolColor>>(new Map());
export const SchoolColorProvider = SchoolColorCtx.Provider;
export function useSchoolColor(name: string): SchoolColor {
  const map = useContext(SchoolColorCtx);
  return map.get(name) ?? SCHOOL_COLORS[0];
}

// ── Normalization + rank system ─────────────────────────────────────────────
//
// All bars use RELATIVE normalization among the selected schools:
//   highest value → 100% width
//   others → proportional to highest
//
// Rank coloring:
//   best → crown icon (no bar color change — bar uses SCHOOL color)
//   close values (within 5%) → no crown

type BarEntry = { name: string; value: number };

interface NormalizedEntry extends BarEntry {
  normalized: number;  // 0-1 relative to the group
  rank: "best" | "mid" | "worst" | "neutral"; // neutral = close values
}

const RANK_COLORS = {
  best: "from-emerald-500/90 to-emerald-400/80",
  mid: "from-blue-500/60 to-blue-400/50",
  worst: "from-red-500/40 to-red-400/30",
  neutral: "from-zinc-400/40 to-zinc-400/30",
} as const;

const RANK_TEXT = {
  best: "text-emerald-200",
  mid: "text-zinc-200",
  worst: "text-zinc-300",
  neutral: "text-zinc-300",
} as const;

function normalizeEntries(
  entries: readonly BarEntry[],
  invertBest: boolean,
): readonly NormalizedEntry[] {
  const validValues = entries.map((e) => e.value).filter((v) => v > 0);
  if (validValues.length === 0) {
    return entries.map((e) => ({ ...e, normalized: 0, rank: "neutral" as const }));
  }

  const maxVal = Math.max(...validValues);
  const minVal = Math.min(...validValues);
  const range = maxVal - minVal;

  // If values are very close (within 5% of the max), treat all as neutral
  const isClose = range < maxVal * 0.05;

  const bestVal = invertBest ? minVal : maxVal;
  const worstVal = invertBest ? maxVal : minVal;

  return entries.map((e) => {
    // Normalize: 0-1 relative to the group (highest = 1)
    const normalized = maxVal > 0 ? e.value / maxVal : 0;

    let rank: NormalizedEntry["rank"];
    if (e.value === 0) {
      rank = "neutral";
    } else if (isClose) {
      rank = "neutral";
    } else if (e.value === bestVal) {
      rank = "best";
    } else if (e.value === worstVal) {
      rank = "worst";
    } else {
      rank = "mid";
    }

    return { ...e, normalized, rank };
  });
}

// ── MetricBar — the core visual comparison element ─────────────────────────

interface MetricBarProps {
  readonly entries: readonly BarEntry[];
  readonly format?: (v: number) => string;
  readonly invertBest?: boolean;
  readonly showCrown?: boolean;
}

export function MetricBar({
  entries,
  format = (v) => String(v),
  invertBest = false,
  showCrown = true,
}: MetricBarProps) {
  const normalized = useMemo(
    () => normalizeEntries(entries, invertBest),
    [entries, invertBest],
  );

  const colorMap = useContext(SchoolColorCtx);

  return (
    <div className="space-y-1.5">
      {normalized.map((entry) => {
        const pct = Math.max(3, entry.normalized * 100);
        // Use per-school color if available, fall back to rank-based
        const schoolColor = colorMap.get(entry.name);
        const barGradient = schoolColor ? schoolColor.bar : RANK_COLORS[entry.rank];
        const isBest = entry.rank === "best" && showCrown;

        return (
          <div key={entry.name} className="flex items-center gap-2.5 group">
            <div className="flex items-center gap-1.5 w-16 sm:w-24 shrink-0 justify-end">
              {schoolColor && (
                <span className={`w-2 h-2 rounded-full ${schoolColor.dot} shrink-0`} />
              )}
              <span className="text-[10px] text-zinc-400 truncate font-medium">
                {shortName(entry.name)}
              </span>
            </div>
            <div className="flex-1 h-8 rounded-lg bg-white/[0.03] overflow-hidden relative group-hover:bg-white/[0.05] transition-colors duration-150">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className={`h-full rounded-lg bg-gradient-to-r ${barGradient} ${
                  isBest ? "opacity-100" : "opacity-75"
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-between px-2.5">
                <span className={`text-[12px] font-mono tabular-nums font-bold ${
                  schoolColor ? "text-white" : "text-zinc-200"
                }`}>
                  {entry.value > 0 ? format(entry.value) : "—"}
                </span>
                {isBest && <Crown className="w-3 h-3 text-amber-300/80" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Range bar (for SAT/ACT — shows 25th-75th as a range segment) ───────────

interface RangeBarEntry {
  name: string;
  low: number;
  high: number;
}

interface RangeBarProps {
  readonly entries: readonly RangeBarEntry[];
  readonly globalMin: number;
  readonly globalMax: number;
  readonly format?: (low: number, high: number) => string;
}

export function RangeBar({
  entries,
  globalMin,
  globalMax,
  format = (lo, hi) => `${lo}–${hi}`,
}: RangeBarProps) {
  const colorMap = useContext(SchoolColorCtx);
  const range = globalMax - globalMin || 1;
  const bestHigh = Math.max(...entries.map((e) => e.high));
  const isClose = (bestHigh - Math.min(...entries.map((e) => e.high))) < range * 0.03;

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const leftPct = ((entry.low - globalMin) / range) * 100;
        const widthPct = Math.max(3, ((entry.high - entry.low) / range) * 100);
        const isBest = entry.high === bestHigh && !isClose;
        const schoolColor = colorMap.get(entry.name);
        const barGradient = schoolColor ? schoolColor.bar : (isBest ? RANK_COLORS.best : RANK_COLORS.mid);

        return (
          <div key={entry.name} className="flex items-center gap-2.5 group">
            <div className="flex items-center gap-1.5 w-16 sm:w-24 shrink-0 justify-end">
              {schoolColor && (
                <span className={`w-2 h-2 rounded-full ${schoolColor.dot} shrink-0`} />
              )}
              <span className="text-[10px] text-zinc-400 truncate font-medium">
                {shortName(entry.name)}
              </span>
            </div>
            <div className="flex-1 h-8 rounded-lg bg-white/[0.03] overflow-hidden relative group-hover:bg-white/[0.05] transition-colors duration-150">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className={`absolute top-0 bottom-0 rounded-md bg-gradient-to-r ${barGradient} ${
                  isBest ? "opacity-100" : "opacity-75"
                }`}
                style={{ left: `${leftPct}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-2.5">
                <span className="text-[12px] font-mono tabular-nums font-bold text-white">
                  {format(entry.low, entry.high)}
                </span>
                {isBest && <Crown className="w-3 h-3 text-amber-300/80" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Metric card — large number + label ──────────────────────────────────────

interface MetricCardProps {
  readonly value: string;
  readonly label: string;
  readonly context?: string;
  readonly isBest?: boolean;
  readonly color?: string;
}

export function MetricCard({
  value,
  label,
  context,
  isBest = false,
  color = "text-zinc-100",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl p-3.5 transition-all duration-200 ${
        isBest
          ? "bg-emerald-500/[0.05] border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
          : "bg-white/[0.02] border border-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className={`text-xl sm:text-2xl font-bold font-mono tabular-nums leading-none ${color}`}>
          {value}
        </p>
        {isBest && <Crown className="w-3 h-3 text-amber-300/70 shrink-0 mt-1" />}
      </div>
      <p className="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-[0.1em] leading-snug">
        {label}
      </p>
      {context && (
        <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">{context}</p>
      )}
    </div>
  );
}

// ── Expandable comparison section ───────────────────────────────────────────

export function CompareSection({
  title,
  defaultExpanded = true,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <h3 className="text-[12px] font-bold text-zinc-200 uppercase tracking-[0.12em]">
          {title}
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
            expanded ? "" : "-rotate-90"
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Row with context tooltip ────────────────────────────────────────────────

export function CompareRow({
  label,
  context,
  children,
}: {
  label: string;
  context?: string;
  children: React.ReactNode;
}) {
  const [showContext, setShowContext] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-500 font-semibold">
          {label}
        </p>
        {context && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Why this matters"
            >
              <Info className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showContext && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute left-0 top-full mt-1 w-56 z-10 rounded-lg bg-[#0a0a14] border border-white/[0.1] p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                >
                  <p className="text-[10px] text-zinc-300 leading-relaxed">{context}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Tag pills row ───────────────────────────────────────────────────────────

export function TagRow({
  colleges,
}: {
  colleges: readonly { name: string; tags: readonly string[] }[];
}) {
  return (
    <div className="space-y-2">
      {colleges.map((c) => (
        <div key={c.name} className="flex items-start gap-2">
          <span className="text-[10px] text-zinc-500 w-16 sm:w-24 truncate shrink-0 text-right mt-0.5 font-medium">
            {shortName(c.name)}
          </span>
          <div className="flex flex-wrap gap-1">
            {c.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] text-zinc-300"
              >
                {tag}
              </span>
            ))}
            {c.tags.length === 0 && (
              <span className="text-[10px] text-zinc-600">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Build alias lookup once from the COLLEGES data so shortName stays in sync
// with the dataset's aliases field instead of maintaining a separate map.
const ALIAS_LOOKUP = new Map<string, string>();
for (const c of COLLEGES) {
  if (c.aliases && c.aliases.length > 0 && c.name.length > 18) {
    // Pick the shortest alias as the display abbreviation
    const shortest = [...c.aliases].sort((a, b) => a.length - b.length)[0];
    if (shortest.length < c.name.length) {
      ALIAS_LOOKUP.set(c.name, shortest);
    }
  }
}

function shortName(name: string): string {
  const alias = ALIAS_LOOKUP.get(name);
  if (alias) return alias;
  // For long names without aliases, take first 2 words
  const words = name.split(" ");
  if (words.length > 2 && name.length > 20) return words.slice(0, 2).join(" ");
  return name;
}

export function formatCurrency(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

export function formatPct(v: number): string {
  return `${v}%`;
}

export function formatRatio(v: number): string {
  return `${v}:1`;
}
