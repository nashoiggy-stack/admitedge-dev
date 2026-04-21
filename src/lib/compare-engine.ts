// ── College Comparison Engine (deterministic) ──────────────────────────────
//
// Pure TypeScript helpers that take 2-4 colleges and produce structured
// comparison signals, "best by category" picks, and decision insights.
// No LLM calls — everything is derived from the College interface.

import type { College, Classification, Tier3, ClassifiedCollege } from "./college-types";
import { classifyCollege } from "./admissions";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ComparisonInsight {
  readonly label: string;       // e.g. "Most selective"
  readonly collegeName: string;  // winner
  readonly detail: string;       // why
  readonly category: "admissions" | "academics" | "campus" | "outcomes" | "cost" | "fit";
}

export interface CategoryComparison {
  readonly field: string;
  readonly label: string;
  readonly values: readonly { collegeName: string; value: string; isBest: boolean }[];
}

export interface CollegeFitSummary {
  readonly college: College;
  readonly classification: Classification;
  readonly fitScore: number;
  readonly reason: string;
  readonly fitLabel: string;
}

// ── Tier scoring (for ranking) ─────────────────────────────────────────────

const TIER3_SCORE: Record<Tier3, number> = { high: 3, medium: 2, low: 1 };
const SELECTIVITY_SCORE: Record<string, number> = { ultra: 4, high: 3, medium: 2, low: 1 };

function tier3Display(v: Tier3 | undefined | null): string {
  if (!v) return "—";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function boolDisplay(v: boolean | undefined | null): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function arrDisplay(v: readonly string[] | undefined | null): string {
  if (!v || v.length === 0) return "—";
  return v.join(", ");
}

// ── Best-by-category ───────────────────────────────────────────────────────

function bestByNumericDesc(
  colleges: readonly College[],
  field: keyof College,
  label: string,
  formatter: (v: number) => string,
): CategoryComparison | null {
  const entries = colleges
    .map((c) => ({ collegeName: c.name, raw: c[field] as number | null | undefined }))
    .filter((e): e is { collegeName: string; raw: number } => typeof e.raw === "number");
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.raw));
  return {
    field: field as string,
    label,
    values: colleges.map((c) => {
      const raw = c[field] as number | null | undefined;
      const val = typeof raw === "number" ? raw : null;
      return {
        collegeName: c.name,
        value: val != null ? formatter(val) : "—",
        isBest: val === max,
      };
    }),
  };
}

function bestByNumericAsc(
  colleges: readonly College[],
  field: keyof College,
  label: string,
  formatter: (v: number) => string,
): CategoryComparison | null {
  const entries = colleges
    .map((c) => ({ collegeName: c.name, raw: c[field] as number | null | undefined }))
    .filter((e): e is { collegeName: string; raw: number } => typeof e.raw === "number");
  if (entries.length === 0) return null;
  const min = Math.min(...entries.map((e) => e.raw));
  return {
    field: field as string,
    label,
    values: colleges.map((c) => {
      const raw = c[field] as number | null | undefined;
      const val = typeof raw === "number" ? raw : null;
      return {
        collegeName: c.name,
        value: val != null ? formatter(val) : "—",
        isBest: val === min,
      };
    }),
  };
}

function bestByTier3(
  colleges: readonly College[],
  field: keyof College,
  label: string,
): CategoryComparison {
  const max = Math.max(
    ...colleges.map((c) => TIER3_SCORE[(c[field] as Tier3 | undefined) ?? "low"] ?? 0),
  );
  return {
    field: field as string,
    label,
    values: colleges.map((c) => {
      const v = (c[field] as Tier3 | undefined) ?? undefined;
      return {
        collegeName: c.name,
        value: tier3Display(v),
        isBest: TIER3_SCORE[v ?? "low"] === max && max > 0,
      };
    }),
  };
}

