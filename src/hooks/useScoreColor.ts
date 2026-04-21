import { SCORE_THRESHOLDS } from "@/data/mockData";

interface ScoreColors {
  readonly text: string;
  readonly bg: string;
  readonly glow: string;
}

export function useScoreColor(score: number, max: number): ScoreColors {
  const pct = score / max;

  if (pct >= SCORE_THRESHOLDS.high) {
    return { text: "text-emerald-400", bg: "bg-emerald-500", glow: "rgba(16,185,129,0.4)" };
  }
  if (pct >= SCORE_THRESHOLDS.mid) {
    return { text: "text-blue-400", bg: "bg-blue-500", glow: "rgba(99,102,241,0.4)" };
  }
  if (pct >= SCORE_THRESHOLDS.low) {
    return { text: "text-amber-400", bg: "bg-amber-500", glow: "rgba(245,158,11,0.4)" };
  }
  return { text: "text-red-400", bg: "bg-red-500", glow: "rgba(239,68,68,0.4)" };
}
