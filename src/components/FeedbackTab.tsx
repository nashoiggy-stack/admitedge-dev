"use client";

import React from "react";
import { motion } from "motion/react";
import type { CriterionResult } from "@/lib/types";
import { useScoreColor } from "@/hooks/useScoreColor";

interface FeedbackTabProps {
  readonly generalFeedback: string;
  readonly commonApp: Record<string, CriterionResult>;
  readonly onNavigateToCommon: () => void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({
  generalFeedback,
  commonApp,
  onNavigateToCommon,
}) => (
  <motion.div
    key="feedback"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
  >
    <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-5 mb-6">
      <h4 className="text-sm font-semibold text-blue-400 mb-2">Overall Assessment</h4>
      <p className="text-sm text-zinc-300 leading-relaxed">{generalFeedback}</p>
    </div>

    <h4 className="text-sm font-semibold text-zinc-300 mb-3">Quick Scores</h4>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Object.entries(commonApp).map(([name, c]) => (
        <QuickScoreCard
          key={name}
          name={name}
          score={c.score}
          onClick={onNavigateToCommon}
        />
      ))}
    </div>
  </motion.div>
);

// ── Internal ─────────────────────────────────────────────────────────────────

interface QuickScoreCardProps {
  readonly name: string;
  readonly score: number;
  readonly onClick: () => void;
}

const QuickScoreCard: React.FC<QuickScoreCardProps> = ({ name, score, onClick }) => {
  const { text } = useScoreColor(score, 100);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      className="glass rounded-lg p-3 text-left transition-[background-color,box-shadow] duration-200 cursor-pointer"
    >
      <p className="text-xs text-zinc-500 truncate">{name}</p>
      <p className={`text-lg font-bold font-mono ${text}`}>{score}</p>
    </motion.button>
  );
};
