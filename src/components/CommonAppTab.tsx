"use client";

import React from "react";
import { motion } from "motion/react";
import type { CriterionResult } from "@/lib/types";
import { useScoreColor } from "@/hooks/useScoreColor";

interface CommonAppTabProps {
  readonly scores: Record<string, CriterionResult>;
}

export const CommonAppTab: React.FC<CommonAppTabProps> = ({ scores }) => (
  <motion.div
    key="common"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    {Object.entries(scores).map(([name, c], i) => (
      <ScoreRow key={name} name={name} score={c.score} max={100} feedback={c.feedback} index={i} />
    ))}
  </motion.div>
);

// ── Internal ─────────────────────────────────────────────────────────────────

interface ScoreRowProps {
  readonly name: string;
  readonly score: number;
  readonly max: number;
  readonly feedback: string;
  readonly index: number;
}

const ScoreRow: React.FC<ScoreRowProps> = ({ name, score, max, feedback, index }) => {
  const { text, bg, glow } = useScoreColor(score, max);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-200">{name}</span>
        <span className={`text-lg font-bold font-mono ${text}`}>
          {score}<span className="text-xs text-zinc-500">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${bg}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / max) * 100}%` }}
          transition={{ duration: 1, delay: index * 0.08, ease: "easeOut" }}
          style={{ boxShadow: `0 0 8px ${glow}` }}
        />
      </div>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{feedback}</p>
    </motion.div>
  );
};
