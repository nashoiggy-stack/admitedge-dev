// ── Strategy Engine (deterministic analyzers) ──────────────────────────────
//
// Pure TypeScript — no LLM calls. Takes a StrategyProfile and produces a
// structured StrategyAnalysis with scores, flags, and warnings. The narrative
// layer downstream (/api/strategy) builds consultant-voice prose on top of
// this, but every number the LLM references must come from here.

import type {
  StrategyProfile,
  StrategyAnalysis,
  AcademicStrength,
  AcademicTier,
  ECStrength,
  ECStrengthTier,
  SpikeAnalysis,
  WeaknessFlag,
  SchoolListDistribution,
  EarlyRecommendation,
  CompetitivenessPositioning,
  MajorAwareRecommendations,
} from "./strategy-types";
import type { ActivityEvaluation, ProfileSpike } from "./extracurricular-types";
import { computeReadinessScore, bandFromScore } from "./extracurricular-types";
import type { ApplicationPlan, ClassifiedCollege, Classification } from "./college-types";
import { getApplicationOptions, classifyCollege } from "./admissions";
import { COLLEGES } from "@/data/colleges";
import { getMajorMatch, MAJOR_MATCH_RANK } from "./major-match";

// ── Academic analysis ──────────────────────────────────────────────────────

/**
 * Combine GPA, test scores, and rigor into a 0-100 academic composite, plus
 * label each dimension relative to "top-school calibre."
 *
 * Calibration anchors (rough, used as signal strength, not absolute truth):
 *   - UW GPA 3.9+ = elite range, 3.75+ = strong, 3.5+ = solid
 *   - W  GPA 4.4+ = elite, 4.15+ = strong, 3.9+ = solid
 *   - SAT 1500+ = elite, 1420+ = strong, 1300+ = solid
 *   - ACT 34+   = elite, 32+   = strong, 29+   = solid
 *   - AP strong count (>=4): 8+ elite, 5+ strong, 3+ solid
 */
