"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import type { ProfileEvaluation, ActivityTier } from "@/lib/extracurricular-types";
import {
  EC_BAND_LABELS,
  BAND_RANGES,
  BAND_ORDER,
  computeReadinessScore,
  buildReadinessNextStep,
  bandFromScore,
} from "@/lib/extracurricular-types";

const TIER_STYLES: Record<ActivityTier, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Tier 1 — National/International" },
  2: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Tier 2 — Regional/State" },
  3: { bg: "bg-zinc-400/10", border: "border-zinc-400/20", text: "text-zinc-300", label: "Tier 3 — School Leadership" },
  4: { bg: "bg-zinc-600/10", border: "border-zinc-600/20", text: "text-zinc-500", label: "Tier 4 — Participation" },
};

const BAND_STYLES: Record<string, string> = {
  exceptional: "text-amber-400",
  strong: "text-green-400",
  solid: "text-blue-400",
  developing: "text-orange-400",
  limited: "text-red-400",
};

// Color tokens per band for the reference chart
const BAND_CHART_COLORS: Record<string, { fill: string; bg: string; border: string; text: string }> = {
  limited:     { fill: "from-red-500/80 to-red-600/80",       bg: "bg-red-500/5",     border: "border-red-500/15",     text: "text-red-400" },
  developing:  { fill: "from-orange-500/80 to-orange-600/80", bg: "bg-orange-500/5",  border: "border-orange-500/15",  text: "text-orange-400" },
  solid:       { fill: "from-blue-500/80 to-blue-600/80",     bg: "bg-blue-500/5",    border: "border-blue-500/15",    text: "text-blue-400" },
  strong:      { fill: "from-green-500/80 to-emerald-500/80", bg: "bg-emerald-500/5", border: "border-emerald-500/15", text: "text-green-400" },
  exceptional: { fill: "from-amber-400/80 to-amber-500/80",   bg: "bg-amber-500/5",   border: "border-amber-500/15",   text: "text-amber-400" },
};

const ScoreBar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-white font-medium">{value}/{max}</span>
    </div>
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-white/40 to-white/80 transition-[width] duration-500"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
);

interface ECResultsProps {
  readonly result: ProfileEvaluation;
}

