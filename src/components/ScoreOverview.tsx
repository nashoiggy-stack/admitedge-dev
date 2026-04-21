"use client";

import React from "react";
import { Card3D } from "./Card3D";
import { AnimatedScore } from "./AnimatedScore";
import type { GradingResult } from "@/lib/types";

interface ScoreOverviewProps {
  readonly result: GradingResult;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ result }) => (
  <Card3D className="glass rounded-2xl p-8" glowColor="rgba(255, 255, 255, 0.04)">
    <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
      <AnimatedScore
        value={result.wordCount}
        max={650}
        label="Word Count"
        sub={
          result.wordCount >= 480 && result.wordCount <= 650
            ? "Ideal range"
            : result.wordCount < 480
            ? "Below 480-650"
            : "Above 480-650"
        }
        delay={0}
      />
      <AnimatedScore
        value={result.rawScore}
        max={100}
        label="Raw Score"
        sub="7-criteria average"
        delay={200}
      />
      <AnimatedScore
        value={result.adjustedScore}
        max={100}
        label="Adjusted"
        sub={result.wordCountPenalty > 0 ? `-${result.wordCountPenalty} penalty` : "No penalty"}
        delay={400}
      />
      <AnimatedScore
        value={result.vspiceComposite}
        max={24}
        label="VSPICE"
        sub={`${result.vspiceComposite}/24 (incl. bonuses & pitfalls)`}
        delay={600}
      />
    </div>
  </Card3D>
);