export function analyzeAcademicStrength(p: StrategyProfile): AcademicStrength {
  const signals: string[] = [];
  let score = 0;
  let metrics = 0;

  // GPA component (up to 40 points)
  let gpaFit: AcademicStrength["gpaFit"] = "unknown";
  const uw = p.gpa.uw;
  const w = p.gpa.w;
  if (uw != null) {
    metrics++;
    if (uw >= 3.9) { score += 38; gpaFit = "above"; signals.push(`UW GPA ${uw.toFixed(2)} is in the top-school range`); }
    else if (uw >= 3.75) { score += 30; gpaFit = "above"; signals.push(`UW GPA ${uw.toFixed(2)} is strong`); }
    else if (uw >= 3.5) { score += 22; gpaFit = "within"; signals.push(`UW GPA ${uw.toFixed(2)} is solid but not distinguishing`); }
    else if (uw >= 3.2) { score += 13; gpaFit = "below"; signals.push(`UW GPA ${uw.toFixed(2)} is below the top-school typical range`); }
    else { score += 5; gpaFit = "below"; signals.push(`UW GPA ${uw.toFixed(2)} is substantially below top-school averages`); }
  } else if (w != null) {
    metrics++;
    if (w >= 4.4) { score += 36; gpaFit = "above"; signals.push(`Weighted GPA ${w.toFixed(2)} reflects high rigor`); }
    else if (w >= 4.15) { score += 28; gpaFit = "above"; }
    else if (w >= 3.9) { score += 20; gpaFit = "within"; }
    else { score += 10; gpaFit = "below"; }
  }

  // Test component (up to 35 points)
  let testFit: AcademicStrength["testFit"] = "missing";
  if (p.tests.sat != null) {
    metrics++;
    const sat = p.tests.sat;
    if (sat >= 1500) { score += 33; testFit = "above"; signals.push(`SAT ${sat} is in the top-school range`); }
    else if (sat >= 1420) { score += 26; testFit = "above"; signals.push(`SAT ${sat} is strong`); }
    else if (sat >= 1300) { score += 18; testFit = "within"; signals.push(`SAT ${sat} is solid`); }
    else if (sat >= 1150) { score += 10; testFit = "below"; signals.push(`SAT ${sat} is below top-school averages`); }
    else { score += 4; testFit = "below"; signals.push(`SAT ${sat} is significantly below top-school averages`); }
  } else if (p.tests.act != null) {
    metrics++;
    const act = p.tests.act;
    if (act >= 34) { score += 32; testFit = "above"; signals.push(`ACT ${act} is in the top-school range`); }
    else if (act >= 32) { score += 25; testFit = "above"; signals.push(`ACT ${act} is strong`); }
    else if (act >= 29) { score += 17; testFit = "within"; }
    else if (act >= 25) { score += 9; testFit = "below"; }
    else { score += 3; testFit = "below"; }
  }

  // Rigor component (up to 25 points): combines profile.rigor flag with AP strength
  const rigorFit = p.gpa.rigor;
  let rigorPoints = 0;
  if (rigorFit === "high") rigorPoints = 15;
  else if (rigorFit === "medium") rigorPoints = 9;
  else rigorPoints = 4;
  if (p.tests.apStrongCount >= 8) { rigorPoints += 10; signals.push(`${p.tests.apStrongCount} strong AP scores (≥4) is a major distinction signal`); }
  else if (p.tests.apStrongCount >= 5) { rigorPoints += 7; signals.push(`${p.tests.apStrongCount} strong AP scores supports rigor`); }
  else if (p.tests.apStrongCount >= 3) { rigorPoints += 4; }
  else if (p.tests.apCount > 0) { signals.push(`${p.tests.apCount} AP exam${p.tests.apCount === 1 ? "" : "s"} taken but few ≥4 — room to improve`); }
  score += rigorPoints;
  if (metrics > 0) metrics++;

  // If we had nothing at all, score stays at 0 but we note missing data
  if (metrics === 0) {
    signals.push("No academic data — run the GPA Calculator and enter test scores on the Profile page");
  }

  // Normalize score to 0-100: max possible is roughly 40 (gpa) + 35 (test) + 25 (rigor) = 100
  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  let tier: AcademicTier;
  if (normalized >= 88) tier = "elite";
  else if (normalized >= 72) tier = "strong";
  else if (normalized >= 55) tier = "solid";
  else if (normalized >= 35) tier = "developing";
  else tier = "limited";

  return {
    tier,
    score: normalized,
    gpaFit,
    testFit,
    rigorFit,
    signals,
  };
}

// ── EC analysis ────────────────────────────────────────────────────────────

export function analyzeECStrength(p: StrategyProfile): ECStrength {
  if (!p.ec || !Array.isArray(p.ec.activities) || p.ec.activities.length === 0) {
    return {
      tier: "missing",
      score: 0,
      tier1Count: 0,
      tier2Count: 0,
      leadershipRate: 0,
      impactRate: 0,
      commitmentRate: 0,
      signals: ["No EC data — run the EC Evaluator to generate activity tiers and sub-scores"],
    };
  }

  const activities = p.ec.activities as readonly ActivityEvaluation[];
  const score = computeReadinessScore({
    activities,
    spikes: p.ec.spikes,
  });
  const band = bandFromScore(score);

  const tier1Count = activities.filter((a) => a.tier === 1).length;
  const tier2Count = activities.filter((a) => a.tier === 2).length;
  const leadershipRate = activities.filter((a) => a.scores.leadership >= 3).length / activities.length;
  const impactRate = activities.filter((a) => a.scores.impact >= 3).length / activities.length;
  const commitmentRate = activities.filter((a) => a.scores.commitment >= 3).length / activities.length;

  const signals: string[] = [];
  if (tier1Count > 0) signals.push(`${tier1Count} Tier-1 activit${tier1Count === 1 ? "y" : "ies"} — this is the kind of distinction top schools weigh most`);
  else if (tier2Count > 0) signals.push(`${tier2Count} Tier-2 activit${tier2Count === 1 ? "y" : "ies"} with no Tier-1 distinction yet`);
  else signals.push("No Tier-1 or Tier-2 activities — this is the clearest gap vs top-school admits");

  if (leadershipRate >= 0.5) signals.push(`Leadership visible across ${Math.round(leadershipRate * 100)}% of activities`);
  if (impactRate < 0.3) signals.push(`Measurable impact present in only ${Math.round(impactRate * 100)}% of activities — biggest improvement lever`);

  const tierMap: Record<string, ECStrengthTier> = {
    exceptional: "exceptional",
    strong: "strong",
    solid: "solid",
    developing: "developing",
    limited: "limited",
  };

  return {
    tier: tierMap[band] ?? "developing",
    score,
    tier1Count,
    tier2Count,
    leadershipRate,
    impactRate,
    commitmentRate,
    signals,
  };
}

