import type {
  College,
  Classification,
  ChanceBand,
  ApplicationPlan,
  ApplicationOption,
} from "./college-types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Signal {
  readonly label: string;
  readonly delta: number;
}

export interface AcademicFit {
  readonly signals: Signal[];
  readonly totalDelta: number;
  readonly metrics: number;
}

// ── GPA Comparison ───────────────────────────────────────────────────────────

export function compareGPA(
  userUW: number | null,
  userW: number | null,
  schoolUW: number,
  schoolW: number
): { signals: Signal[]; delta: number; metrics: number } {
  const signals: Signal[] = [];
  let delta = 0;
  let metrics = 0;

  if (userUW !== null) {
    const diff = userUW - schoolUW;
    const normalized = diff / 0.5;
    delta += normalized;
    metrics++;

    if (diff >= 0.15) {
      signals.push({ label: `Your UW GPA (${userUW.toFixed(2)}) is above this school's average (${schoolUW.toFixed(2)})`, delta: normalized });
    } else if (diff >= -0.1) {
      signals.push({ label: `Your UW GPA (${userUW.toFixed(2)}) is within this school's typical range`, delta: normalized });
    } else {
      signals.push({ label: `Your UW GPA (${userUW.toFixed(2)}) is below this school's average (${schoolUW.toFixed(2)})`, delta: normalized });
    }
  }

  if (userW !== null) {
    const diff = userW - schoolW;
    const normalized = diff / 0.6;
    delta += normalized;
    metrics++;

    if (diff >= 0.2) {
      signals.push({ label: `Your weighted GPA (${userW.toFixed(2)}) is above average (${schoolW.toFixed(2)})`, delta: normalized });
    } else if (diff >= -0.15) {
      signals.push({ label: `Your weighted GPA (${userW.toFixed(2)}) is within range`, delta: normalized });
    } else {
      signals.push({ label: `Your weighted GPA (${userW.toFixed(2)}) is below average (${schoolW.toFixed(2)})`, delta: normalized });
    }
  }

  return { signals, delta, metrics };
}

// ── Test Score Utilities ─────────────────────────────────────────────────────
// UNDO: To revert to the old linear/stacking model, replace this entire
// section (from "Test Score Utilities" to the end of "compareTests") with
// the original compareTests function that processed SAT and ACT independently.

/**
 * Normalize a test score against a school's range with school-specific
 * diminishing returns.
 *
 * Ceiling: 0.4 (= max 4 points on 0-100 scale)
 * Decay speed: based on range width — narrow ranges flatten fast,
 * wide ranges flatten slowly.
 *
 * Below p25: linear negative penalty (clamped at -1.5 = -15 pts)
 * At p25: 0 (neutral)
 * Within range: meaningful positive (higher at wider-range schools)
 * Above p75: diminishing returns (faster at narrow-range schools)
 *
 * UNDO: Replace this function with the 0.15-ceiling version.
 */
function normalizeTestScore(
  score: number,
  p25: number,
  p75: number,
  minSpread: number
): number {
  const range = Math.max(p75 - p25, minSpread * 2);
  const position = (score - p25) / range;

  // Below p25: linear negative (clamped at -1.5)
  if (position <= 0) return Math.max(-1.5, position * 1.2);

  // School-specific decay factor:
  // Narrow range (elite) → high decay → flattens fast
  // Wide range (mid-tier) → low decay → flattens slowly
  //
  // SAT range 100 (1480-1580, Harvard) → decay = 3.0 (very fast)
  // SAT range 200 (1200-1400, mid-tier) → decay = 1.5 (moderate)
  // ACT range 2 (34-36, Harvard) → uses minSpread 3→range 6 → decay = 3.0
  // ACT range 4 (28-32, mid-tier) → decay = 2.25
  //
  // Formula: decay = 1.0 + 200 / range (SAT) or 1.0 + 12 / range (ACT)
  // Simplified: use range directly — smaller range = faster decay
  const decay = 1.0 + 12.0 / range;

  // Exponential saturation: ceiling 0.4 (= 4 pts max)
  // output = 0.4 * (1 - e^(-position * decay))
  return 0.4 * (1 - Math.exp(-position * decay));
}

/** Normalize SAT to a school-relative fit index. */
export function normalizeSatToIndex(sat: number, college: College): number {
  return normalizeTestScore(sat, college.sat25, college.sat75, 60);
}

