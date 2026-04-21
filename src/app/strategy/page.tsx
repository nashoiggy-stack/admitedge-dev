"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Bookmark,
  Target,
  Star,
  HelpCircle,
  Zap,
  School,
  XCircle,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  StrategyCard,
  type StrategyStrength,
} from "@/components/StrategyCard";
import { DreamSchoolSelector } from "@/components/DreamSchoolSelector";
import { ActionChecklist } from "@/components/ActionChecklist";
import { GapItem } from "@/components/GapItem";
import { useStrategy } from "@/hooks/useStrategy";
import { useDreamSchool } from "@/hooks/useDreamSchool";
import { useActionChecklist } from "@/hooks/useActionChecklist";
import type {
  StrategyAnalysis,
  StrategyResult,
  AcademicTier,
  ECStrengthTier,
  EdVerdict,
  MajorAwareRecommendations,
} from "@/lib/strategy-types";
import type { Classification, ClassifiedCollege } from "@/lib/college-types";
import { MAJORS } from "@/lib/college-types";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";
import { setItemAndNotify } from "@/lib/sync-event";

// ── Helpers: deterministic strength derivation ─────────────────────────────

function snapshotStrength(a: StrategyAnalysis): StrategyStrength {
  const ac = a.academic.tier;
  const ec = a.ec.tier;
  if ((ac === "elite" || ac === "strong") && (ec === "exceptional" || ec === "strong")) return "strong";
  if (ac === "limited" || ec === "limited") return "weak";
  if (ac === "developing" || ec === "developing" || ec === "missing") return "mixed";
  return "mixed";
}

function spikeStrength(a: StrategyAnalysis): StrategyStrength {
  const s = a.spike;
  if (s.strength === "dominant" && s.clarity === "focused") return "strong";
  if (s.strength === "strong" && s.clarity === "focused") return "strong";
  if (s.strength === "none" || s.clarity === "scattered") return "weak";
  return "mixed";
}

function gapsStrength(a: StrategyAnalysis): StrategyStrength {
  if (a.weaknesses.some((w) => w.severity === "critical")) return "weak";
  if (a.weaknesses.some((w) => w.severity === "high")) return "warning";
  if (a.weaknesses.length === 0) return "strong";
  return "mixed";
}

function schoolListStrength(a: StrategyAnalysis): StrategyStrength {
  switch (a.schoolList.balance) {
    case "balanced":
      return "strong";
    case "reach-heavy":
    case "safety-heavy":
      return "warning";
    case "thin":
    case "empty":
      return "weak";
    default:
      return "neutral";
  }
}

function edVerdictStrength(v: EdVerdict | null): StrategyStrength {
  if (v === "yes") return "strong";
  if (v === "conditional") return "mixed";
  if (v === "no") return "weak";
  return "neutral";
}

const TIER_LABEL: Record<AcademicTier, string> = {
  elite: "Elite",
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
};

const EC_LABEL: Record<ECStrengthTier, string> = {
  exceptional: "Exceptional",
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
  missing: "No data",
};

const PERCENTILE_LABEL: Record<string, string> = {
  "top-10": "Top 10%",
  "top-25": "Top 25%",
  "top-50": "Top 50%",
  "bottom-50": "Bottom 50%",
};

function majorRecsStrength(r: MajorAwareRecommendations): StrategyStrength {
  if (!r.intendedMajor && !r.intendedInterest) return "neutral";
  const pinnedCount =
    r.fromPinned.safeties.length + r.fromPinned.targets.length + r.fromPinned.reaches.length;
  if (pinnedCount === 0 && r.toConsider.length === 0) return "warning";
  if (pinnedCount >= 3) return "strong";
  return "mixed";
}

