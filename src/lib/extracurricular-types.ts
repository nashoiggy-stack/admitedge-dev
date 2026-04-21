// ── Activity Conversation ────────────────────────────────────────────────────

export interface ECMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

// Resume section a conversation maps to. "auto" lets the classifier decide.
export type ResumeCategory =
  | "auto"
  | "activities"
  | "communityService"
  | "athletics"
  | "summerExperience"
  | "awards";

export const RESUME_CATEGORY_LABELS: Record<ResumeCategory, string> = {
  auto: "Auto-detect",
  activities: "Activities",
  communityService: "Community Service",
  athletics: "Athletics",
  summerExperience: "Summer Experience",
  awards: "Awards & Honors",
};

export interface ECConversation {
  readonly id: string;
  readonly messages: ECMessage[];
  readonly done: boolean;
  readonly title: string; // derived from first user message
  readonly disabled?: boolean; // excluded from evaluation but not deleted
  readonly resumeCategory?: ResumeCategory; // manual override for resume import
}

// ── Evaluation Results ──────────────────────────────────────────────────────

export type ActivityTier = 1 | 2 | 3 | 4;

export interface ActivityScores {
  readonly leadership: number;  // 0-4
  readonly impact: number;      // 0-4
  readonly commitment: number;  // 0-4
  readonly alignment: number;   // 0-2
}

export interface ActivityEvaluation {
  readonly activityName: string;
  readonly category: string;
  readonly tier: ActivityTier;
  readonly tierExplanation: string;
  readonly scores: ActivityScores;
  readonly highlights: string[];
  readonly improvements: string[];
}

export type ECBand = "limited" | "developing" | "solid" | "strong" | "exceptional";

export const EC_BAND_LABELS: Record<ECBand, string> = {
  limited: "Limited",
  developing: "Developing",
  solid: "Solid",
  strong: "Strong",
  exceptional: "Exceptional",
};

export interface ProfileSpike {
  readonly category: string;
  readonly strength: "moderate" | "strong" | "dominant";
}

export interface ProfileEvaluation {
  readonly activities: ActivityEvaluation[];
  readonly band: ECBand;
  readonly bandExplanation: string;
  readonly spikes: ProfileSpike[];
  readonly isWellRounded: boolean;
  readonly consistencyNote: string;
  readonly strengths: string[];
  readonly gaps: string[];
  readonly recommendations: string[];
}

// ── localStorage key ────────────────────────────────────────────────────────

export const EC_STORAGE_KEY = "ec-evaluator-result";
export const EC_ACTIVITIES_KEY = "ec-evaluator-activities";

// ── Readiness Score ─────────────────────────────────────────────────────────

// Contiguous band ranges — the label is DERIVED from the continuous score,
// not the other way around. Ranges are [min, max] inclusive on min, with the
// next band starting at the previous band's max. Used only for:
//   1. bandFromScore() — deriving the qualitative label from a numeric score
//   2. rendering the segmented progress bar
//   3. generating the next-step narrative
// The scoring function never clamps to these ranges.
export const BAND_RANGES: Record<ECBand, { min: number; max: number }> = {
  limited: { min: 0, max: 45 },
  developing: { min: 45, max: 65 },
  solid: { min: 65, max: 80 },
  strong: { min: 80, max: 90 },
  exceptional: { min: 90, max: 100 },
};

export const BAND_ORDER: readonly ECBand[] = [
  "limited",
  "developing",
  "solid",
  "strong",
  "exceptional",
] as const;

/**
 * Derive the qualitative band label from a continuous score.
 * Score → label is one-directional: the score is the source of truth.
 */
export function bandFromScore(score: number): ECBand {
  if (score >= 90) return "exceptional";
  if (score >= 80) return "strong";
  if (score >= 65) return "solid";
  if (score >= 45) return "developing";
  return "limited";
}

/**
 * Derive the band that should be displayed for an evaluation result.
 * The UI shows bandFromScore(computeReadinessScore(...)), so readers
 * (profile, chances, colleges) must use this to stay in sync with what
 * the EC evaluator actually displayed.
 */
export function bandFromEvaluation(r: {
  readonly activities: readonly ActivityEvaluation[];
  readonly spikes: readonly ProfileSpike[];
}): ECBand {
  const score = computeReadinessScore({
    activities: r.activities,
    spikes: r.spikes,
  });
  return bandFromScore(score);
}

interface ReadinessInput {
  readonly activities: readonly ActivityEvaluation[];
  readonly spikes: readonly ProfileSpike[];
}

/**
 * Continuous 0-100 strength for a single activity.
 *
 * Tier sets the floor + ceiling. Sub-scores fill the gap inside the tier,
 * producing a smooth curve rather than a bucket.
 *
 * Tier 1 max = 100, Tier 2 max = 70, Tier 3 max = 44, Tier 4 max = 22.
 * This reflects reality: a perfectly-executed club-president role (Tier 3)
 * should never look as strong as a weakly-held Intel ISEF finalist (Tier 1).
 */