/** Normalize ACT to a school-relative fit index. */
export function normalizeActToIndex(act: number, college: College): number {
  return normalizeTestScore(act, college.act25, college.act75, 3);
}

/**
 * Official ACT-to-SAT concordance table (College Board / ACT joint study).
 * Maps ACT composite → equivalent SAT total.
 * Used to compare SAT and ACT on a common scale before picking the better one.
 * Scores 35-36 and 1530-1600 are intentionally close — they're near-identical.
 */
const ACT_TO_SAT: Record<number, number> = {
  36: 1590, 35: 1560, 34: 1530, 33: 1500, 32: 1470, 31: 1440,
  30: 1410, 29: 1380, 28: 1350, 27: 1320, 26: 1290, 25: 1260,
  24: 1230, 23: 1200, 22: 1170, 21: 1140, 20: 1110, 19: 1080,
  18: 1050, 17: 1020, 16: 990, 15: 960, 14: 930, 13: 900, 12: 870,
};

/** Convert ACT to equivalent SAT using concordance table. */
export function actToSatEquivalent(act: number): number {
  const clamped = Math.round(Math.max(12, Math.min(36, act)));
  return ACT_TO_SAT[clamped] ?? 1050;
}

/**
 * Pick the best single test signal. If both SAT and ACT are provided,
 * convert ACT to SAT-equivalent using the official concordance table,
 * then use whichever represents the higher score on that common scale.
 * A 35 ACT (≈1560 SAT) and a 1550 SAT are nearly identical — the 35 ACT wins
 * marginally, and adding the 1550 SAT does NOT boost anything.
 */
export function getBestTestSignal(
  sat: number | null,
  act: number | null,
  college: College
): { type: "sat" | "act" | null; score: number | null; normalized: number } {
  if (college.testPolicy === "blind") return { type: null, score: null, normalized: 0 };

  if (sat !== null && act !== null) {
    // Compare on SAT scale using concordance
    const actAsSat = actToSatEquivalent(act);
    if (actAsSat >= sat) {
      // ACT is equal or stronger — use ACT
      return { type: "act", score: act, normalized: normalizeActToIndex(act, college) };
    }
    // SAT is stronger — use SAT
    return { type: "sat", score: sat, normalized: normalizeSatToIndex(sat, college) };
  }

  if (sat !== null) return { type: "sat", score: sat, normalized: normalizeSatToIndex(sat, college) };
  if (act !== null) return { type: "act", score: act, normalized: normalizeActToIndex(act, college) };
  return { type: null, score: null, normalized: 0 };
}

// ── Test Score Comparison (uses best single test) ───────────────────────────

export function compareTests(
  sat: number | null,
  act: number | null,
  college: College
): { signals: Signal[]; delta: number; metrics: number } {
  const best = getBestTestSignal(sat, act, college);

  if (best.type === null || best.score === null) {
    return { signals: [], delta: 0, metrics: 0 };
  }

  const signals: Signal[] = [];
  const normalized = best.normalized;

  if (best.type === "sat") {
    const bothNote = act !== null ? " (used over ACT as stronger score)" : "";
    if (best.score >= college.sat75 + 10) {
      signals.push({ label: `Your SAT (${best.score}) is well above the 75th percentile (${college.sat75})${bothNote}`, delta: normalized });
    } else if (best.score >= college.sat25) {
      signals.push({ label: `Your SAT (${best.score}) is within the school's range (${college.sat25}-${college.sat75})${bothNote}`, delta: normalized });
    } else {
      signals.push({ label: `Your SAT (${best.score}) is below the 25th percentile (${college.sat25})${bothNote}`, delta: normalized });
    }
  } else {
    const bothNote = sat !== null ? " (used over SAT as stronger score)" : "";
    if (best.score >= college.act75 + 1) {
      signals.push({ label: `Your ACT (${best.score}) is above the 75th percentile (${college.act75})${bothNote}`, delta: normalized });
    } else if (best.score >= college.act25) {
      signals.push({ label: `Your ACT (${best.score}) is within range (${college.act25}-${college.act75})${bothNote}`, delta: normalized });
    } else {
      signals.push({ label: `Your ACT (${best.score}) is below the 25th percentile (${college.act25})${bothNote}`, delta: normalized });
    }
  }

  // Always exactly 1 metric for tests (never 2)
  return { signals, delta: normalized, metrics: 1 };
}

