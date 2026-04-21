"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Bookmark, GraduationCap } from "lucide-react";
import type { ClassifiedCollege } from "@/lib/college-types";
import type { ProfileSpike } from "@/lib/extracurricular-types";

const CLASS_COLORS = {
  unlikely: { bg: "bg-red-600/10", border: "border-red-600/20", text: "text-red-500", label: "Unlikely", ring: "ring-red-600/25" },
  reach: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", label: "Reach", ring: "ring-orange-500/25" },
  target: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Target", ring: "ring-amber-500/25" },
  likely: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Likely", ring: "ring-blue-500/25" },
  safety: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Safety", ring: "ring-emerald-500/25" },
} as const;

// Map EC spike categories to college tags for matching
const SPIKE_TAG_MAP: Record<string, string[]> = {
  "stem research": ["research", "tech", "stem"],
  "research": ["research"],
  "community service": ["service", "community", "collaborative"],
  "arts": ["arts", "creative"],
  "athletics": ["athletics"],
  "leadership": ["collaborative", "pre-professional"],
  "business": ["pre-professional", "business"],
  "entrepreneurship": ["pre-professional", "business"],
};

function getSpikeMatch(spikes: ProfileSpike[], tags: string[]): string | null {
  for (const spike of spikes) {
    const matchTags = SPIKE_TAG_MAP[spike.category.toLowerCase()] ?? [];
    const match = matchTags.find((t) => tags.some((tag) => tag.toLowerCase().includes(t)));
    if (match) return spike.category;
  }
  return null;
}

interface CollegeCardProps {
  readonly item: ClassifiedCollege;
  readonly index: number;
  readonly isPinned?: boolean;
  readonly onTogglePin?: (name: string) => void;
}

export const CollegeCard: React.FC<CollegeCardProps> = ({
  item,
  index,
  isPinned = false,
  onTogglePin,
}) => {
  const { college: c, classification, reason, fitScore, majorMatch } = item;
  const colors = CLASS_COLORS[classification];

  const spikeMatch = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("ec-evaluator-result") : null;
      if (!raw) return null;
      const ecResult = JSON.parse(raw);
      if (!ecResult?.spikes?.length) return null;
      return getSpikeMatch(ecResult.spikes, c.tags);
    } catch {
      return null;
    }
  }, [c.tags]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -2 }}
      className={`group rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-5 sm:p-6 hover:bg-[#13131f] hover:border-white/[0.14] hover:shadow-[0_8px_24px_rgba(10,16,29,0.6)] transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]`}
    >
      {/* ── Header: Name + Fit Score dominant ──────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
              {colors.label}
            </span>
            {c.usNewsRank && (
              <span className="text-[10px] text-zinc-500 font-medium">
                #{c.usNewsRank} US News
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-semibold text-zinc-100 truncate leading-tight">
            {c.name}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-1">
            {c.state} &middot; {c.type === "public" ? "Public" : "Private"} &middot; {c.setting}
          </p>
        </div>

        {/* Right column: pin + fit score */}
        <div className="shrink-0 flex items-start gap-2">
          {onTogglePin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(c.name);
              }}
              aria-label={isPinned ? `Unpin ${c.name}` : `Pin ${c.name} to your list`}
              aria-pressed={isPinned}
              className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,color] duration-200 ${
                isPinned
                  ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                  : "bg-white/[0.03] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300"
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                strokeWidth={1.75}
                fill={isPinned ? "currentColor" : "none"}
              />
            </button>
          )}
          {/* Fit Score — dominant visual anchor */}
          <div className="text-right">
            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-0.5">Fit</p>
            <p className={`text-3xl sm:text-4xl font-semibold font-mono tabular-nums leading-none ${colors.text}`}>
              {fitScore}
            </p>
          </div>
        </div>
      </div>

      {/* ── Hairline separator ──────────────────────────────────── */}
      <div className="h-px bg-white/[0.05] -mx-5 sm:-mx-6 mb-4" />

      {/* ── Stats row: horizontal with generous spacing ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <MetaStat label="Accept Rate" value={`${c.acceptanceRate}%`} />
        <MetaStat label="Avg GPA" value={c.avgGPAUW.toFixed(2)} secondary={`${c.avgGPAW.toFixed(2)} W`} />
        <MetaStat label="SAT" value={`${c.sat25}–${c.sat75}`} />
        <MetaStat label="ACT" value={`${c.act25}–${c.act75}`} />
      </div>

      {/* ── Reasoning (only if present) ─────────────────────────── */}
      {reason && (
        <p className="mt-4 pt-4 border-t border-white/[0.05] text-[12px] text-zinc-400 leading-relaxed">
          {reason}
        </p>
      )}

      {spikeMatch && (
        <p className="mt-2 text-[11px] text-blue-400/80 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Your {spikeMatch} profile aligns with this school
        </p>
      )}

      {majorMatch === "strong" && (
        <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1.5">
          <GraduationCap className="w-3 h-3" strokeWidth={2} />
          Strong fit for what you want to study
        </p>
      )}
      {majorMatch === "decent" && (
        <p className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1.5">
          <GraduationCap className="w-3 h-3" strokeWidth={1.75} />
          Adjacent to what you want to study
        </p>
      )}
    </motion.div>
  );
};

function MetaStat({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-1">{label}</p>
      <p className="text-sm font-mono tabular-nums text-zinc-200">{value}</p>
      {secondary && (
        <p className="text-[10px] font-mono tabular-nums text-zinc-500 mt-0.5">{secondary}</p>
      )}
    </div>
  );
}