function activityStrength(a: ActivityEvaluation): number {
  const TIER_BASE: Record<ActivityTier, number> = { 1: 65, 2: 42, 3: 22, 4: 8 };
  const TIER_CEIL: Record<ActivityTier, number> = { 1: 35, 2: 28, 3: 22, 4: 14 };

  const base = TIER_BASE[a.tier] ?? 8;
  const ceil = TIER_CEIL[a.tier] ?? 14;

  const { leadership, impact, commitment, alignment } = a.scores;
  // Weighted sub-score composite in [0, 1]. Impact weighted heaviest because
  // "what did you actually change" is the single strongest admissions signal.
  const norm =
    (leadership / 4) * 0.3 +
    (impact / 4) * 0.4 +
    (commitment / 4) * 0.2 +
    (alignment / 2) * 0.1;

  return base + norm * ceil;
}

/**
 * Compute a continuous 0-100 readiness score from an EC evaluation.
 *
 * Model:
 *   1. Each activity gets a continuous 0-100 strength (see activityStrength)
 *   2. Top-k weighted average — strongest activity weighted highest, tail
 *      activities contribute diminishing amounts (depth beats breadth)
 *   3. Portfolio-level modifiers add decimal deltas for density signals
 *      (leadership, measurable impact, commitment, spike depth, distinction)
 *   4. Final value is rounded ONCE at the very end
 *
 * The score is NOT clamped to any band range. The qualitative band is a
 * downstream derivation via bandFromScore().
 */
export function computeReadinessScore(input: ReadinessInput): number {
  const activities = input.activities;
  if (activities.length === 0) return 0;

  // 1. Per-activity continuous strength, sorted descending
  const strengths = activities.map(activityStrength).sort((a, b) => b - a);

  // 2. Top-k weighted aggregation. Weights are heavily front-loaded so the
  //    strongest activity remains the dominant signal — a single Tier-1 win
  //    should not be diluted by a long tail of Tier-3/Tier-4 supports.
  //    Tail contributions still matter, but only at the margins.
  const WEIGHTS = [1.0, 0.35, 0.22, 0.15, 0.1, 0.07, 0.05, 0.04];
  const TAIL_WEIGHT = 0.03;

  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < strengths.length; i++) {
    const w = WEIGHTS[i] ?? TAIL_WEIGHT;
    weightedSum += strengths[i] * w;
    weightSum += w;
  }
  let score = weightSum > 0 ? weightedSum / weightSum : 0;

  // 3. Portfolio-level modifiers — decimal deltas, never snap to buckets.

  // Leadership density — what fraction of activities show real leadership?
  const leadDensity =
    activities.filter((a) => a.scores.leadership >= 3).length / activities.length;
  score += leadDensity * 3.0;

  // Measurable-impact density — weighted most heavily because impact is
  // the strongest discriminator in admissions.
  const impactDensity =
    activities.filter((a) => a.scores.impact >= 3).length / activities.length;
  score += impactDensity * 3.5;

  // Commitment density — sustained engagement across the portfolio.
  const commitDensity =
    activities.filter((a) => a.scores.commitment >= 3).length / activities.length;
  score += commitDensity * 2.0;

  // Spike depth bonus — the LLM already flagged the spikes, trust it as a
  // small portfolio modifier rather than a dominant factor.
  for (const spike of input.spikes) {
    if (spike.strength === "dominant") score += 3.2;
    else if (spike.strength === "strong") score += 2.1;
    else score += 1.1;
  }

  // Distinction bonus — capped so a single perfect Tier 1 doesn't get
  // repeatedly rewarded for existing.
  const distinctionCount = activities.filter((a) => a.tier <= 2).length;
  score += Math.min(distinctionCount, 3) * 1.2;

  // Thin-portfolio penalty — 1-2 activities with a weak strongest signal
  // should feel clearly below "solid".
  if (activities.length <= 2 && strengths[0] < 40) {
    score -= 3.0;
  }

  // Breadth reward — a portfolio of 6+ activities with a credible lead
  // shows sustained engagement beyond the top hits.
  if (activities.length >= 6 && strengths[0] >= 40) {
    score += 1.5;
  }

  // Final clamp + single round. Decimal math above is preserved until here
  // so small modifier deltas aren't lost to early rounding.
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate a next-step narrative sentence based on current score.
 * Band is derived internally so callers don't need to pass it.
 */
export function buildReadinessNextStep(score: number): string {
  const band = bandFromScore(score);
  const currentIdx = BAND_ORDER.indexOf(band);
  const nextBand = BAND_ORDER[currentIdx + 1];
  const range = BAND_RANGES[band];
  const nextRange = nextBand ? BAND_RANGES[nextBand] : null;
  const pointsToNext = nextRange ? nextRange.min - score : 0;
  const bandSpan = range.max - range.min;
  const bandProgress = bandSpan > 0 ? (score - range.min) / bandSpan : 1;

  if (!nextBand) {
    return "You're in the top band — focus on essays and school fit now.";
  }

  if (pointsToNext <= 2) {
    return `You're right on the edge of ${EC_BAND_LABELS[nextBand]}. One more strong activity pushes you across.`;
  }

  if (bandProgress > 0.7) {
    return `You're near the top of ${EC_BAND_LABELS[band]}. A Tier ${
      band === "strong" ? "1" : "2"
    } win or stronger leadership role moves you to ${EC_BAND_LABELS[nextBand]}.`;
  }

  if (bandProgress < 0.3) {
    return `You're at the start of ${EC_BAND_LABELS[band]}. Deepen your best activity with measurable impact to move up.`;
  }

  return `You're mid-${EC_BAND_LABELS[band]}. Build on your strongest activity — leadership role, measurable impact, or a regional-level achievement.`;
}