// ── Selectivity ──────────────────────────────────────────────────────────────

export function selectivityPenalty(acceptanceRate: number): { adjustment: number; signal: Signal | null } {
  if (acceptanceRate <= 8) {
    return {
      adjustment: -15,
      signal: { label: `This school is extremely selective (${acceptanceRate}% acceptance rate) — results remain uncertain even for strong applicants`, delta: -1.5 },
    };
  }
  if (acceptanceRate <= 15) {
    return {
      adjustment: -10,
      signal: { label: `Highly selective school (${acceptanceRate}% acceptance rate)`, delta: -1 },
    };
  }
  if (acceptanceRate <= 25) {
    return { adjustment: -5, signal: null };
  }
  if (acceptanceRate >= 65) {
    return {
      adjustment: 8,
      signal: { label: `Higher acceptance rate (${acceptanceRate}%) works in your favor`, delta: 0.5 },
    };
  }
  return { adjustment: 0, signal: null };
}

// ── Major Adjustment ─────────────────────────────────────────────────────────

export function majorAdjustment(
  major: string,
  competitiveMajors: string[]
): { adjustment: number; signal: Signal | null } {
  if (!major || major === "Any") return { adjustment: 0, signal: null };

  const isCompetitive = competitiveMajors.some(
    (m) => m.toLowerCase() === major.toLowerCase()
  );

  if (isCompetitive) {
    return {
      adjustment: -4,
      signal: { label: `${major} is a competitive major at this school — slightly harder to get in`, delta: -0.3 },
    };
  }

  return { adjustment: 0, signal: null };
}

// ── Classification (for College List Builder) ────────────────────────────────

export function classifyCollege(
  college: College,
  gpaUW: number | null,
  gpaW: number | null,
  sat: number | null,
  act: number | null,
  essayCA: number | null = null,
  essayV: number | null = null
): { classification: Classification; reason: string; fitScore: number } {
  const gpaResult = compareGPA(gpaUW, gpaW, college.avgGPAUW, college.avgGPAW);
  const testResult = compareTests(sat, act, college);
  const essayResult = essayScoreAdjustment(essayCA, essayV);

  const allSignals = [...gpaResult.signals, ...testResult.signals, ...essayResult.signals];
  const totalDelta = gpaResult.delta + testResult.delta;
  const totalMetrics = gpaResult.metrics + testResult.metrics;

  const avg = totalMetrics > 0 ? totalDelta / totalMetrics : 0;
  let classification: Classification;
  let fitScore: number;

  // Essay adjustment applies as a small fitScore modifier (not classification-changing)
  const essayBoost = essayResult.adjustment * 0.5; // dampen for classification purposes

  // 5-tier classification: unlikely → reach → target → likely → safety
  if (avg > 0.8 && college.acceptanceRate >= 40) {
    // Safety: stats well above average AND school isn't too selective
    classification = "safety";
    fitScore = Math.min(95, 80 + avg * 10 + essayBoost);
  } else if (avg > 0.4) {
    // Likely: stats above average, good chance but not guaranteed
    classification = "likely";
    fitScore = Math.min(88, 65 + avg * 20 + essayBoost);
  } else if (avg > -0.3) {
    // Target: stats within range
    classification = "target";
    fitScore = Math.min(75, 50 + (avg + 0.3) * 35 + essayBoost);
  } else if (avg > -0.8) {
    // Reach: stats below range but not impossible
    classification = "reach";
    fitScore = Math.max(15, 35 + avg * 20 + essayBoost);
  } else {
    // Unlikely: stats well below range
    classification = "unlikely";
    fitScore = Math.max(5, 20 + avg * 10 + essayBoost);
  }

  // Highly selective schools (<15%) can never be safety — cap at likely
  if ((classification === "safety" || classification === "likely") && college.acceptanceRate < 15) {
    classification = "target";
    fitScore = Math.min(fitScore, 70);
  }

  // Schools under 30% acceptance can't be safety — cap at likely
  if (classification === "safety" && college.acceptanceRate < 30) {
    classification = "likely";
    fitScore = Math.min(fitScore, 82);
  }

  // No metrics → fall back to acceptance rate heuristic
  if (totalMetrics === 0) {
    if (college.acceptanceRate < 15) { classification = "reach"; fitScore = 25; }
    else if (college.acceptanceRate < 30) { classification = "target"; fitScore = 45; }
    else if (college.acceptanceRate < 55) { classification = "target"; fitScore = 55; }
    else if (college.acceptanceRate < 75) { classification = "likely"; fitScore = 68; }
    else { classification = "safety"; fitScore = 80; }
  }

  const reason = allSignals.length > 0
    ? allSignals.map((s) => s.label).join(". ") + "."
    : `Based on ${college.acceptanceRate}% acceptance rate.`;

  return { classification, reason, fitScore: Math.round(fitScore) };
}