function bestByBool(
  colleges: readonly College[],
  field: keyof College,
  label: string,
): CategoryComparison {
  return {
    field: field as string,
    label,
    values: colleges.map((c) => ({
      collegeName: c.name,
      value: boolDisplay(c[field] as boolean | undefined),
      isBest: (c[field] as boolean | undefined) === true,
    })),
  };
}

function compareByStringArray(
  colleges: readonly College[],
  field: keyof College,
  label: string,
): CategoryComparison {
  return {
    field: field as string,
    label,
    values: colleges.map((c) => ({
      collegeName: c.name,
      value: arrDisplay(c[field] as readonly string[] | undefined),
      isBest: false, // no "best" for array fields
    })),
  };
}

function compareByString(
  colleges: readonly College[],
  field: keyof College,
  label: string,
): CategoryComparison {
  return {
    field: field as string,
    label,
    values: colleges.map((c) => ({
      collegeName: c.name,
      value: (c[field] as string | undefined) ?? "—",
      isBest: false,
    })),
  };
}

// ── Section builders ───────────────────────────────────────────────────────

export function compareAdmissions(colleges: readonly College[]): CategoryComparison[] {
  return [
    bestByNumericAsc(colleges, "acceptanceRate", "Acceptance Rate", (v) => `${v}%`),
    {
      field: "selectivityTier",
      label: "Selectivity Tier",
      values: colleges.map((c) => {
        const v = c.selectivityTier ?? (c.acceptanceRate <= 8 ? "ultra" : c.acceptanceRate <= 20 ? "high" : c.acceptanceRate <= 50 ? "medium" : "low");
        const score = SELECTIVITY_SCORE[v] ?? 0;
        const max = Math.max(
          ...colleges.map((cc) => {
            const vv = cc.selectivityTier ?? (cc.acceptanceRate <= 8 ? "ultra" : cc.acceptanceRate <= 20 ? "high" : cc.acceptanceRate <= 50 ? "medium" : "low");
            return SELECTIVITY_SCORE[vv] ?? 0;
          }),
        );
        return { collegeName: c.name, value: v.charAt(0).toUpperCase() + v.slice(1), isBest: score === max };
      }),
    },
    {
      field: "satRange",
      label: "SAT Range",
      values: colleges.map((c) => ({
        collegeName: c.name,
        value: `${c.sat25}–${c.sat75}`,
        isBest: c.sat75 === Math.max(...colleges.map((cc) => cc.sat75)),
      })),
    },
    {
      field: "actRange",
      label: "ACT Range",
      values: colleges.map((c) => ({
        collegeName: c.name,
        value: `${c.act25}–${c.act75}`,
        isBest: c.act75 === Math.max(...colleges.map((cc) => cc.act75)),
      })),
    },
    compareByString(colleges, "testPolicy", "Test Policy"),
  ].filter((v): v is CategoryComparison => v != null);
}

export function compareAcademics(colleges: readonly College[]): CategoryComparison[] {
  return [
    compareByStringArray(colleges, "topMajors", "Strong Majors"),
    compareByStringArray(colleges, "knownFor", "Known For"),
    bestByTier3(colleges, "academicIntensity", "Academic Intensity"),
    bestByTier3(colleges, "researchStrength", "Research Strength"),
    bestByTier3(colleges, "internshipStrength", "Internship Access"),
    bestByTier3(colleges, "flexibility", "Academic Flexibility"),
    compareByString(colleges, "coreCurriculum", "Core Curriculum"),
    bestByTier3(colleges, "gradSchoolStrength", "Grad School Strength"),
  ];
}

export function compareCampus(colleges: readonly College[]): CategoryComparison[] {
  return [
    compareByStringArray(colleges, "vibeTags", "Vibe"),
    bestByTier3(colleges, "socialScene", "Social Scene"),
    bestByTier3(colleges, "greekLifePresence", "Greek Life"),
    bestByTier3(colleges, "sportsCulture", "Sports Culture"),
    bestByTier3(colleges, "campusCohesion", "Campus Cohesion"),
    compareByString(colleges, "weather", "Weather"),
    bestByTier3(colleges, "proximityToCity", "Proximity to City"),
  ];
}

