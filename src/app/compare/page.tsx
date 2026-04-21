"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  GraduationCap,
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Sparkles,
  Crown,
  ChevronDown,
} from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CompareSelector } from "@/components/CompareSelector";
import { DemographicsCard, generateDemographicInsights, type DemoInsight } from "@/components/DemographicsChart";
import {
  MetricBar, RangeBar, MetricCard, CompareSection, CompareRow, TagRow,
  formatCurrency, formatPct, formatRatio,
  buildSchoolColorMap, SchoolColorProvider, SCHOOL_COLORS,
  type SchoolColor,
} from "@/components/CompareVisuals";
import { CampusTab, CultureTab } from "@/components/QualitativeCompare";
import type { College, Classification, Tier3 } from "@/lib/college-types";
import {
  compareColleges,
  type FullComparison,
  type ComparisonInsight,
  type CategoryComparison,
  type CollegeFitSummary,
} from "@/lib/compare-engine";

// ── Profile reading (same shape as other pages) ────────────────────────────

function readProfileForFit(): {
  gpaUW: number | null;
  gpaW: number | null;
  sat: number | null;
  act: number | null;
  essayCA: number | null;
  essayV: number | null;
} | null {
  try {
    const raw = localStorage.getItem("admitedge-profile");
    if (!raw) return null;
    const p = JSON.parse(raw);
    const gpaUW = p.gpaUW ? parseFloat(p.gpaUW) : null;
    const gpaW = p.gpaW ? parseFloat(p.gpaW) : null;
    const sat =
      p.sat?.readingWriting && p.sat?.math
        ? parseInt(p.sat.readingWriting) + parseInt(p.sat.math)
        : null;
    const actParts = [p.act?.english, p.act?.math, p.act?.reading]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .map((v) => parseInt(v))
      .filter((v) => Number.isFinite(v));
    const act =
      actParts.length >= 3
        ? Math.round(actParts.reduce((a, b) => a + b, 0) / actParts.length)
        : null;
    const essayCA = p.essayCommonApp ? parseFloat(p.essayCommonApp) : null;
    const essayV = p.essayVspice ? parseFloat(p.essayVspice) : null;
    if (gpaUW == null && sat == null) return null; // not enough data
    return { gpaUW, gpaW, sat, act, essayCA, essayV };
  } catch {
    return null;
  }
}

// ── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "admissions", label: "Admissions", icon: BarChart3 },
  { key: "academics", label: "Academics", icon: GraduationCap },
  { key: "campus", label: "Campus", icon: Building2 },
  { key: "culture", label: "Culture", icon: Sparkles },
  { key: "outcomes", label: "Outcomes", icon: TrendingUp },
  { key: "cost", label: "Cost", icon: DollarSign },
  { key: "demographics", label: "Demographics", icon: Users },
  { key: "fit", label: "Fit", icon: Target },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Tier colors ────────────────────────────────────────────────────────────

const TIER3_COLOR: Record<Tier3 | string, string> = {
  high: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/25",
  medium: "text-amber-300 bg-amber-500/10 ring-amber-500/25",
  low: "text-red-300 bg-red-500/10 ring-red-500/25",
};