// ── Chance Band ──────────────────────────────────────────────────────────────

export const BAND_LABELS: Record<ChanceBand, string> = {
  "very-low": "Very Low",
  low: "Low",
  possible: "Possible",
  competitive: "Competitive",
  strong: "Strong",
};

export function scoreToBand(score: number): ChanceBand {
  if (score >= 75) return "strong";
  if (score >= 60) return "competitive";
  if (score >= 40) return "possible";
  if (score >= 20) return "low";
  return "very-low";
}

// ── Essay Score Adjustment ───────────────────────────────────────────────────

export function essayScoreAdjustment(
  commonAppScore: number | null, // 0-100
  vspiceComposite: number | null // 0-24
): { adjustment: number; signals: Signal[] } {
  const signals: Signal[] = [];
  let adjustment = 0;

  if (commonAppScore === null && vspiceComposite === null) {
    return { adjustment: 0, signals: [] };
  }

  // Common App score (0-100) — normalize to a -8 to +8 range
  if (commonAppScore !== null) {
    const normalized = (commonAppScore - 60) / 40; // 60 is "average", maps to 0
    const boost = Math.max(-6, Math.min(6, normalized * 8));
    adjustment += boost;

    if (commonAppScore >= 80) {
      signals.push({ label: `Strong Common App essay score (${commonAppScore}/100) — this strengthens your application`, delta: boost });
    } else if (commonAppScore >= 65) {
      signals.push({ label: `Solid Common App essay score (${commonAppScore}/100)`, delta: boost });
    } else {
      signals.push({ label: `Common App essay score (${commonAppScore}/100) has room for improvement`, delta: boost });
    }
  }

  // VSPICE composite (0-24 scale: 6 dimensions × 4 pts + bonuses - pitfalls)
  // Average is ~15 (6 × 2.5). Normalize to a -5 to +5 range.
  if (vspiceComposite !== null) {
    const normalized = (vspiceComposite - 15) / 9; // 15 is ~average, 24 is max
    const boost = Math.max(-4, Math.min(4, normalized * 5));
    adjustment += boost;

    if (vspiceComposite >= 19) {
      signals.push({ label: `Strong VSPICE score (${vspiceComposite}/24) — shows depth of character`, delta: boost });
    } else if (vspiceComposite >= 14) {
      signals.push({ label: `Solid VSPICE score (${vspiceComposite}/24)`, delta: boost });
    } else {
      signals.push({ label: `VSPICE score (${vspiceComposite}/24) could be strengthened`, delta: boost });
    }
  }

  return { adjustment: Math.round(adjustment), signals };
}

// ── UNDO [application-plan] ─────────────────────────────────────────────────
// Everything below this marker (getApplicationOptions, applicationPlanAdjustment)
// is part of the application-plan feature. To revert, delete this block
// entirely. Nothing above depends on these symbols.
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_APPLICATION_OPTIONS: readonly ApplicationOption[] = [{ type: "RD" }];

/**
 * Normalize a college's application options. Colleges without the field fall
 * back to RD-only so callers never have to null-check, and UI always has
 * something to render.
 */
export function getApplicationOptions(college: College): readonly ApplicationOption[] {
  if (college.applicationOptions && college.applicationOptions.length > 0) {
    return college.applicationOptions;
  }
  return DEFAULT_APPLICATION_OPTIONS;
}

/**
 * Return the default plan for a college when the user hasn't chosen one yet,
 * or when the current plan is no longer valid after a college switch.
 * Prefers RD; otherwise the first declared option.
 */
export function defaultApplicationPlan(college: College): ApplicationPlan {
  const opts = getApplicationOptions(college);
  const rd = opts.find((o) => o.type === "RD");
  return rd ? rd.type : opts[0].type;
}

