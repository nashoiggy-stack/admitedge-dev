"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import type { CriterionResult } from "@/lib/types";
import { useScoreColor } from "@/hooks/useScoreColor";
import { VSPICE_PITFALLS, VSPICE_BONUSES } from "@/lib/rubrics";

interface VspiceTabProps {
  readonly scores: Record<string, CriterionResult>;
  readonly bonuses: string[];
  readonly pitfalls: string[];
}

// ── Point-value lookup for VSPICE bonuses / pitfalls ─────────────────────────
// Each tier in the rubric carries a fixed point value. Build a map from the
// exact item text → signed point value so the UI can show how much each
// detected signal adds or removes.
const PITFALL_POINTS: Record<keyof typeof VSPICE_PITFALLS, number> = {
  minor: -1,
  moderate: -2,
  severe: -3,
};
const BONUS_POINTS: Record<keyof typeof VSPICE_BONUSES, number> = {
  nice: 1,
  standout: 2,
  difference: 3,
};

function buildPointMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const tier of Object.keys(VSPICE_PITFALLS) as Array<keyof typeof VSPICE_PITFALLS>) {
    for (const item of VSPICE_PITFALLS[tier].items) {
      map.set(item, PITFALL_POINTS[tier]);
    }
  }
  for (const tier of Object.keys(VSPICE_BONUSES) as Array<keyof typeof VSPICE_BONUSES>) {
    for (const item of VSPICE_BONUSES[tier].items) {
      map.set(item, BONUS_POINTS[tier]);
    }
  }
  return map;
}

const POINT_MAP = buildPointMap();

/** Look up an item text and return its signed point value, or null if the
 *  AI returned a paraphrased label that doesn't match any rubric item. */
function pointsFor(item: string): number | null {
  const exact = POINT_MAP.get(item);
  if (exact !== undefined) return exact;
  // Fuzzy fallback: case-insensitive substring containment in either direction
  const lc = item.toLowerCase();
  for (const [key, value] of POINT_MAP.entries()) {
    const klc = key.toLowerCase();
    if (klc.includes(lc) || lc.includes(klc)) return value;
  }
  return null;
}

export const VspiceTab: React.FC<VspiceTabProps> = ({ scores, bonuses, pitfalls }) => {
  const bonusItems = useMemo(
    () => bonuses.map((text) => ({ text, points: pointsFor(text) })),
    [bonuses]
  );
  const pitfallItems = useMemo(
    () => pitfalls.map((text) => ({ text, points: pointsFor(text) })),
    [pitfalls]
  );

  const bonusTotal = bonusItems.reduce((sum, it) => sum + (it.points ?? 0), 0);
  const pitfallTotal = pitfallItems.reduce((sum, it) => sum + (it.points ?? 0), 0);

  return (
    <motion.div
      key="vspice"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {Object.entries(scores).map(([name, c], i) => (
        <VspiceRow key={name} name={name} score={c.score} feedback={c.feedback} index={i} />
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/[0.06]">
        <SignalList
          title="Bonus Signals"
          items={bonusItems}
          color="emerald"
          totalLabel={bonusTotal > 0 ? `+${bonusTotal}` : null}
        />
        <SignalList
          title="Pitfall Warnings"
          items={pitfallItems}
          color="red"
          totalLabel={pitfallTotal < 0 ? `${pitfallTotal}` : null}
        />
      </div>
    </motion.div>
  );
};

// ── Internal ─────────────────────────────────────────────────────────────────

interface VspiceRowProps {
  readonly name: string;
  readonly score: number;
  readonly feedback: string;
  readonly index: number;
}

const VspiceRow: React.FC<VspiceRowProps> = ({ name, score, feedback, index }) => {
  const { text, bg } = useScoreColor(score, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-200">{name}</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((level) => (
            <motion.div
              key={level}
              className={`w-8 h-2.5 rounded-full ${level <= score ? bg : "bg-white/[0.05]"}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: index * 0.08 + level * 0.1, duration: 0.4 }}
              style={{ transformOrigin: "left" }}
            />
          ))}
          <span className={`ml-2 text-sm font-bold font-mono ${text}`}>{score}/4</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{feedback}</p>
    </motion.div>
  );
};

interface SignalItem {
  readonly text: string;
  readonly points: number | null;
}

interface SignalListProps {
  readonly title: string;
  readonly items: readonly SignalItem[];
  readonly color: "emerald" | "red";
  readonly totalLabel: string | null;
}

const COLOR_CLASSES = {
  emerald: {
    title: "text-emerald-400",
    pillBg: "bg-emerald-500/15",
    pillBorder: "border-emerald-500/30",
    pillText: "text-emerald-300",
    totalBg: "bg-emerald-500/10",
    totalBorder: "border-emerald-500/25",
    totalText: "text-emerald-300",
  },
  red: {
    title: "text-red-400",
    pillBg: "bg-red-500/15",
    pillBorder: "border-red-500/30",
    pillText: "text-red-300",
    totalBg: "bg-red-500/10",
    totalBorder: "border-red-500/25",
    totalText: "text-red-300",
  },
} as const;

function formatPoints(points: number | null): string {
  if (points === null) return "?";
  return points > 0 ? `+${points}` : `${points}`;
}

const SignalList: React.FC<SignalListProps> = ({ title, items, color, totalLabel }) => {
  const c = COLOR_CLASSES[color];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${c.title}`}>{title}</h4>
        {totalLabel && (
          <span
            data-keep-color
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${c.totalBg} ${c.totalBorder} ${c.totalText}`}
            title={`Net point change: ${totalLabel}`}
          >
            {totalLabel} pts
          </span>
        )}
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
              <span
                data-keep-color
                className={`shrink-0 inline-flex items-center justify-center min-w-[2.25rem] h-5 px-1.5 rounded-md text-[10px] font-bold font-mono border ${c.pillBg} ${c.pillBorder} ${c.pillText} mt-0.5`}
                title="Point impact"
              >
                {formatPoints(item.points)}
              </span>
              <span className="leading-relaxed">{item.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">None detected</p>
      )}
    </div>
  );
};