// ── Spike detection ────────────────────────────────────────────────────────

export function detectSpike(p: StrategyProfile): SpikeAnalysis {
  if (!p.ec || !p.ec.spikes || p.ec.spikes.length === 0) {
    // No spike data at all
    if (!p.ec) {
      return {
        primary: null,
        strength: "none",
        clarity: "scattered",
        supportingActivities: [],
        signals: ["Run the EC Evaluator to surface your spike"],
      };
    }
    // EC exists but no spikes flagged — profile is scattered
    return {
      primary: null,
      strength: "none",
      clarity: "scattered",
      supportingActivities: [],
      signals: ["Your activities don't yet show a clear thematic spike — focus is more valuable than breadth"],
    };
  }

  // Pick the strongest spike as primary (dominant > strong > moderate)
  const rank = (s: ProfileSpike) =>
    s.strength === "dominant" ? 3 : s.strength === "strong" ? 2 : 1;
  const sorted = [...p.ec.spikes].sort((a, b) => rank(b) - rank(a));
  const primary = sorted[0];

  const strength: SpikeAnalysis["strength"] =
    primary.strength === "dominant"
      ? "dominant"
      : primary.strength === "strong"
        ? "strong"
        : "moderate";

  // Find supporting activities — ones whose category matches the spike or are Tier 1/2
  const activities = (p.ec?.activities ?? []) as readonly ActivityEvaluation[];
  const supporting = activities
    .filter(
      (a) =>
        a.tier <= 2 ||
        a.category.toLowerCase().includes(primary.category.toLowerCase()),
    )
    .slice(0, 3)
    .map((a) => a.activityName);

  let clarity: SpikeAnalysis["clarity"];
  if (strength === "dominant" && supporting.length >= 2) clarity = "focused";
  else if (strength === "moderate" || supporting.length < 2) clarity = "developing";
  else clarity = "focused";

  // If the user has 2+ different spikes in the list, that's scattered
  if (p.ec.spikes.length >= 3) clarity = "scattered";

  const signals: string[] = [];
  signals.push(
    `Primary spike: ${primary.category} (${strength})`,
  );
  if (supporting.length > 0) {
    signals.push(`Supported by ${supporting.join(", ")}`);
  }
  if (p.ec.spikes.length > 1) {
    const secondaries = p.ec.spikes.slice(1).map((s) => s.category).join(", ");
    signals.push(`Secondary themes: ${secondaries}`);
  }

  return {
    primary: primary.category,
    strength,
    clarity,
    supportingActivities: supporting,
    signals,
  };
}

// ── Weakness detection ─────────────────────────────────────────────────────