function majorRecsHeadline(r: MajorAwareRecommendations): string {
  if (!r.intendedMajor && !r.intendedInterest) return "Pick a major to see tailored picks";
  const label = r.intendedMajor || r.intendedInterest || "";
  const pinnedCount =
    r.fromPinned.safeties.length + r.fromPinned.targets.length + r.fromPinned.reaches.length;
  const parts: string[] = [];
  if (pinnedCount > 0) parts.push(`${pinnedCount} from your pins`);
  if (r.toConsider.length > 0) parts.push(`${r.toConsider.length} to consider`);
  const summary = parts.length > 0 ? parts.join(" · ") : "no matches yet";
  return `${label} · ${summary}`;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const { profile, analysis, result, loading, error, generate, refresh } = useStrategy();
  const { dreamSchool, setDreamSchool } = useDreamSchool();

  // When the dream school changes, refresh the profile snapshot so the cache
  // key regenerates and the UI reflects the new selection.
  const onDreamSchoolChange = (name: string | null) => {
    setDreamSchool(name);
    // Give localStorage a tick to flush before re-reading
    setTimeout(refresh, 0);
  };

  const isEmpty = !profile || !profile.hasPinnedSchools;

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24 font-[family-name:var(--font-geist-sans)]">
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1 mb-4">
            <Compass className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
              Strategy Engine
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Your Strategic Briefing</span>
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto text-sm">
            A live decision tool — not a static report. Pick a dream school, review your gaps, and check off action items as you improve.
          </p>
        </motion.div>

        {/* ── Empty state (no pinned schools) ────────────────────── */}
        {isEmpty ? (
          <ScrollReveal delay={0.08}>
            <EmptyState />
          </ScrollReveal>
        ) : (
          <>
            {/* ── Dream School selector (always at top) ──────────── */}
            <ScrollReveal delay={0.08}>
              <div className="mb-6">
                <DreamSchoolSelector
                  dreamSchool={dreamSchool}
                  onChange={onDreamSchoolChange}
                />
              </div>
            </ScrollReveal>

            {/* ── Missing-data banner (only before generation) ───── */}
            {analysis && analysis.missingData.length > 0 && !result && (
              <ScrollReveal delay={0.1}>
                <MissingDataBanner items={analysis.missingData} />
              </ScrollReveal>
            )}

            {/* ── Generate / Re-run bar ──────────────────────────── */}
            <ScrollReveal delay={0.12}>
              <GenerateBar
                loading={loading}
                hasResult={result != null}
                generatedAt={result?.generatedAt ?? null}
                onGenerate={() => generate({ bypassCache: result != null })}
              />
            </ScrollReveal>

            {/* ── Error ──────────────────────────────────────────── */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* ── Pre-generation hint ────────────────────────────── */}
            {!result && !loading && !error && (
              <ScrollReveal delay={0.15}>
                <PreGenerationHint hasDreamSchool={dreamSchool != null} />
              </ScrollReveal>
            )}

            {/* ── Result: interactive cards ──────────────────────── */}
            <AnimatePresence mode="wait">
              {result && analysis && (
                <motion.div
                  key={result.generatedAt}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="space-y-3"
                >
                  {/* 1. SNAPSHOT — default expanded */}
                  <StrategyCard
                    icon={<Target className="w-4 h-4" />}
                    title="Snapshot"
                    strength={snapshotStrength(analysis)}
                    headline={`${TIER_LABEL[analysis.academic.tier]} academics · ${EC_LABEL[analysis.ec.tier]} ECs · ${PERCENTILE_LABEL[analysis.positioning.percentileEstimate]}`}
                    defaultExpanded
                  >
                    <SnapshotBody result={result} analysis={analysis} />
                  </StrategyCard>

                  {/* 2. DREAM SCHOOL — default expanded, emphasized */}
                  <StrategyCard
                    icon={<Star className="w-4 h-4" />}
                    title="Dream School"
                    strength={edVerdictStrength(result.dreamSchool?.edVerdict ?? null)}
                    headline={
                      result.dreamSchool?.schoolName ??
                      (dreamSchool ? `${dreamSchool} · pending re-run` : "No dream school selected")
                    }
                    defaultExpanded
                    emphasize
                  >
                    <DreamSchoolBody result={result} dreamSchool={dreamSchool} />
                  </StrategyCard>

                  {/* 3. ACTION PLAN — default expanded, emphasized, checkboxes */}
                  <ActionPlanCard result={result} />

                  {/* 4. SPIKE — collapsed */}
                  <StrategyCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    title="Spike Analysis"
                    strength={spikeStrength(analysis)}
                    headline={
                      analysis.spike.primary
                        ? `${analysis.spike.primary} · ${analysis.spike.clarity}`
                        : "No clear spike"
                    }
                  >
                    <SpikeBody result={result} analysis={analysis} />
                  </StrategyCard>

                  {/* 5. GAPS — collapsed, GapItem list */}
                  <StrategyCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    title="Gaps"
                    strength={gapsStrength(analysis)}
                    headline={`${analysis.weaknesses.length} flagged`}
                  >
                    <GapsBody result={result} analysis={analysis} />
                  </StrategyCard>

                  {/* 6. RECOMMENDED FOR YOUR MAJOR — major-aware picks */}
                  <StrategyCard
                    icon={<GraduationCap className="w-4 h-4" />}
                    title="Recommended for Your Major"
                    strength={majorRecsStrength(analysis.majorRecommendations)}
                    headline={majorRecsHeadline(analysis.majorRecommendations)}
                  >
                    <MajorRecommendationsBody
                      recs={analysis.majorRecommendations}
                      onMajorSaved={refresh}
                    />
                  </StrategyCard>

                  {/* 7. SCHOOL LIST STRATEGY — collapsed, distribution bar */}
                  <StrategyCard
                    icon={<School className="w-4 h-4" />}
                    title="School List Strategy"
                    strength={schoolListStrength(analysis)}
                    headline={`${analysis.schoolList.total} pinned · ${analysis.schoolList.balance}`}
                  >
                    <SchoolListBody result={result} analysis={analysis} />
                  </StrategyCard>

                  {/* 7. APPLICATION STRATEGY — collapsed */}
                  <StrategyCard
                    icon={<ArrowRight className="w-4 h-4" />}
                    title="Application Strategy"
                    strength="neutral"
                    headline={`${analysis.earlyStrategy.length} schools · per-school plan`}
                  >
                    <ApplicationStrategyBody result={result} />
                  </StrategyCard>

                  {/* Footer: last-updated + re-run CTA */}
                  <FooterBar
                    generatedAt={result.generatedAt}
                    onRerun={() => generate({ bypassCache: true })}
                    loading={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </AuroraBackground>
  );
}

// ── Section bodies ──────────────────────────────────────────────────────────

function SnapshotBody({
  result,
  analysis,
}: {
  result: StrategyResult;
  analysis: StrategyAnalysis;
}) {
  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
        {result.profileSummary.body}
      </p>

      {/* Clickable stat chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        <StatChip
          label="Academics"
          value={TIER_LABEL[analysis.academic.tier]}
          tooltip={analysis.academic.signals.join(" · ")}
          tone={
            analysis.academic.tier === "elite" || analysis.academic.tier === "strong"
              ? "good"
              : analysis.academic.tier === "limited"
                ? "bad"
                : "mid"
          }
        />
        <StatChip
          label="Extracurriculars"
          value={EC_LABEL[analysis.ec.tier]}
          tooltip={analysis.ec.signals.join(" · ")}
          tone={
            analysis.ec.tier === "exceptional" || analysis.ec.tier === "strong"
              ? "good"
              : analysis.ec.tier === "limited" || analysis.ec.tier === "missing"
                ? "bad"
                : "mid"
          }
        />
        <StatChip
          label="Positioning"
          value={PERCENTILE_LABEL[analysis.positioning.percentileEstimate]}
          tooltip={analysis.positioning.gaps.join(" · ")}
          tone={
            analysis.positioning.percentileEstimate === "top-10" ||
            analysis.positioning.percentileEstimate === "top-25"
              ? "good"
              : "mid"
          }
        />
      </div>

      {/* Competitiveness sub-section */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1">
          Competitiveness Positioning
        </p>
        <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
          {result.competitiveness.body}
        </p>
      </div>
    </div>
  );
}

function DreamSchoolBody({
  result,
  dreamSchool,
}: {
  result: StrategyResult;
  dreamSchool: string | null;
}) {
  const ds = result.dreamSchool;
  const [leversOpen, setLeversOpen] = useState(false);

  if (!ds && !dreamSchool) {
    return (
      <div className="pt-3">
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          Pick a dream school using the selector above to get a dedicated ED/EA decision with specific reasoning for that school.
        </p>
      </div>
    );
  }

  if (!ds && dreamSchool) {
    return (
      <div className="pt-3">
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-2">
          You selected <span className="text-zinc-200 font-semibold">{dreamSchool}</span>, but this strategy was generated before that. Click <span className="text-zinc-200 font-semibold">Re-run</span> above to get the dedicated decision block.
        </p>
      </div>
    );
  }

  if (!ds) return null;

  return (
    <div className="space-y-4 pt-3">
      {/* ED verdict block */}
      <EdVerdictBlock verdict={ds.edVerdict} headline={ds.verdictHeadline} />

      {/* Reasoning */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1.5">
          Reasoning
        </p>
        <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
          {ds.reasoning}
        </p>
      </div>

      {/* What would change this? */}
      {ds.whatWouldChangeThis.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setLeversOpen((v) => !v)}
            aria-expanded={leversOpen}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-300 hover:text-blue-200 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            What would change this verdict?
          </button>
          <AnimatePresence initial={false}>
            {leversOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <ul className="mt-3 space-y-2">
                  {ds.whatWouldChangeThis.map((lever, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed"
                    >
                      <span className="text-blue-300 mt-0.5 shrink-0">→</span>
                      <span>{lever}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const EDV_STYLES: Record<
  EdVerdict,
  { bg: string; ring: string; text: string; icon: React.ElementType; label: string }
> = {
  yes: {
    bg: "bg-emerald-500/[0.08]",
    ring: "ring-emerald-400/40",
    text: "text-emerald-200",
    icon: CheckCircle2,
    label: "ED: YES",
  },
  conditional: {
    bg: "bg-amber-500/[0.08]",
    ring: "ring-amber-400/40",
    text: "text-amber-200",
    icon: AlertTriangle,
    label: "ED: CONDITIONAL",
  },
  no: {
    bg: "bg-red-500/[0.08]",
    ring: "ring-red-400/40",
    text: "text-red-200",
    icon: XCircle,
    label: "ED: NO",
  },
};

function EdVerdictBlock({
  verdict,
  headline,
}: {
  verdict: EdVerdict;
  headline: string;
}) {
  const s = EDV_STYLES[verdict];
  const Icon = s.icon;
  return (
    <div
      className={`rounded-xl ${s.bg} ring-1 ${s.ring} p-4 flex items-center gap-3`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04]`}
      >
        <Icon className={`w-5 h-5 ${s.text}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p
          className={`text-[10px] uppercase tracking-[0.18em] font-bold ${s.text} mb-0.5`}
        >
          {s.label}
        </p>
        <p className="text-[14px] text-zinc-100 font-semibold leading-snug">
          {headline}
        </p>
      </div>
    </div>
  );
}

function ActionPlanCard({ result }: { result: StrategyResult }) {
  const bullets = result.actionPlan.bullets ?? [];
  const { isDone, toggle, completedCount } = useActionChecklist(
    result.generatedAt,
    bullets.length,
  );

  return (
    <StrategyCard
      icon={<CheckCircle2 className="w-4 h-4" />}
      title="Action Plan"
      strength="neutral"
      headline={`${completedCount} of ${bullets.length} done`}
      defaultExpanded
      emphasize
      rightSlot={
        bullets.length > 0 ? (
          <span className="inline-flex items-center text-[11px] font-mono tabular-nums text-blue-300">
            {completedCount}/{bullets.length}
          </span>
        ) : null
      }
    >
      <div className="space-y-4 pt-3">
        {result.actionPlan.body && (
          <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line">
            {result.actionPlan.body}
          </p>
        )}
        <ActionChecklist items={bullets} isDone={isDone} onToggle={toggle} />
      </div>
    </StrategyCard>
  );
}

function SpikeBody({
  result,
  analysis,
}: {
  result: StrategyResult;
  analysis: StrategyAnalysis;
}) {
  const [improveOpen, setImproveOpen] = useState(false);
  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
        {result.spikeAnalysis.body}
      </p>

      {/* Signals from analyzer */}
      <div className="flex flex-wrap gap-1.5">
        {analysis.spike.signals.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400"
          >
            {s}
          </span>
        ))}
      </div>

      {/* How to improve this toggle */}
      <div>
        <button
          type="button"
          onClick={() => setImproveOpen((v) => !v)}
          aria-expanded={improveOpen}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-300 hover:text-blue-200 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          How to sharpen this spike
        </button>
        <AnimatePresence initial={false}>
          {improveOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <ul className="mt-3 space-y-2 text-[13px] text-zinc-300 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-blue-300 shrink-0">→</span>
                  <span>
                    Convert your strongest Tier-3 activity into a Tier-2 move via measurable
                    impact (numbers, growth, outcomes) — depth beats breadth.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-300 shrink-0">→</span>
                  <span>
                    Thread your top 3 activities around one theme. A &quot;why&quot; statement
                    that connects them makes the spike legible to readers in 10 seconds.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-300 shrink-0">→</span>
                  <span>
                    Add one external validation signal — a published piece, a selective
                    program acceptance, or a regional-level win within the spike category.
                  </span>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GapsBody({
  result,
  analysis,
}: {
  result: StrategyResult;
  analysis: StrategyAnalysis;
}) {
  // Pair analyzer weakness flags with LLM bullets by index when available.
  const llmBullets = result.weaknessDiagnosis.bullets ?? [];
  return (
    <div className="space-y-3 pt-3">
      {result.weaknessDiagnosis.body && (
        <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line">
          {result.weaknessDiagnosis.body}
        </p>
      )}
      <div className="space-y-2">
        {analysis.weaknesses.map((w, i) => (
          <GapItem key={w.code} flag={w} fixSuggestion={llmBullets[i] ?? null} />
        ))}
      </div>
    </div>
  );
}

const CLASSIFICATION_COLORS: Record<Classification, string> = {
  safety: "bg-emerald-500/70",
  likely: "bg-blue-500/70",
  target: "bg-amber-500/70",
  reach: "bg-orange-500/70",
  unlikely: "bg-red-500/70",
};

const CLASSIFICATION_TEXT: Record<Classification, string> = {
  safety: "text-emerald-300",
  likely: "text-blue-300",
  target: "text-amber-300",
  reach: "text-orange-300",
  unlikely: "text-red-300",
};

function SchoolListBody({
  result,
  analysis,
}: {
  result: StrategyResult;
  analysis: StrategyAnalysis;
}) {
  const [selected, setSelected] = useState<Classification | null>(null);
  const { counts, total } = analysis.schoolList;
  const order: readonly Classification[] = [
    "safety",
    "likely",
    "target",
    "reach",
    "unlikely",
  ];
  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
        {result.schoolListStrategy.body}
      </p>

      {/* Distribution bar — segments proportional to count */}
      {total > 0 && (
        <div>
          <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
            {order.map((cat) => {
              const n = counts[cat];
              if (n === 0) return null;
              const pct = (n / total) * 100;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelected((s) => (s === cat ? null : cat))}
                  aria-label={`${n} ${cat} school${n === 1 ? "" : "s"}`}
                  className={`${CLASSIFICATION_COLORS[cat]} hover:brightness-125 transition-[filter] duration-150`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          {/* Count tiles */}
          <div className="mt-3 grid grid-cols-5 gap-2">
            {order.map((cat) => {
              const n = counts[cat];
              const active = selected === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelected((s) => (s === cat ? null : cat))}
                  className={`rounded-lg px-2 py-2 text-center transition-[background-color,border-color] duration-200 border ${
                    active
                      ? "bg-white/[0.06] border-white/[0.16]"
                      : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                  }`}
                >
                  <p
                    className={`text-lg font-semibold font-mono tabular-nums ${CLASSIFICATION_TEXT[cat]}`}
                  >
                    {n}
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-500 mt-0.5">
                    {cat}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Per-category school list when a tile is clicked */}
          <AnimatePresence initial={false}>
            {selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden mt-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-2">
                  {counts[selected]} {selected} school{counts[selected] === 1 ? "" : "s"}
                </p>
                <SchoolsInClassificationNote classification={selected} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Warnings from analyzer */}
      {analysis.schoolList.warnings.length > 0 && (
        <div className="space-y-1.5">
          {analysis.schoolList.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[12px] text-amber-300/90"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Small helper that reads pinned schools from localStorage at click time,
// filters by the selected classification, and renders the names. Avoids
// threading the full pinned list down through every card prop.
function SchoolsInClassificationNote({
  classification,
}: {
  classification: Classification;
}) {
  const names = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const pins = JSON.parse(
        localStorage.getItem("admitedge-pinned-colleges") ?? "[]",
      );
      if (!Array.isArray(pins)) return [];
      // We don't have classifications cached here — just return the names.
      // The user can cross-reference with the classification tile counts.
      return pins.map((p: { name?: string }) => p?.name).filter(Boolean);
    } catch {
      return [];
    }
  }, []);
  void classification;
  return (
    <p className="text-[12px] text-zinc-400 leading-relaxed">
      Pinned schools: {names.length > 0 ? names.join(", ") : "—"}
    </p>
  );
}

function ApplicationStrategyBody({ result }: { result: StrategyResult }) {
  return (
    <div className="space-y-3 pt-3">
      <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
        {result.applicationStrategy.body}
      </p>
      {result.applicationStrategy.bullets &&
        result.applicationStrategy.bullets.length > 0 && (
          <ul className="space-y-2">
            {result.applicationStrategy.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed"
              >
                <span className="text-zinc-500 mt-0.5 shrink-0">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  tooltip: string;
  tone: "good" | "mid" | "bad";
}) {
  const [open, setOpen] = useState(false);
  const toneClass =
    tone === "good"
      ? "text-emerald-300 bg-emerald-500/[0.06] ring-emerald-500/25"
      : tone === "bad"
        ? "text-red-300 bg-red-500/[0.06] ring-red-500/25"
        : "text-amber-300 bg-amber-500/[0.06] ring-amber-500/25";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ring-1 ${toneClass} hover:brightness-125 transition-[filter] duration-200`}
      >
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold">{value}</span>
        <HelpCircle className="w-3 h-3 opacity-70" />
      </button>
      <AnimatePresence>
        {open && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 top-full mt-2 w-72 z-10 rounded-lg bg-[#0c0c1a] border border-white/[0.1] p-3 shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
          >
            <p className="text-[11px] text-zinc-300 leading-relaxed">{tooltip}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GenerateBar({
  loading,
  hasResult,
  generatedAt,
  onGenerate,
}: {
  loading: boolean;
  hasResult: boolean;
  generatedAt: number | null;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
      <div className="text-center sm:text-left">
        {generatedAt && (
          <p className="text-[11px] text-zinc-500">
            Last updated {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-200"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : hasResult ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Re-run
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Strategy
          </>
        )}
      </button>
    </div>
  );
}

function FooterBar({
  generatedAt,
  onRerun,
  loading,
}: {
  generatedAt: number;
  onRerun: () => void;
  loading: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl bg-[#0c0c1a]/60 border border-white/[0.05] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-[11px] text-zinc-500">
        Last updated {new Date(generatedAt).toLocaleString()} · Re-run after improvements to see how the briefing changes.
      </p>
      <button
        type="button"
        onClick={onRerun}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Re-run strategy
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
        <Bookmark className="w-6 h-6 text-blue-300" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">
        Pin your target schools first
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
        The Strategy Engine analyzes <em>your</em> pinned college list — not a generic database.
        Head to the College List Builder, find the schools you&apos;re actually considering, and
        pin them with the bookmark icon.
      </p>
      <Link
        href="/colleges"
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors"
      >
        Go to College List Builder
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function MissingDataBanner({ items }: { items: readonly string[] }) {
  return (
    <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-amber-200 font-semibold mb-1">
            Missing data will weaken this analysis
          </p>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            For sharper output, add: {items.join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreGenerationHint({ hasDreamSchool }: { hasDreamSchool: boolean }) {
  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-8 text-center">
      <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
        Click <span className="text-zinc-200 font-semibold">Generate Strategy</span> to run the
        analyzers and produce your consultant briefing.
        {hasDreamSchool
          ? " You'll get a dedicated decision block for your dream school."
          : " Pick a dream school above to unlock the dedicated ED/EA decision block."}
      </p>
    </div>
  );
}

// ── Major-aware recommendations body ────────────────────────────────────────
// Renders the 2+2+2 tier picks from the user's pinned list plus up to 3
// unpinned schools worth considering. If the user hasn't set a major /
// interest yet, shows an inline picker that writes to the shared profile
// and calls `onMajorSaved` so the strategy analysis re-runs with the new
// query applied.

function MajorRecommendationsBody({
  recs,
  onMajorSaved,
}: {
  recs: MajorAwareRecommendations;
  onMajorSaved: () => void;
}) {
  if (!recs.intendedMajor && !recs.intendedInterest) {
    return <MajorPicker onSaved={onMajorSaved} />;
  }

  const totalPinned =
    recs.fromPinned.safeties.length + recs.fromPinned.targets.length + recs.fromPinned.reaches.length;

  return (
    <div className="space-y-5 pt-3">
      <p className="text-[13px] text-zinc-400 leading-relaxed">
        Picks tailored to{" "}
        <span className="text-zinc-200">
          {recs.intendedMajor || recs.intendedInterest}
        </span>
        {recs.intendedMajor && recs.intendedInterest && (
          <>
            {" "}(plus your interest in{" "}
            <span className="text-zinc-200">{recs.intendedInterest}</span>)
          </>
        )}
        .
      </p>

      {totalPinned === 0 && recs.toConsider.length === 0 && (
        <div className="rounded-xl bg-[#0c0c1a]/60 border border-white/[0.06] p-4">
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            None of your pinned schools stand out for{" "}
            <span className="text-zinc-200">
              {recs.intendedMajor || recs.intendedInterest}
            </span>
            , and we didn&apos;t find strong alternatives in the full list. Try a
            more specific interest or a different major.
          </p>
        </div>
      )}

      {totalPinned > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 mb-3">
            From your pinned list
          </h4>
          <div className="space-y-4">
            <RecTierRow label="Safety"  color="text-emerald-400" items={recs.fromPinned.safeties} />
            <RecTierRow label="Target"  color="text-amber-400"   items={recs.fromPinned.targets} />
            <RecTierRow label="Reach"   color="text-orange-400"  items={recs.fromPinned.reaches} />
          </div>
        </div>
      )}

      {recs.toConsider.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 mb-3">
            Consider adding
          </h4>
          <div className="space-y-2">
            {recs.toConsider.map((c) => (
              <RecCard key={c.college.name} item={c} />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          // Let the user change their preference without leaving the page.
          try {
            const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
            const current = raw ? JSON.parse(raw) : {};
            setItemAndNotify(
              PROFILE_STORAGE_KEY,
              JSON.stringify({ ...current, intendedMajor: "", intendedInterest: "" }),
            );
            onMajorSaved();
          } catch { /* ignore */ }
        }}
        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Change major / interest
      </button>
    </div>
  );
}

function RecTierRow({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: readonly ClassifiedCollege[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${color} w-16 shrink-0 pt-1`}>
          {label}
        </span>
        <p className="text-[12px] text-zinc-600 italic pt-1">
          None pinned in this tier &mdash; add one.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${color} w-16 shrink-0 pt-2`}>
        {label}
      </span>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((c) => (
          <RecCard key={c.college.name} item={c} />
        ))}
      </div>
    </div>
  );
}

function RecCard({ item }: { item: ClassifiedCollege }) {
  const c = item.college;
  const match = item.majorMatch ?? "none";
  const matchLabel = match === "strong"
    ? { text: "Strong fit",    color: "text-emerald-400" }
    : match === "decent"
    ? { text: "Adjacent fit",  color: "text-zinc-500" }
    : null;
  return (
    <div className="rounded-lg bg-[#0c0c1a]/60 border border-white/[0.04] px-3 py-2 hover:border-white/[0.12] transition-colors">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-zinc-200 truncate">{c.name}</p>
        <span className="text-[11px] font-mono tabular-nums text-zinc-500 shrink-0">
          {c.acceptanceRate}%
        </span>
      </div>
      {matchLabel && (
        <p className={`text-[11px] mt-0.5 ${matchLabel.color}`}>{matchLabel.text}</p>
      )}
    </div>
  );
}

function MajorPicker({ onSaved }: { onSaved: () => void }) {
  const [major, setMajor] = useState<string>("");
  const [interest, setInterest] = useState<string>("");

  const save = () => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      setItemAndNotify(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          ...current,
          intendedMajor: major === "Any" ? "" : major,
          intendedInterest: interest.trim(),
        }),
      );
      onSaved();
    } catch { /* ignore */ }
  };

  const canSave = (major && major !== "Any") || interest.trim().length > 0;

  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-zinc-400 leading-relaxed">
        Tell us what you want to study and we&apos;ll surface the schools in your
        pinned list (and a few outside it) that are strong in that area. This
        doesn&apos;t narrow your list elsewhere &mdash; it only adds this one
        card.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Major
          </label>
          <select
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none appearance-none cursor-pointer"
          >
            {MAJORS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Specific interest (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. sustainability, quant trading"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-white/[0.04] disabled:text-zinc-600 text-blue-200 px-4 py-2 text-xs font-semibold transition-colors"
      >
        Save and show picks
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