export function compareOutcomes(colleges: readonly College[]): CategoryComparison[] {
  return [
    compareByStringArray(colleges, "topIndustries", "Top Industries"),
    compareByStringArray(colleges, "careerPipelines", "Career Pipelines"),
    bestByTier3(colleges, "gradSchoolStrength", "Grad School Strength"),
  ];
}

export function compareCost(colleges: readonly College[]): CategoryComparison[] {
  return [
    bestByTier3(colleges, "costTier", "Cost Tier"),
    bestByBool(colleges, "strongFinancialAid", "Strong Financial Aid"),
    bestByBool(colleges, "strongMeritAid", "Strong Merit Aid"),
  ];
}

export function compareDemographics(colleges: readonly College[]): CategoryComparison[] {
  return [
    bestByTier3(colleges, "diversityIndex", "Diversity"),
    bestByNumericDesc(colleges, "percentInternational", "International Students", (v) => `${v}%`),
  ].filter((v): v is CategoryComparison => v != null);
}

// ── Decision insights ──────────────────────────────────────────────────────

/**
 * Picks the college with the strictly highest score. Returns null if the
 * comparison set is empty OR multiple colleges tie for the top score — ties
 * shouldn't award a "winner" because the result would depend on input order
 * (the source of the first-college-always-wins bug).
 */
function uniqueTopBy<T>(
  items: readonly T[],
  scoreFn: (item: T) => number,
): T | null {
  if (items.length === 0) return null;
  let topScore = -Infinity;
  let topIndex = -1;
  let tied = false;
  for (let i = 0; i < items.length; i++) {
    const s = scoreFn(items[i]);
    if (s > topScore) {
      topScore = s;
      topIndex = i;
      tied = false;
    } else if (s === topScore) {
      tied = true;
    }
  }
  if (topIndex === -1 || tied) return null;
  return items[topIndex];
}

/**
 * Generate 3-6 non-obvious decision insights from the comparison set.
 * Deterministic — picks strict winners by field and creates one-line
 * insights. Insights for ties are skipped entirely rather than defaulting
 * to the first-listed college.
 */