export function detectWeaknesses(
  p: StrategyProfile,
  academic: AcademicStrength,
  ec: ECStrength,
  spike: SpikeAnalysis,
): readonly WeaknessFlag[] {
  const flags: WeaknessFlag[] = [];

  // Academic flags
  if (academic.gpaFit === "below") {
    flags.push({
      code: "low-gpa",
      severity: academic.tier === "limited" ? "critical" : "high",
      label: "GPA below top-school range",
      detail: `UW GPA ${p.gpa.uw?.toFixed(2) ?? "—"} sits below the typical admitted range at highly selective schools`,
    });
  }
  if (academic.testFit === "below") {
    flags.push({
      code: "low-test",
      severity: "high",
      label: "Test scores below range",
      detail:
        p.tests.sat != null
          ? `SAT ${p.tests.sat} is below the 25th percentile at most top schools`
          : p.tests.act != null
            ? `ACT ${p.tests.act} is below range`
            : "Test scores are below typical admitted range",
    });
  }
  if (academic.testFit === "missing" && !p.hasEc) {
    flags.push({
      code: "missing-test",
      severity: "medium",
      label: "No test scores submitted",
      detail: "Submitting an SAT or ACT score would clarify academic positioning",
    });
  }
  if (p.tests.apStrongCount === 0 && p.tests.apCount === 0) {
    flags.push({
      code: "no-ap-data",
      severity: "low",
      label: "No AP scores reported",
      detail: "AP exam scores add academic context — strong scores (≥4) are a distinction signal",
    });
  }

  // EC flags
  if (ec.tier === "missing") {
    flags.push({
      code: "missing-ec-data",
      severity: "critical",
      label: "No extracurricular evaluation",
      detail: "Run the EC Evaluator to tier your activities — no EC analysis is possible without this",
    });
  } else {
    if (ec.tier1Count === 0 && ec.tier2Count === 0) {
      flags.push({
        code: "no-tier-1-or-2",
        severity: "high",
        label: "No Tier-1 or Tier-2 activities",
        detail: "Top schools expect at least one regional or national-level distinction",
      });
    } else if (ec.tier1Count === 0) {
      flags.push({
        code: "no-tier-1",
        severity: "medium",
        label: "No Tier-1 distinction",
        detail: "A Tier-1 win (national-level award, research publication, selective program) is the clearest signal for elite schools",
      });
    }
    if (ec.impactRate < 0.3) {
      flags.push({
        code: "low-impact",
        severity: "high",
        label: "Limited measurable impact",
        detail: `Only ${Math.round(ec.impactRate * 100)}% of your activities show measurable impact — add numbers (people served, money raised, growth metrics) to your strongest activities`,
      });
    }
    if (ec.leadershipRate < 0.3) {
      flags.push({
        code: "low-leadership",
        severity: "medium",
        label: "Limited leadership footprint",
        detail: "Few activities show you in a leadership role — even founding a small initiative counts",
      });
    }
  }

  // Spike flags
  if (spike.clarity === "scattered" && p.hasEc) {
    flags.push({
      code: "scattered-spike",
      severity: "high",
      label: "Scattered profile",
      detail: "Your activities span several themes without a clear through-line — top schools value focused depth over breadth",
    });
  }
  if (spike.strength === "emerging" || (spike.strength === "none" && p.hasEc)) {
    flags.push({
      code: "weak-spike",
      severity: "medium",
      label: "No clear spike",
      detail: "A recognizable spike (a topic, field, or craft you go deep on) would meaningfully strengthen your story",
    });
  }

  // Essay flags
  if (!p.hasEssay) {
    flags.push({
      code: "missing-essay",
      severity: "medium",
      label: "No essay grade yet",
      detail: "Run the Essay Grader on your current Common App draft to integrate essay strength into the analysis",
    });
  } else if (p.essay?.summaryScore != null && p.essay.summaryScore < 65) {
    flags.push({
      code: "weak-essay",
      severity: "high",
      label: "Essay below competitive range",
      detail: `Your Common App essay scored ${p.essay.summaryScore}/100 — essays drive a meaningful share of admissions decisions`,
    });
  }

  return flags;
}

// ── School list distribution ───────────────────────────────────────────────

export function analyzeSchoolListDistribution(
  p: StrategyProfile,
): SchoolListDistribution {
  const items = p.pinnedSchools;
  const counts = { safety: 0, likely: 0, target: 0, reach: 0, unlikely: 0 };
  let acceptSum = 0;
  let fitSum = 0;

  for (const s of items) {
    counts[s.classified.classification]++;
    acceptSum += s.classified.college.acceptanceRate;
    fitSum += s.classified.fitScore;
  }

  const total = items.length;
  const warnings: string[] = [];
  let balance: SchoolListDistribution["balance"] = "balanced";

  if (total === 0) {
    balance = "empty";
    warnings.push("No schools pinned — visit the College List Builder to pin schools you're considering");
  } else if (total < 6) {
    balance = "thin";
    warnings.push(`Only ${total} school${total === 1 ? "" : "s"} pinned — a competitive college list usually has 8–12`);
  } else {
    const reachHeavy = counts.reach + counts.unlikely;
    const safetyCount = counts.safety + counts.likely;
    if (reachHeavy / total > 0.6) {
      balance = "reach-heavy";
      warnings.push(`${reachHeavy} of ${total} schools are reach/unlikely — add 2–3 target or likely schools for balance`);
    } else if (safetyCount / total > 0.6) {
      balance = "safety-heavy";
      warnings.push(`Your list is safety-heavy (${safetyCount} of ${total}) — you may be under-ambitious given your profile`);
    }
    if (counts.safety === 0) {
      warnings.push("No true safety schools on the list — add at least one you're confident you'll be admitted to");
    }
    if (counts.target === 0 && counts.likely === 0) {
      warnings.push("No target or likely schools — an all-reach list is high-variance");
    }
  }

  return {
    total,
    counts,
    averageAcceptanceRate: total > 0 ? Math.round(acceptSum / total) : 0,
    averageFitScore: total > 0 ? Math.round(fitSum / total) : 0,
    warnings,
    balance,
  };
}

