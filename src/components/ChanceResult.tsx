"use client";

import React from "react";
import { motion } from "motion/react";
import type { ChanceResult, ChanceBand } from "@/lib/college-types";

const BAND_STYLES: Record<ChanceBand, { bg: string; text: string; bar: string; glow: string }> = {
  "very-low": { bg: "bg-red-500/10", text: "text-red-400", bar: "bg-red-500", glow: "shadow-red-500/20" },
  low: { bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500", glow: "shadow-orange-500/20" },
  possible: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500", glow: "shadow-amber-500/20" },
  competitive: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500", glow: "shadow-blue-500/20" },
  strong: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500", glow: "shadow-emerald-500/20" },
};

interface ChanceResultProps {
  readonly result: ChanceResult;
  readonly collegeName: string;
}

function buildHeadline(result: ChanceResult, collegeName: string): string {
  const { band, strengths, weaknesses } = result;
  const strongPart = strengths.length > 0 ? strengths[0].split(" is ")[0] || strengths[0].split(" ")[0] : "your profile";
  const weakPart = weaknesses.length > 0 ? weaknesses[0].split(" is ")[0] || weaknesses[0].split(" ")[0] : null;

  switch (band) {
    case "strong":
      return `Your stats are strong for ${collegeName}. Focus on making your essays and ECs memorable.`;
    case "competitive":
      return weakPart
        ? `You're in the competitive range — ${strongPart} helps, but ${weakPart} is the gap to close.`
        : `You're in the competitive range for ${collegeName}. Strong essays and ECs can tip you in.`;
    case "possible":
      return weakPart
        ? `This is a stretch. ${strongPart} is working for you, but ${weakPart} is holding you back.`
        : `This is possible but a stretch. You'll need exceptional essays and ECs to stand out.`;
    case "low":
      return `Your stats are below the typical admitted range. Consider this a reach school.`;
    case "very-low":
      return `This school is a significant reach. Apply only if you have something truly unusual to offer.`;
  }
}

function buildNextStep(result: ChanceResult): string {
  const { band, weaknesses } = result;
  if (weaknesses.length === 0) {
    return band === "strong"
      ? "Keep building your extracurricular spike and start essay drafts early."
      : "Your profile is balanced — focus on essay quality and demonstrating fit.";
  }
  const top = weaknesses[0].toLowerCase();
  if (top.includes("gpa")) return "Raising your GPA will move the needle most here.";
  if (top.includes("sat") || top.includes("act") || top.includes("test")) return "Retaking the SAT/ACT could meaningfully improve your chances.";
  if (top.includes("essay")) return "Your essay score has room to grow — run it through the Essay Grader.";
  if (top.includes("ec") || top.includes("activit")) return "Build a stronger extracurricular spike — the EC Evaluator can help.";
  return "Address the gap above first — it's your biggest lever.";
}

export const ChanceResultDisplay: React.FC<ChanceResultProps> = ({ result, collegeName }) => {
  const style = BAND_STYLES[result.band];
  const headline = buildHeadline(result, collegeName);
  const nextStep = buildNextStep(result);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 sm:p-8 ring-1 ring-white/[0.06] space-y-6"
    >
      {/* Band display */}
      <div className="text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          Your chances at {collegeName}
        </p>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`inline-block px-6 py-3 rounded-xl ${style.bg} ${style.glow} shadow-lg ring-1 ring-white/[0.06]`}
        >
          <span className={`text-2xl sm:text-3xl font-bold ${style.text}`}>
            {result.bandLabel}
          </span>
        </motion.div>
        {result.confidence !== "high" && (
          <p className="mt-2 text-xs text-zinc-600">
            {result.confidence === "low" ? "Low confidence — add GPA and test scores for a better estimate" : "Add more data for a more reliable estimate"}
          </p>
        )}
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">
          <span>Very Low</span>
          <span>Low</span>
          <span>Possible</span>
          <span>Competitive</span>
          <span>Strong</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${style.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${result.score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Headline narrative — the warm lead */}
      <div className="rounded-xl bg-[#12121f] border border-white/[0.08] p-5">
        <p className="text-[15px] text-zinc-100 leading-relaxed font-medium">
          {headline}
        </p>
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0 mt-[2px]">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            <span className="text-zinc-300 font-medium">Next step:</span> {nextStep}
          </p>
        </div>
      </div>

      {/* Technical explanation (secondary) */}
      <details className="group rounded-xl bg-[#0c0c1a]/60 border border-white/[0.05] overflow-hidden">
        <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none hover:bg-white/[0.02] transition-[background-color] duration-200">
          <span className="text-xs text-zinc-500 font-medium">See the breakdown</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 transition-transform duration-300 group-open:rotate-180">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <p className="text-[13px] text-zinc-400 leading-relaxed">{result.explanation}</p>
        </div>
      </details>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h4>
          {result.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-emerald-400 mt-0.5 shrink-0">+</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600">No notable strengths identified yet</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-2">Areas to Improve</h4>
          {result.weaknesses.length > 0 ? (
            <ul className="space-y-1.5">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-red-400 mt-0.5 shrink-0">!</span>{w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600">No major weaknesses identified</p>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
        <p className="text-[11px] text-amber-400/70 leading-relaxed">
          This is an estimate based on general admissions patterns and is not a guarantee.
          Actual admission decisions depend on many factors including essays, recommendations,
          demonstrated interest, and institutional priorities.
        </p>
      </div>
    </motion.div>
  );
};