export function generateComparisonInsights(
  colleges: readonly College[],
): readonly ComparisonInsight[] {
  if (colleges.length < 2) return [];
  const insights: ComparisonInsight[] = [];

  // Most selective — lowest acceptanceRate. Use negative score for
  // uniqueTopBy, which picks the strictly highest.
  const mostSelective = uniqueTopBy(colleges, (c) => -c.acceptanceRate);
  if (mostSelective) {
    insights.push({
      label: "Most selective",
      collegeName: mostSelective.name,
      detail: `${mostSelective.acceptanceRate}% acceptance rate`,
      category: "admissions",
    });
  }

  // Strongest research — must have a strictly top tier AND that tier is "high".
  const bestResearch = uniqueTopBy(
    colleges,
    (c) => TIER3_SCORE[c.researchStrength ?? "low"] ?? 0,
  );
  if (bestResearch && bestResearch.researchStrength === "high") {
    insights.push({
      label: "Strongest research",
      collegeName: bestResearch.name,
      detail: (bestResearch.knownFor ?? []).slice(0, 2).join(", ") || "Research powerhouse",
      category: "academics",
    });
  }

  // Best campus community — strict winner on campusCohesion tier.
  const bestCohesion = uniqueTopBy(
    colleges,
    (c) => TIER3_SCORE[c.campusCohesion ?? "low"] ?? 0,
  );
  if (bestCohesion && bestCohesion.campusCohesion && bestCohesion.campusCohesion !== "low") {
    insights.push({
      label: "Best campus community",
      collegeName: bestCohesion.name,
      detail: (bestCohesion.vibeTags ?? []).slice(0, 3).join(", ") || "Strong community",
      category: "campus",
    });
  }

  // Strongest career pipelines — strict winner by number of pipelines listed.
  const bestCareer = uniqueTopBy(colleges, (c) => c.careerPipelines?.length ?? 0);
  if (bestCareer && bestCareer.careerPipelines && bestCareer.careerPipelines.length > 0) {
    insights.push({
      label: `Strongest for ${bestCareer.careerPipelines[0]}`,
      collegeName: bestCareer.name,
      detail: bestCareer.careerPipelines.join(", "),
      category: "outcomes",
    });
  }

  // Best financial aid — only highlight if exactly one college has the flag.
  // If all of them meet need (common for the Ivy set), the insight is noise.
  const aidColleges = colleges.filter((c) => c.strongFinancialAid === true);
  if (aidColleges.length === 1) {
    insights.push({
      label: "Best financial aid",
      collegeName: aidColleges[0].name,
      detail: "Meets 100% demonstrated need",
      category: "cost",
    });
  }

  // Most academic freedom — prefer a strict open-curriculum winner, else
  // strict winner on the flexibility tier.
  const openCurriculum = colleges.filter((c) => c.coreCurriculum === "open");
  if (openCurriculum.length === 1) {
    insights.push({
      label: "Most academic freedom",
      collegeName: openCurriculum[0].name,
      detail: "Open curriculum",
      category: "academics",
    });
  } else {
    const mostFlexible = uniqueTopBy(
      colleges,
      (c) => TIER3_SCORE[c.flexibility ?? "low"] ?? 0,
    );
    if (mostFlexible && mostFlexible.flexibility === "high") {
      insights.push({
        label: "Most academic freedom",
        collegeName: mostFlexible.name,
        detail: "High flexibility",
        category: "academics",
      });
    }
  }

  return insights.slice(0, 6);
}

// ── Fit summary (wraps classifyCollege for comparison context) ─────────────

const FIT_LABELS: Record<Classification, string> = {
  safety: "Strong Fit",
  likely: "Solid Fit",
  target: "Target",
  reach: "Reach",
  unlikely: "Long Shot",
};

export function getCollegeFitSummary(
  college: College,
  profileData: {
    gpaUW: number | null;
    gpaW: number | null;
    sat: number | null;
    act: number | null;
    essayCA: number | null;
    essayV: number | null;
  },
): CollegeFitSummary {
  const { classification, reason, fitScore } = classifyCollege(
    college,
    profileData.gpaUW,
    profileData.gpaW,
    profileData.sat,
    profileData.act,
    profileData.essayCA,
    profileData.essayV,
  );

  return {
    college,
    classification,
    fitScore,
    reason,
    fitLabel: FIT_LABELS[classification],
  };
}

// ── Full comparison orchestrator ───────────────────────────────────────────

export interface FullComparison {
  readonly colleges: readonly College[];
  readonly insights: readonly ComparisonInsight[];
  readonly admissions: readonly CategoryComparison[];
  readonly academics: readonly CategoryComparison[];
  readonly campus: readonly CategoryComparison[];
  readonly outcomes: readonly CategoryComparison[];
  readonly cost: readonly CategoryComparison[];
  readonly demographics: readonly CategoryComparison[];
  readonly fit: readonly CollegeFitSummary[] | null; // null if no profile
}

export function compareColleges(
  colleges: readonly College[],
  profileData?: {
    gpaUW: number | null;
    gpaW: number | null;
    sat: number | null;
    act: number | null;
    essayCA: number | null;
    essayV: number | null;
  } | null,
): FullComparison {
  return {
    colleges,
    insights: generateComparisonInsights(colleges),
    admissions: compareAdmissions(colleges),
    academics: compareAcademics(colleges),
    campus: compareCampus(colleges),
    outcomes: compareOutcomes(colleges),
    cost: compareCost(colleges),
    demographics: compareDemographics(colleges),
    fit: profileData
      ? colleges.map((c) => getCollegeFitSummary(c, profileData))
      : null,
  };
}