// ── Early application strategy ─────────────────────────────────────────────

/**
 * For each pinned school, recommend the best application plan given:
 *   - the school's available options
 *   - the student's overall strength
 *   - the school's selectivity
 *
 * Conservative: ED is recommended for the student's single strongest-fit
 * reach where ED is available. EA is recommended for target-or-better schools
 * where it's offered. REA/SCEA only if the school offers no other early and
 * the fit is at least "target."
 */
export function analyzeEarlyStrategy(
  p: StrategyProfile,
): readonly EarlyRecommendation[] {
  if (p.pinnedSchools.length === 0) return [];

  // Sort pinned schools by fit score descending so the best fit gets ED priority
  const sorted = [...p.pinnedSchools].sort(
    (a, b) => b.classified.fitScore - a.classified.fitScore,
  );

  // Find the single best ED candidate: highest fit school that is a reach
  // (so the boost matters) and that offers ED/ED2, and where the student is
  // at least "target" tier (not unlikely) — ED doesn't rescue unqualified
  // applicants.
  let edCandidate: typeof sorted[number] | null = null;
  for (const s of sorted) {
    const options = getApplicationOptions(s.classified.college);
    const hasEd = options.some((o) => o.type === "ED" || o.type === "ED2");
    if (!hasEd) continue;
    if (s.classified.classification === "unlikely") continue;
    if (s.classified.classification === "reach" || s.classified.classification === "target") {
      edCandidate = s;
      break;
    }
  }

  const recommendations: EarlyRecommendation[] = [];

  for (const s of sorted) {
    const options = getApplicationOptions(s.classified.college);
    const types = options.map((o) => o.type);
    const isEdCandidate = edCandidate?.pin.name === s.pin.name;
    const hasEA = types.includes("EA");
    const hasREA = types.includes("REA") || types.includes("SCEA");
    const hasED = types.includes("ED") || types.includes("ED2");

    let suggestedPlan: ApplicationPlan;
    let reasoning: string;
    let confidence: EarlyRecommendation["confidence"] = "medium";

    if (isEdCandidate) {
      suggestedPlan = types.includes("ED") ? "ED" : "ED2";
      reasoning = `${s.classified.college.name} is your best-fit reach that offers ED. Binding commitment gives the strongest available boost and you can only use it once — this is where it should go.`;
      confidence = "high";
    } else if (hasREA && s.classified.classification !== "unlikely") {
      suggestedPlan = types.includes("REA") ? "REA" : "SCEA";
      reasoning = `Restrictive early gives a modest boost at ${s.classified.college.name} without binding you. Worth using unless you're applying ED elsewhere.`;
      confidence = "medium";
    } else if (hasEA) {
      suggestedPlan = "EA";
      reasoning = `Non-restrictive EA at ${s.classified.college.name} — small timing advantage, no downside, stack it with other EAs.`;
      confidence = "high";
    } else if (hasED && !isEdCandidate) {
      suggestedPlan = "RD";
      reasoning = `${s.classified.college.name} offers ED but this isn't your best-fit reach — RD keeps the option to use ED elsewhere.`;
      confidence = "medium";
    } else {
      suggestedPlan = "RD";
      reasoning = `${s.classified.college.name} offers only RD (or rolling). Apply in the first window of the cycle.`;
      confidence = "high";
    }

    recommendations.push({
      collegeName: s.classified.college.name,
      suggestedPlan,
      alternatives: types.filter((t) => t !== suggestedPlan),
      reasoning,
      confidence,
    });
  }

  return recommendations;
}