const FIT_COLORS: Record<Classification, { text: string; bg: string; ring: string }> = {
  safety: { text: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-500/25" },
  likely: { text: "text-blue-300", bg: "bg-blue-500/10", ring: "ring-blue-500/25" },
  target: { text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-500/25" },
  reach: { text: "text-orange-300", bg: "bg-orange-500/10", ring: "ring-orange-500/25" },
  unlikely: { text: "text-red-300", bg: "bg-red-500/10", ring: "ring-red-500/25" },
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [selected, setSelected] = useState<College[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("admissions");
  const [profileData, setProfileData] = useState<ReturnType<typeof readProfileForFit>>(null);

  useEffect(() => {
    setProfileData(readProfileForFit());
  }, []);

  // Build per-school color map from selection order (stable across tabs)
  const schoolColorMap = useMemo(
    () => buildSchoolColorMap(selected.map((c) => c.name)),
    [selected],
  );

  // Comparison only runs when the user explicitly confirms their selection.
  // Any add/remove resets confirmed so the user must re-confirm.
  const comparison = useMemo<FullComparison | null>(() => {
    if (!confirmed || selected.length < 2) return null;
    return compareColleges(selected, profileData);
  }, [selected, profileData, confirmed]);

  const onAdd = (c: College) => {
    if (selected.length >= 4) return;
    if (selected.some((s) => s.name === c.name)) return;
    setSelected((prev) => [...prev, c]);
    setConfirmed(false);
  };

  const onRemove = (name: string) => {
    setSelected((prev) => prev.filter((c) => c.name !== name));
    setConfirmed(false);
  };

  const canConfirm = selected.length >= 2 && !confirmed;

  const tabSections: Record<TabKey, readonly CategoryComparison[]> = comparison
    ? {
        admissions: comparison.admissions,
        academics: comparison.academics,
        campus: comparison.campus,
        culture: [],  // handled by CultureTab component
        outcomes: comparison.outcomes,
        cost: comparison.cost,
        demographics: comparison.demographics,
        fit: [], // handled separately
      }
    : {
        admissions: [],
        academics: [],
        campus: [],
        culture: [],
        outcomes: [],
        cost: [],
        demographics: [],
        fit: [],
      };

  // Hide fit tab if no profile
  const visibleTabs = TABS.filter((t) => t.key !== "fit" || profileData != null);

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-6xl px-4 py-16 sm:py-24 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">College Comparison</span>
          </h1>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto text-sm">
            Select 2–4 schools. Compare admissions, academics, campus, outcomes, and fit — side by side.
          </p>
        </motion.div>

        {/* Selector */}
        <ScrollReveal delay={0.08}>
          <CompareSelector
            selected={selected}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        </ScrollReveal>

        {/* Done selecting / edit selection button */}
        {selected.length >= 2 && (
          <div className="mt-6 flex justify-center">
            {canConfirm ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => setConfirmed(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Compare {selected.length} Schools
              </motion.button>
            ) : confirmed ? (
              <button
                type="button"
                onClick={() => setConfirmed(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] transition-colors"
              >
                Edit Selection
              </button>
            ) : null}
          </div>
        )}

        {/* Comparison content — wrapped in school color provider */}
        {comparison && (
          <SchoolColorProvider value={schoolColorMap}>
          <div className="mt-8 space-y-6">
            {/* Decision insights bar */}
            {comparison.insights.length > 0 && (
              <ScrollReveal delay={0.1}>
                <InsightsBar insights={comparison.insights} />
              </ScrollReveal>
            )}

            {/* Fit badges row (if profile exists) */}
            {comparison.fit && (
              <ScrollReveal delay={0.12}>
                <FitBadgeRow fits={comparison.fit} />
              </ScrollReveal>
            )}

            {/* School color legend */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
              {selected.map((c) => {
                const sc = schoolColorMap.get(c.name) ?? SCHOOL_COLORS[0];
                return (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                    <span className={`text-[11px] font-semibold ${sc.text}`}>
                      {c.name.length > 18 ? (c.aliases?.[0] ?? c.name.split(" ").slice(0, 2).join(" ")) : c.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <ScrollReveal delay={0.14}>
              <div className="sticky top-16 z-30 bg-[#06060f]/90 backdrop-blur-md -mx-4 px-4 py-2 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none rounded-b-xl">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-[color,background-color] duration-200 shrink-0 ${
                        isActive
                          ? "text-white bg-white/[0.08]"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </ScrollReveal>

            {/* Active tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {activeTab === "fit" && comparison.fit ? (
                  <FitTab fits={comparison.fit} />
                ) : activeTab === "demographics" ? (
                  <DemographicsTab colleges={selected} />
                ) : activeTab === "admissions" ? (
                  <AdmissionsTab colleges={selected} />
                ) : activeTab === "academics" ? (
                  <AcademicsTab colleges={selected} />
                ) : activeTab === "outcomes" ? (
                  <OutcomesTab colleges={selected} />
                ) : activeTab === "cost" ? (
                  <CostTab colleges={selected} />
                ) : activeTab === "campus" ? (
                  <CampusTab colleges={selected} />
                ) : activeTab === "culture" ? (
                  <CultureTab colleges={selected} />
                ) : (
                  <ComparisonGrid
                    rows={tabSections[activeTab]}
                    colleges={selected}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          </SchoolColorProvider>
        )}

        {/* Placeholder — shown when no comparison is active */}
        {!comparison && (
          <div className="mt-8 rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-12 text-center">
            <p className="text-zinc-500">
              {selected.length === 0
                ? "Search for schools above — or import your pinned list from the College List Builder."
                : selected.length === 1
                  ? "Add one more school, then press Compare."
                  : "Press Compare above to see the side-by-side breakdown."}
            </p>
          </div>
        )}
      </main>
    </AuroraBackground>
  );
}

// ── Insights bar ────────────────────────────────────────────────────────────

function InsightsBar({ insights }: { insights: readonly ComparisonInsight[] }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.06] to-blue-500/[0.02] border border-blue-500/15 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-300" />
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-blue-200">
          Decision Insights
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {insights.map((insight, i) => (
          <InsightPill key={i} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightPill({ insight }: { insight: ComparisonInsight }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.08] hover:ring-white/[0.15] px-3 py-1.5 text-[12px] transition-[box-shadow] duration-200"
      >
        <Crown className="w-3 h-3 text-amber-300" />
        <span className="text-zinc-400">{insight.label}:</span>
        <span className="text-zinc-100 font-semibold">{insight.collegeName}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 top-full mt-1.5 w-60 z-10 rounded-lg bg-[#0c0c1a] border border-white/[0.1] p-3 shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
          >
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              {insight.detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Fit badge row ───────────────────────────────────────────────────────────

function FitBadgeRow({ fits }: { fits: readonly CollegeFitSummary[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {fits.map((f) => {
        const colors = FIT_COLORS[f.classification];
        return (
          <div
            key={f.college.name}
            className={`rounded-xl ${colors.bg} ring-1 ${colors.ring} p-3`}
          >
            <p className="text-[12px] text-zinc-300 font-medium truncate">
              {f.college.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.1em] ${colors.text}`}
              >
                {f.fitLabel}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-zinc-500">
                {f.fitScore}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Comparison grid ─────────────────────────────────────────────────────────

function ComparisonGrid({
  rows,
  colleges,
}: {
  rows: readonly CategoryComparison[];
  colleges: readonly College[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-8 text-center">
        <p className="text-sm text-zinc-500">No data available for this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <ComparisonRow key={row.field} row={row} collegeCount={colleges.length} />
      ))}
    </div>
  );
}

function ComparisonRow({
  row,
  collegeCount,
}: {
  row: CategoryComparison;
  collegeCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBest = row.values.some((v) => v.isBest);

  return (
    <div className="rounded-xl bg-[#0f0f1c] border border-white/[0.05] overflow-hidden hover:border-white/[0.1] transition-[border-color] duration-200">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-semibold">
            {row.label}
          </p>
          <ChevronDown
            className={`w-3 h-3 text-zinc-600 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
              expanded ? "" : "-rotate-90"
            }`}
          />
        </div>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${collegeCount}, minmax(0, 1fr))`,
          }}
        >
          {row.values.map((v) => (
            <ValueCell key={v.collegeName} value={v.value} isBest={v.isBest && hasBest} />
          ))}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 border-t border-white/[0.04] pt-2">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {getFieldContext(row.field)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ValueCell({ value, isBest }: { value: string; isBest: boolean }) {
  // Detect tier3 values for coloring
  const lower = value.toLowerCase();
  const tierMatch =
    lower === "high" || lower === "medium" || lower === "low"
      ? (lower as Tier3)
      : null;
  const tierClass = tierMatch ? TIER3_COLOR[tierMatch] : null;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {isBest && <Crown className="w-3 h-3 text-amber-300 shrink-0" />}
        {tierClass ? (
          <span
            className={`inline-flex items-center text-[12px] font-semibold px-2 py-0.5 rounded-md ring-1 ${tierClass}`}
          >
            {value}
          </span>
        ) : (
          <span
            className={`text-[13px] leading-snug ${
              isBest ? "text-zinc-100 font-semibold" : "text-zinc-300"
            }`}
          >
            {value === "Yes" ? (
              <span className="text-emerald-300 font-semibold">Yes</span>
            ) : value === "No" ? (
              <span className="text-zinc-500">No</span>
            ) : (
              value
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Fit tab ─────────────────────────────────────────────────────────────────

function FitTab({ fits }: { fits: readonly CollegeFitSummary[] }) {
  return (
    <div className="space-y-3">
      {fits.map((f) => {
        const colors = FIT_COLORS[f.classification];
        return (
          <div
            key={f.college.name}
            className="rounded-xl bg-[#0f0f1c] border border-white/[0.05] p-5"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="text-[15px] font-semibold text-zinc-100">
                {f.college.name}
              </h4>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[11px] font-bold uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}
                >
                  {f.fitLabel}
                </span>
                <span className="text-sm font-mono tabular-nums text-zinc-400">
                  {f.fitScore}
                </span>
              </div>
            </div>
            <p className="text-[13px] text-zinc-400 leading-relaxed">
              {f.reason}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Field context ───────────────────────────────────────────────────────────

function getFieldContext(field: string): string {
  const contexts: Record<string, string> = {
    acceptanceRate:
      "Lower is more selective. Sub-10% schools accept a tiny fraction — even strong applicants face uncertainty.",
    selectivityTier:
      "Ultra (<8%) means even perfect stats don't guarantee admission. High (8-20%) is very competitive. Medium/Low are more accessible.",
    satRange:
      "25th–75th percentile range of enrolled students. Scoring above the 75th percentile strengthens your application but doesn't guarantee admission at selective schools.",
    actRange:
      "25th–75th percentile ACT range. Same interpretation as SAT — above the 75th is strong, below the 25th is a risk factor.",
    testPolicy:
      "Required means you must submit. Optional means submitting a strong score helps but a weak one can be withheld. Blind means scores are never seen.",
    academicIntensity:
      "How rigorous the coursework feels. High-intensity schools have demanding workloads and grade deflation. This correlates with stress but also with preparation.",
    researchStrength:
      "Access to undergraduate research opportunities, faculty mentorship, and funded projects. Critical if you're considering graduate school in STEM or social sciences.",
    internshipStrength:
      "How easily students land internships — driven by location, alumni network, and career services. High means most students intern by junior year.",
    flexibility:
      "How freely you can explore majors, take electives outside your department, or double-major. Open curricula score highest.",
    coreCurriculum:
      "Structured = significant required courses (like Columbia's Core). Moderate = some general requirements. Open = minimal requirements (like Brown's Open Curriculum).",
    gradSchoolStrength:
      "How well the school prepares and places students into top graduate and professional programs (med, law, PhD).",
    socialScene:
      "Overall social activity level — party culture, events, student organizations, nightlife access.",
    greekLifePresence:
      "How prominent Greek life is on campus. High means fraternities/sororities are a dominant social force.",
    sportsCulture:
      "How central athletics are to campus life. High = Division I football/basketball school where game days are a major event.",
    campusCohesion:
      "How connected and unified the student body feels. High cohesion = strong school identity, tight-knit community. Low = more fragmented or commuter-heavy.",
    proximityToCity:
      "Access to a major city for internships, social life, and cultural experiences. High = in or adjacent to a major metro.",
    weather:
      "General climate — affects daily life, outdoor activity, and mood. Personal preference, but worth considering for 4 years.",
    costTier:
      "Sticker price tier before financial aid. Public schools are generally lower. Elite privates are high but often offset by strong financial aid.",
    strongFinancialAid:
      "Schools that meet 100% of demonstrated financial need. If your family qualifies, the net cost can be lower than a public school.",
    strongMeritAid:
      "Schools known for generous merit scholarships regardless of financial need. Can dramatically reduce cost for strong applicants.",
    diversityIndex:
      "Relative diversity of the student body across race, ethnicity, and socioeconomic background.",
    percentInternational:
      "Percentage of the student body that comes from outside the US. Higher = more globally diverse campus.",
  };
  return (
    contexts[field] ??
    "Click to expand for context on what this means for your decision."
  );
}

// ── Demographics tab (chart-based, replaces the generic grid) ──────────────

function DemographicsTab({ colleges }: { colleges: readonly College[] }) {
  const insights = useMemo(() => generateDemographicInsights(colleges), [colleges]);

  return (
    <div className="space-y-5">
      {/* Demographic insights */}
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insights.map((ins, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] text-zinc-300"
            >
              <Crown className="w-3 h-3 text-amber-300" />
              <span className="text-zinc-400">{ins.label}:</span>
              <span className="font-semibold text-zinc-100">{ins.collegeName}</span>
            </span>
          ))}
        </div>
      )}

      {/* Side-by-side donut charts */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(colleges.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {colleges.map((c) => (
          <DemographicsCard key={c.name} college={c} />
        ))}
      </div>
    </div>
  );
}

// ── Quantitative tab renderers ─────────────────────────────────────────────

/** Extract { name, value } entries for MetricBar from a numeric College field */
function entries(colleges: readonly College[], field: keyof College) {
  return colleges.map((c) => ({
    name: c.name,
    value: (c[field] as number | null | undefined) ?? 0,
  }));
}

function AdmissionsTab({ colleges }: { colleges: readonly College[] }) {
  return (
    <div className="space-y-5">
      <CompareSection title="Selectivity">
        <CompareRow label="Acceptance Rate" context="Lower is more selective. Sub-10% = extremely competitive even for strong applicants.">
          <MetricBar entries={entries(colleges, "acceptanceRate")} format={formatPct} invertBest />
        </CompareRow>
        <CompareRow label="% from Top 10% of HS Class" context="Higher = more academically competitive peer group.">
          <MetricBar entries={entries(colleges, "pctTopTenClass")} format={formatPct} />
        </CompareRow>
      </CompareSection>

      <CompareSection title="Test Score Ranges">
        <CompareRow label="SAT Range (25th–75th)" context="The middle 50% of enrolled students. Above the 75th strengthens your app.">
          <RangeBar
            entries={colleges.map((c) => ({ name: c.name, low: c.sat25, high: c.sat75 }))}
            globalMin={900}
            globalMax={1600}
          />
        </CompareRow>
        <CompareRow label="ACT Range (25th–75th)" context="Same interpretation as SAT — above the 75th is strong, below the 25th is a risk.">
          <RangeBar
            entries={colleges.map((c) => ({ name: c.name, low: c.act25, high: c.act75 }))}
            globalMin={18}
            globalMax={36}
          />
        </CompareRow>
      </CompareSection>

      <CompareSection title="Test Policy" defaultExpanded={false}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}>
          {colleges.map((c) => (
            <MetricCard
              key={c.name}
              value={c.testPolicy === "required" ? "Required" : c.testPolicy === "blind" ? "Test Blind" : "Optional"}
              label={c.name.split(" ").slice(0, 2).join(" ")}
            />
          ))}
        </div>
      </CompareSection>
    </div>
  );
}

function AcademicsTab({ colleges }: { colleges: readonly College[] }) {
  return (
    <div className="space-y-5">
      <CompareSection title="Academic Profile">
        <CompareRow label="SAT Range" context="Academic caliber of the student body.">
          <RangeBar
            entries={colleges.map((c) => ({ name: c.name, low: c.sat25, high: c.sat75 }))}
            globalMin={900}
            globalMax={1600}
          />
        </CompareRow>
        <CompareRow label="ACT Range">
          <RangeBar
            entries={colleges.map((c) => ({ name: c.name, low: c.act25, high: c.act75 }))}
            globalMin={18}
            globalMax={36}
          />
        </CompareRow>
        {colleges.some((c) => c.avgGPARange) && (
          <CompareRow label="Estimated GPA Range">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}>
              {colleges.map((c) => (
                <MetricCard
                  key={c.name}
                  value={c.avgGPARange ?? "—"}
                  label={c.name.split(" ").slice(0, 2).join(" ")}
                />
              ))}
            </div>
          </CompareRow>
        )}
      </CompareSection>

      <CompareSection title="Teaching & Outcomes">
        <CompareRow label="Student : Faculty Ratio" context="Lower = more personal attention. Under 10:1 is excellent.">
          <MetricBar entries={entries(colleges, "studentFacultyRatio")} format={formatRatio} invertBest />
        </CompareRow>
        <CompareRow label="4-Year Graduation Rate" context="Higher = more students finish on time. Below 60% signals issues.">
          <MetricBar entries={entries(colleges, "fourYearGradRate")} format={formatPct} />
        </CompareRow>
      </CompareSection>

      <CompareSection title="Strengths & Programs">
        <CompareRow label="Known For">
          <TagRow colleges={colleges.map((c) => ({ name: c.name, tags: c.knownFor ?? [] }))} />
        </CompareRow>
        <CompareRow label="Strong Majors">
          <TagRow colleges={colleges.map((c) => ({ name: c.name, tags: c.topMajors ?? [] }))} />
        </CompareRow>
      </CompareSection>

      <CompareSection title="Academic Character" defaultExpanded={false}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}>
          {colleges.map((c) => (
            <MetricCard
              key={c.name}
              value={c.coreCurriculum === "open" ? "Open" : c.coreCurriculum === "structured" ? "Structured" : "Moderate"}
              label={c.name.split(" ").slice(0, 2).join(" ")}
              context={c.coreCurriculum === "open" ? "Maximum freedom" : c.coreCurriculum === "structured" ? "Significant core requirements" : undefined}
            />
          ))}
        </div>
      </CompareSection>
    </div>
  );
}

function OutcomesTab({ colleges }: { colleges: readonly College[] }) {
  const hasSalary = colleges.some((c) => c.avgStartingSalary);
  const has10Yr = colleges.some((c) => c.medianEarnings10Yr);
  const hasEmploy = colleges.some((c) => c.pctEmployed6Mo);

  return (
    <div className="space-y-5">
      {(hasSalary || has10Yr) && (
        <CompareSection title="Earnings">
          {hasSalary && (
            <CompareRow label="Average Starting Salary" context="Median salary for recent graduates across all majors.">
              <MetricBar entries={entries(colleges, "avgStartingSalary")} format={formatCurrency} />
            </CompareRow>
          )}
          {has10Yr && (
            <CompareRow label="10-Year Median Earnings" context="College Scorecard data. Reflects career trajectory, not just first job.">
              <MetricBar entries={entries(colleges, "medianEarnings10Yr")} format={formatCurrency} />
            </CompareRow>
          )}
        </CompareSection>
      )}

      {hasEmploy && (
        <CompareSection title="Employment">
          <CompareRow label="% Employed or Grad School (6 mo)" context="Higher = stronger career services and employer demand.">
            <MetricBar entries={entries(colleges, "pctEmployed6Mo")} format={formatPct} />
          </CompareRow>
        </CompareSection>
      )}

      <CompareSection title="Career Pipelines">
        <CompareRow label="Top Industries">
          <TagRow colleges={colleges.map((c) => ({ name: c.name, tags: c.topIndustries ?? [] }))} />
        </CompareRow>
        <CompareRow label="Pipelines">
          <TagRow colleges={colleges.map((c) => ({ name: c.name, tags: c.careerPipelines ?? [] }))} />
        </CompareRow>
      </CompareSection>
    </div>
  );
}

function CostTab({ colleges }: { colleges: readonly College[] }) {
  const hasSticker = colleges.some((c) => c.annualCostEstimate);
  const hasNet = colleges.some((c) => c.avgNetPrice);

  return (
    <div className="space-y-5">
      {hasSticker && (
        <CompareSection title="Sticker Price">
          <CompareRow label="Annual Cost (Tuition + Room & Board)" context="Before financial aid. The number on the bill — most students pay less.">
            <MetricBar entries={entries(colleges, "annualCostEstimate")} format={formatCurrency} invertBest />
          </CompareRow>
        </CompareSection>
      )}

      {hasNet && (
        <CompareSection title="Average Net Price">
          <CompareRow label="What families actually pay" context="Average net price after all grants and scholarships. Lower = more generous aid.">
            <MetricBar entries={entries(colleges, "avgNetPrice")} format={formatCurrency} invertBest />
          </CompareRow>
        </CompareSection>
      )}

      <CompareSection title="Financial Aid">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}>
          {colleges.map((c) => (
            <div key={c.name} className="space-y-2">
              <MetricCard
                value={c.strongFinancialAid ? "Yes" : "No"}
                label="Meets full need"
                isBest={c.strongFinancialAid === true}
                color={c.strongFinancialAid ? "text-emerald-300" : "text-zinc-500"}
              />
              <MetricCard
                value={c.strongMeritAid ? "Yes" : "No"}
                label="Merit scholarships"
                isBest={c.strongMeritAid === true}
                color={c.strongMeritAid ? "text-emerald-300" : "text-zinc-500"}
              />
            </div>
          ))}
        </div>
      </CompareSection>
    </div>
  );
}