export const ECResults: React.FC<ECResultsProps> = ({ result }) => {
  const score = useMemo(
    () =>
      computeReadinessScore({
        activities: result.activities,
        spikes: result.spikes,
      }),
    [result]
  );
  // Derive the displayed band from the continuous score — the score is the
  // source of truth, the band is just a label.
  const displayBand = useMemo(() => bandFromScore(score), [score]);
  const nextStep = useMemo(() => buildReadinessNextStep(score), [score]);

  return (
    <div className="space-y-8">
      {/* Profile Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 mb-2">Overall Band</p>
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className={`text-3xl font-bold tracking-tight ${BAND_STYLES[displayBand] ?? "text-white"}`}>
                {EC_BAND_LABELS[displayBand]}
              </h2>
              <span className="font-mono tabular-nums text-lg text-zinc-500">
                {score}<span className="text-zinc-700">/100</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {result.spikes.map((spike) => (
              <span
                key={spike.category}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300"
              >
                {spike.strength === "dominant" ? "🔥" : spike.strength === "strong" ? "⭐" : "•"}
                {spike.category}
              </span>
            ))}
            {result.isWellRounded && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                Well-rounded
              </span>
            )}
          </div>
        </div>

        {/* Segmented progress bar — bands visible */}
        <div className="mb-6">
          <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden ring-1 ring-white/[0.05]">
            {/* Segment separators (hairlines) at band boundaries */}
            {BAND_ORDER.slice(1).map((band) => {
              const pct = BAND_RANGES[band].min;
              return (
                <div
                  key={band}
                  className="absolute top-0 bottom-0 w-px bg-white/[0.08]"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300"
            />
          </div>
          {/* Band labels under bar */}
          <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.15em] text-zinc-600">
            {BAND_ORDER.map((band) => (
              <span
                key={band}
                className={band === displayBand ? "text-zinc-300" : ""}
              >
                {EC_BAND_LABELS[band]}
              </span>
            ))}
          </div>
        </div>

        {/* Next step narrative */}
        <div className="mb-6 rounded-xl bg-[#0c0c1a]/60 border border-white/[0.05] p-4 flex items-start gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0 mt-[2px]">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-medium mb-1">Next step</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{nextStep}</p>
          </div>
        </div>

        {/* ── Band reference chart ─────────────────────────────── */}
        <details className="group mb-6 rounded-xl bg-[#0c0c1a]/60 border border-white/[0.05] overflow-hidden">
          <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none hover:bg-white/[0.02] transition-[background-color] duration-200">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-medium">Band reference</p>
              <p className="text-xs text-zinc-400 mt-0.5">See how score ranges map to each band</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 transition-transform duration-300 group-open:rotate-180 shrink-0">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </summary>

          <div className="px-4 pb-4 pt-1 space-y-2">
            {BAND_ORDER.map((band, i) => {
              const range = BAND_RANGES[band];
              const width = range.max - range.min;
              const isCurrent = band === displayBand;
              const colors = BAND_CHART_COLORS[band];
              return (
                <motion.div
                  key={band}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className={`rounded-lg border px-3 py-2.5 transition-[background-color,border-color] duration-200 ${
                    isCurrent
                      ? `${colors.bg} ${colors.border}`
                      : "border-white/[0.04] hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Label */}
                    <div className="w-20 shrink-0 flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${isCurrent ? colors.text : "text-zinc-400"}`}>
                        {EC_BAND_LABELS[band]}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono text-zinc-500">you</span>
                      )}
                    </div>

                    {/* Proportional range bar */}
                    <div className="flex-1 relative h-6 rounded-md bg-white/[0.03] overflow-hidden ring-1 ring-white/[0.04]">
                      {/* The band's segment, positioned proportionally across 0-100 */}
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        style={{
                          left: `${range.min}%`,
                          width: `${width}%`,
                          transformOrigin: "left center",
                        }}
                        className={`absolute top-0 bottom-0 rounded-md bg-gradient-to-r ${colors.fill}`}
                      />
                      {/* Current score marker */}
                      {isCurrent && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.9, duration: 0.3 }}
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                          style={{ left: `calc(${score}% - 1px)` }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                        </motion.div>
                      )}
                    </div>

                    {/* Range label */}
                    <div className="w-14 shrink-0 text-right">
                      <span className={`text-[10px] font-mono tabular-nums ${isCurrent ? "text-zinc-200" : "text-zinc-600"}`}>
                        {range.min}–{range.max}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            <p className="text-[10px] text-zinc-600 leading-relaxed mt-3 pt-3 border-t border-white/[0.04]">
              Bands are categorical buckets. The 0–100 score inside each band shows where you land and how close you are to moving up. Your current position is marked.
            </p>
          </div>
        </details>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">{result.bandExplanation}</p>
        <p className="text-sm text-zinc-500 leading-relaxed">{result.consistencyNote}</p>

        {/* Strengths & Gaps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          <div>
            <h4 className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-semibold mb-3">Strengths</h4>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-semibold mb-3">Gaps</h4>
            <ul className="space-y-2">
              {result.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h4 className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-semibold mb-4">Recommendations</h4>
          <ul className="space-y-3">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="text-white font-mono text-xs mt-0.5">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Per-Activity Cards */}
      <div>
        <h3 className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-semibold mb-4">
          Activity Breakdown ({result.activities.length})
        </h3>
        <div className="space-y-4">
          {result.activities.map((activity, i) => {
            const style = TIER_STYLES[activity.tier];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border ${style.border} ${style.bg} p-6`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-base font-semibold text-white">{activity.activityName}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{activity.category}</p>
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${style.text} shrink-0`}>
                    {style.label}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-4">{activity.tierExplanation}</p>

                {/* Score bars */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                  <ScoreBar label="Leadership" value={activity.scores.leadership} max={4} />
                  <ScoreBar label="Impact" value={activity.scores.impact} max={4} />
                  <ScoreBar label="Commitment" value={activity.scores.commitment} max={4} />
                  <ScoreBar label="Alignment" value={activity.scores.alignment} max={2} />
                </div>

                {/* Highlights & Improvements */}
                {activity.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {activity.highlights.map((h, j) => (
                      <span key={j} className="text-[10px] rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                {activity.improvements.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Could improve</p>
                    {activity.improvements.map((imp, j) => (
                      <p key={j} className="text-xs text-zinc-500">• {imp}</p>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center py-6">
        <p className="text-xs text-zinc-600 max-w-lg mx-auto">
          This is a heuristic planning tool. It does not reflect any official admissions office rubric.
          Results are estimates based on general patterns, not guarantees. Use alongside your school counselor.
        </p>
      </div>
    </div>
  );
};