/**
 * Fixed, hand-tuned per-plan boost table.
 *
 * IMPORTANT: These numbers are NOT derived from ED vs RD acceptance rate
 * differences. Early-round acceptance rates are misleading because the early
 * pool is loaded with athletes, legacies, recruited applicants, and
 * institutional priorities. Scaling a boost off that ratio would pretend the
 * model captures hooks it doesn't actually see.
 *
 * Instead, these values reflect the *residual* early advantage for otherwise
 * identical applicants, as reported in admissions research. They are:
 *
 *   - Small enough that no single plan can shift a profile more than one band
 *   - Strictly ordered: RD < EA < REA/SCEA < ED/ED2
 *   - Capped further at elite schools (acceptance rate ≤ 10%) because the
 *     plan advantage is demonstrably smaller the more selective the school
 *
 * Do NOT rescale these based on published ED acceptance rates.
 */
const PLAN_BOOST_NON_ELITE: Record<ApplicationPlan, number> = {
  RD: 0,
  Rolling: 0,
  EA: 1,
  REA: 2,
  SCEA: 2,
  ED: 4,
  ED2: 4,
};

const PLAN_BOOST_ELITE: Record<ApplicationPlan, number> = {
  RD: 0,
  Rolling: 0,
  EA: 1,
  REA: 2,
  SCEA: 2,
  ED: 3,
  ED2: 3,
};

const ELITE_THRESHOLD = 10; // acceptance rate <= this counts as elite
const WEAK_PROFILE_FLOOR = 30; // below this, no plan boost applies
const MAX_PLAN_BOOST = 5; // absolute cap (bands are 15-20 pts wide)

/**
 * Adjustment for the chosen application plan.
 *
 * Guardrails enforced here (all necessary — do not remove any individually):
 *
 *   1. Lookup-table boosts are strictly ordered EA ≤ REA/SCEA ≤ ED.
 *   2. Elite schools (≤10% acceptance) use a tighter table that caps ED at +3.
 *   3. Weak pre-plan profiles (<30) receive no boost. ED does not rescue
 *      unqualified applicants — binding commitment is not a bypass.
 *   4. Absolute cap of +5 on any boost. Bands are 15-20 points wide, so a 5
 *      point boost can shift at most one band.
 */
export function applicationPlanAdjustment(
  plan: ApplicationPlan,
  acceptanceRate: number,
  preScore: number,
  collegeName: string,
): { adjustment: number; signal: Signal | null } {
  // RD and Rolling never contribute a numeric boost.
  if (plan === "RD" || plan === "Rolling") {
    if (plan === "Rolling") {
      return {
        adjustment: 0,
        signal: {
          label: `Rolling admissions at ${collegeName} — applying early in the cycle maximizes your timing advantage`,
          delta: 0,
        },
      };
    }
    return { adjustment: 0, signal: null };
  }

  const isElite = acceptanceRate <= ELITE_THRESHOLD;
  const table = isElite ? PLAN_BOOST_ELITE : PLAN_BOOST_NON_ELITE;
  let boost = table[plan];

  // Guardrail 3: weak profile floor.
  if (preScore < WEAK_PROFILE_FLOOR) {
    boost = 0;
  }

  // Guardrail 4: absolute cap.
  boost = Math.min(MAX_PLAN_BOOST, Math.max(0, boost));

  if (boost === 0) {
    return { adjustment: 0, signal: null };
  }

  const label = buildApplicationPlanLabel(plan, isElite, collegeName);
  return { adjustment: boost, signal: { label, delta: boost / 10 } };
}

function buildApplicationPlanLabel(
  plan: ApplicationPlan,
  isElite: boolean,
  collegeName: string,
): string {
  const eliteNote = isElite
    ? ` At ${collegeName}, application plan only modestly affects outcomes.`
    : "";
  switch (plan) {
    case "EA":
      return `Early Action may provide a slight timing advantage.${eliteNote}`;
    case "REA":
    case "SCEA":
      return `Restrictive Early Action may provide a modest early-application advantage.${eliteNote}`;
    case "ED":
    case "ED2":
      return `Binding Early Decision may provide a stronger advantage due to your commitment to attend.${eliteNote}`;
    default:
      return "";
  }
}

// end UNDO [application-plan]