// ── Competitiveness positioning ────────────────────────────────────────────

export function positioningVsTopSchools(
  p: StrategyProfile,
  academic: AcademicStrength,
  ec: ECStrength,
): CompetitivenessPositioning {
  const gaps: string[] = [];
  let versus: CompetitivenessPositioning["versusPinnedAverage"] = "at";

  // Compute average acceptance rate of pinned list and compare to student's
  // overall tier. Elite tier + high-reach list = "at" average. Strong tier +
  // high-reach list = "below" average.
  if (p.pinnedSchools.length > 0) {
    const avgAR =
      p.pinnedSchools.reduce(
        (sum, s) => sum + s.classified.college.acceptanceRate,
        0,
      ) / p.pinnedSchools.length;

    if (academic.tier === "elite") {
      versus = avgAR < 15 ? "at" : "above";
    } else if (academic.tier === "strong") {
      versus = avgAR < 15 ? "below" : avgAR < 30 ? "at" : "above";
    } else if (academic.tier === "solid") {
      versus = avgAR < 20 ? "below" : avgAR < 45 ? "at" : "above";
    } else {
      versus = "below";
    }
  }

  // Percentile estimate — rough, based on combined academic + EC strength
  const combined = (academic.score + ec.score) / 2;
  let percentileEstimate: CompetitivenessPositioning["percentileEstimate"];
  if (combined >= 85) percentileEstimate = "top-10";
  else if (combined >= 70) percentileEstimate = "top-25";
  else if (combined >= 50) percentileEstimate = "top-50";
  else percentileEstimate = "bottom-50";

  // Gap descriptions
  if (academic.tier !== "elite") {
    gaps.push("Academic profile is below the elite band — stronger GPA, test, or AP outcomes would narrow this");
  }
  if (ec.tier === "missing") {
    gaps.push("No EC data to analyze — this is the single biggest blind spot");
  } else if (ec.tier1Count === 0) {
    gaps.push("No Tier-1 distinction — a national-level win, research publication, or selective program admission would close this");
  }
  if (ec.impactRate < 0.4) {
    gaps.push("Measurable impact is thin — adding numbers to existing activities is the fastest lever");
  }

  return {
    overallTier: academic.tier,
    versusPinnedAverage: versus,
    percentileEstimate,
    gaps,
  };
}

// ── Major-aware recommendations ─────────────────────────────────────────────

function classifyAll(p: StrategyProfile): ClassifiedCollege[] {
  const essayCA = p.essay?.summaryScore ?? null;
  const essayV = p.essay?.vspice ?? null;
  const query = { major: p.intendedMajor, interest: p.intendedInterest };

  return COLLEGES.map((c) => {
    const { classification, reason, fitScore } = classifyCollege(
      c, p.gpa.uw, p.gpa.w, p.tests.sat, p.tests.act, essayCA, essayV,
    );
    const majorMatch = getMajorMatch(c, query);
    return { college: c, classification, reason, fitScore, majorMatch };
  });
}

// Rank colleges by (major match rank DESC, fit score DESC). Strong matches
// always beat decent matches; within a tier, higher fit score wins.
function rankByMajorThenFit(a: ClassifiedCollege, b: ClassifiedCollege): number {
  const ra = MAJOR_MATCH_RANK[a.majorMatch ?? "none"];
  const rb = MAJOR_MATCH_RANK[b.majorMatch ?? "none"];
  if (ra !== rb) return rb - ra;
  return b.fitScore - a.fitScore;
}

function bucketByTier(
  cs: readonly ClassifiedCollege[],
): Record<Classification, ClassifiedCollege[]> {
  const out: Record<Classification, ClassifiedCollege[]> = {
    safety: [], likely: [], target: [], reach: [], unlikely: [],
  };
  for (const c of cs) out[c.classification].push(c);
  return out;
}

/**
 * Build major-aware recommendations: 2 safeties + 2 targets + 2 reaches
 * from the user's pinned list (ranked by major fit), plus up to 3 colleges
 * the user hasn't pinned that are worth considering.
 *
 * Called from runStrategyAnalysis. Returns an empty-shell result when the
 * user hasn't picked a major AND hasn't typed an interest — the UI shows
 * an inline picker in that case.
 */
export function recommendCollegesByMajor(p: StrategyProfile): MajorAwareRecommendations {
  const hasQuery = !!p.intendedMajor || !!p.intendedInterest;
  const empty: MajorAwareRecommendations = {
    intendedMajor: p.intendedMajor || null,
    intendedInterest: p.intendedInterest || null,
    fromPinned: { safeties: [], targets: [], reaches: [] },
    toConsider: [],
  };
  if (!hasQuery) return empty;

  const all = classifyAll(p);
  const pinnedNames = new Set(p.pinnedSchools.map((s) => s.pin.name));

  // Pinned side — bucket by classification, sort each bucket by major-then-fit,
  // take top 2. Only pinned colleges are considered here.
  const pinned = all.filter((c) => pinnedNames.has(c.college.name));
  const pinnedBuckets = bucketByTier(pinned);
  const safeties = [...pinnedBuckets.safety].sort(rankByMajorThenFit).slice(0, 2);
  const targets  = [...pinnedBuckets.target ].sort(rankByMajorThenFit).slice(0, 2);
  const reaches  = [...pinnedBuckets.reach  ].sort(rankByMajorThenFit).slice(0, 2);

  // To-consider side — everything NOT pinned with at-least-decent major fit.
  // Take top picks across tiers, preferring variety: try one safety + one
  // target + one reach first, then fill remaining slots by overall rank.
  const unpinned = all.filter(
    (c) => !pinnedNames.has(c.college.name) && (c.majorMatch === "strong" || c.majorMatch === "decent"),
  );
  const unpinnedBuckets = bucketByTier(unpinned);
  const pick = (cs: ClassifiedCollege[]): ClassifiedCollege | undefined =>
    [...cs].sort(rankByMajorThenFit)[0];

  const spread: ClassifiedCollege[] = [];
  const firstSafety = pick(unpinnedBuckets.safety) ?? pick(unpinnedBuckets.likely);
  const firstTarget = pick(unpinnedBuckets.target);
  const firstReach = pick(unpinnedBuckets.reach);
  for (const c of [firstSafety, firstTarget, firstReach]) {
    if (c) spread.push(c);
  }

  // If the spread didn't yield 3 (e.g. no safety matches), fill by overall
  // rank from whatever's left.
  if (spread.length < 3) {
    const seen = new Set(spread.map((c) => c.college.name));
    const remainder = [...unpinned]
      .filter((c) => !seen.has(c.college.name))
      .sort(rankByMajorThenFit);
    for (const c of remainder) {
      if (spread.length >= 3) break;
      spread.push(c);
    }
  }

  return {
    intendedMajor: p.intendedMajor || null,
    intendedInterest: p.intendedInterest || null,
    fromPinned: { safeties, targets, reaches },
    toConsider: spread.slice(0, 3),
  };
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export function runStrategyAnalysis(p: StrategyProfile): StrategyAnalysis {
  const academic = analyzeAcademicStrength(p);
  const ec = analyzeECStrength(p);
  const spike = detectSpike(p);
  const weaknesses = detectWeaknesses(p, academic, ec, spike);
  const schoolList = analyzeSchoolListDistribution(p);
  const earlyStrategy = analyzeEarlyStrategy(p);
  const positioning = positioningVsTopSchools(p, academic, ec);
  const majorRecommendations = recommendCollegesByMajor(p);

  const missingData: string[] = [];
  if (!p.hasGpa) missingData.push("GPA (run the GPA Calculator)");
  if (!p.hasTests) missingData.push("SAT or ACT scores (enter on the Profile page)");
  if (!p.hasEc) missingData.push("EC evaluation (run the EC Evaluator)");
  if (!p.hasEssay) missingData.push("Essay grade (run the Essay Grader on your current draft)");
  if (!p.hasPinnedSchools) missingData.push("Pinned colleges (pin schools you're considering in the College List Builder)");

  return {
    academic,
    ec,
    spike,
    weaknesses,
    schoolList,
    earlyStrategy,
    positioning,
    majorRecommendations,
    missingData,
  };
}
