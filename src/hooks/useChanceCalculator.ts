"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { COLLEGES } from "@/data/colleges";
import type { ChanceInputs, ChanceResult, ChanceBand } from "@/lib/college-types";
import { EMPTY_CHANCE_INPUTS } from "@/lib/college-types";
import {
  compareGPA, compareTests, selectivityPenalty, majorAdjustment,
  scoreToBand, BAND_LABELS, essayScoreAdjustment,
  // UNDO [application-plan]: remove these two imports
  applicationPlanAdjustment, defaultApplicationPlan,
} from "@/lib/admissions";
import { computeApAcademicSupport } from "@/lib/ap-scores";
import { bandFromEvaluation } from "@/lib/extracurricular-types";

export function useChanceCalculator() {
  const [inputs, setInputs] = useState<ChanceInputs>(EMPTY_CHANCE_INPUTS);

  // ── Auto-fill from profile + source keys (direct read) ─────────────────
  // Reads admitedge-profile first, then overlays fresh values directly from
  // source keys (essay-grader-result, ec-evaluator-result, gpa-calc-v1).
  // This works even when useProfile isn't mounted (e.g. user is on /chances).
  const fillFromSources = useCallback(() => {
    try {
      const raw = localStorage.getItem("admitedge-profile");
      const p = raw ? JSON.parse(raw) : {};

      // Direct reads from source tools (fresher than profile)
      let essayCA = p.essayCommonApp || "";
      let essayV = p.essayVspice || "";
      try {
        const er = localStorage.getItem("essay-grader-result");
        if (er) {
          const e = JSON.parse(er);
          if (e?.rawScore != null) essayCA = String(e.rawScore);
          if (e?.vspiceComposite != null) essayV = String(e.vspiceComposite);
        }
      } catch { /* ignore */ }

      let ecBand = p.ecBand || "";
      try {
        const ecr = localStorage.getItem("ec-evaluator-result");
        if (ecr) {
          const e = JSON.parse(ecr);
          // Derive from readiness score to match what the EC evaluator UI shows
          if (Array.isArray(e?.activities) && e.activities.length > 0) {
            ecBand = bandFromEvaluation({
              activities: e.activities,
              spikes: Array.isArray(e.spikes) ? e.spikes : [],
            });
          } else if (e?.band) {
            ecBand = e.band;
          }
        }
      } catch { /* ignore */ }

      let gpaUW = p.gpaUW || "";
      let gpaW = p.gpaW || "";
      let rigor: "low" | "medium" | "high" = p.rigor || "medium";
      try {
        const gr = localStorage.getItem("gpa-calc-v1");
        if (gr) {
          const state = JSON.parse(gr);
          if (state?.years?.length) {
            const COL_UW: Record<string, number> = {
              "A+":4,"A":4,"A−":3.7,"B+":3.3,"B":3,"B−":2.7,"C+":2.3,"C":2,"C−":1.7,"D+":1,"D":1,"F":0,
            };
            const COL_BONUS: Record<string, number> = { CP:0, Honors:0.5, DE:1, HDE:1, AP:1 };
            let uw = 0, w = 0, tc = 0;
            for (const year of state.years) {
              for (const row of year.rows) {
                if (!row.grade || row.nonCore) continue;
                const cr = parseFloat(row.credits) || 1;
                const base = COL_UW[row.grade] ?? 0;
                uw += base * cr;
                w += (row.grade === "F" ? 0 : base + (COL_BONUS[row.level] ?? 0)) * cr;
                tc += cr;
              }
            }
            if (tc > 0) {
              const cw = w / tc;
              gpaUW = (uw / tc).toFixed(2);
              gpaW = cw.toFixed(2);
              rigor = cw >= 4.4 ? "high" : cw >= 4.0 ? "medium" : "low";
            }
          }
        }
      } catch { /* ignore */ }

      setInputs((prev) => ({
        ...prev,
        gpaUW: gpaUW || prev.gpaUW || "",
        gpaW: gpaW || prev.gpaW || "",
        rigor: rigor || prev.rigor,
        essayCommonApp: essayCA || prev.essayCommonApp || "",
        essayVspice: essayV || prev.essayVspice || "",
        ecBand: ecBand || prev.ecBand || "",
        sat: (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : prev.sat) || "",
        act: (p.act?.english && p.act?.math && p.act?.reading
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading)) / 3))
          : prev.act) || "",
        actScience: p.act?.science || prev.actScience || "",
        apScores: prev.apScores.length > 0 ? prev.apScores : (p.apScores ?? []),
      }));
    } catch (e) {
      console.warn("Could not read sources:", e);
    }
  }, []);

  // Initial load + re-fill when any source updates
  useEffect(() => {
    fillFromSources();

    const onUpdated = () => fillFromSources();
    window.addEventListener("profile-source-updated", onUpdated);
    window.addEventListener("cloud-sync-loaded", onUpdated);
    return () => {
      window.removeEventListener("profile-source-updated", onUpdated);
      window.removeEventListener("cloud-sync-loaded", onUpdated);
    };
  }, [fillFromSources]);

  const updateInput = <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const resetInputs = () => setInputs(EMPTY_CHANCE_INPUTS);

  const college = inputs.collegeIndex !== null ? COLLEGES[inputs.collegeIndex] : null;

  // UNDO [application-plan]: delete this effect. Without it, stale plans
  // simply never rematch the new college's options and the helper falls back
  // to RD, which is still safe — but the UX of the plan selector would be
  // confusing.
  useEffect(() => {
    if (!college) return;
    const validPlans = (college.applicationOptions ?? [{ type: "RD" as const }]).map(
      (o) => o.type,
    );
    if (!validPlans.includes(inputs.applicationPlan)) {
      setInputs((prev) => ({ ...prev, applicationPlan: defaultApplicationPlan(college) }));
    }
  }, [college, inputs.applicationPlan]);

  const result = useMemo((): ChanceResult | null => {
    if (!college) return null;

    const gpaUW = inputs.gpaUW ? parseFloat(inputs.gpaUW) : null;
    const gpaW = inputs.gpaW ? parseFloat(inputs.gpaW) : null;
    const sat = inputs.sat ? parseInt(inputs.sat) : null;
    const act = inputs.act ? parseInt(inputs.act) : null;

    let score = 50;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // ── Academic fit ──
    const gpaResult = compareGPA(gpaUW, gpaW, college.avgGPAUW, college.avgGPAW);
    for (const s of gpaResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }
    score += gpaResult.delta * 10;

    const testResult = compareTests(sat, act, college);
    for (const s of testResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }
    score += testResult.delta * 10;

    // Test-required penalty if no scores
    if (sat === null && act === null && college.testPolicy === "required") {
      score -= 5;
      weaknesses.push("This school requires test scores — submitting a score would strengthen your application");
    }

    // ── Selectivity ──
    const selResult = selectivityPenalty(college.acceptanceRate);
    score += selResult.adjustment;
    if (selResult.signal) {
      (selResult.adjustment < 0 ? weaknesses : strengths).push(selResult.signal.label);
    }

    // ── Major ──
    const majResult = majorAdjustment(inputs.major, college.competitiveMajors);
    score += majResult.adjustment;
    if (majResult.signal) weaknesses.push(majResult.signal.label);

    // ── ACT Science (small optional boost, no penalty) ──
    const actScience = inputs.actScience ? parseInt(inputs.actScience) : null;
    if (actScience !== null && college.testPolicy !== "blind") {
      // Only a boost if within or above range — no penalty for low/missing
      const actMid = (college.act25 + college.act75) / 2;
      if (actScience >= actMid) {
        const boost = actScience >= college.act75 ? 2 : 1;
        score += boost;
        strengths.push(`ACT Science (${actScience}) is ${actScience >= college.act75 ? "above" : "within"} range — modest boost`);
      }
    }

    // ── AP Scores (supporting academic evidence, max +6) ──
    if (inputs.apScores.length > 0) {
      const hasTests = sat !== null || act !== null;
      const apResult = computeApAcademicSupport(inputs.apScores, inputs.major, hasTests);
      score += apResult.adjustment;
      for (const s of apResult.signals) {
        (s.delta >= 0 ? strengths : weaknesses).push(s.label);
      }
    }

    // ── Holistic boosts (small) ──
    if (inputs.rigor === "high") { score += 5; strengths.push("Strong course rigor signals academic readiness"); }
    else if (inputs.rigor === "low") { score -= 5; weaknesses.push("Consider taking more challenging courses"); }

    // ── EC band (5-level scale from EC Evaluator) ──
    // Gradient: exceptional = best boost, limited = penalty. Unset = neutral.
    const EC_BAND_ADJUSTMENT: Record<string, { delta: number; label: string }> = {
      exceptional: { delta: 10, label: "Exceptional extracurriculars are a major strength" },
      strong: { delta: 6, label: "Strong extracurriculars strengthen your application" },
      solid: { delta: 2, label: "Solid extracurricular profile meets expectations" },
      developing: { delta: -3, label: "Developing extracurriculars — deeper involvement would help" },
      limited: { delta: -6, label: "Limited extracurriculars — consider building a meaningful commitment" },
    };
    if (inputs.ecBand && EC_BAND_ADJUSTMENT[inputs.ecBand]) {
      const ec = EC_BAND_ADJUSTMENT[inputs.ecBand];
      score += ec.delta;
      (ec.delta >= 0 ? strengths : weaknesses).push(ec.label);
    }

    // ── Essay scores (real numbers from grader) ──
    const essayCA = inputs.essayCommonApp ? parseFloat(inputs.essayCommonApp) : null;
    const essayV = inputs.essayVspice ? parseFloat(inputs.essayVspice) : null;
    const essayResult = essayScoreAdjustment(essayCA, essayV);
    score += essayResult.adjustment;
    for (const s of essayResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }

    // UNDO [application-plan]: remove this block. The plan adjustment is
    // deliberately the LAST signal applied so the pre-plan score can gate it
    // (weak-profile floor in the helper). Order matters here.
    const preScore = score;
    const planResult = applicationPlanAdjustment(
      inputs.applicationPlan,
      college.acceptanceRate,
      preScore,
      college.name,
    );
    score += planResult.adjustment;
    // Plan boosts are never negative by construction (see admissions.ts).
    // A zero-delta signal (Rolling, or elite-capped weak profile) is still
    // informational, so always push to strengths for display.
    if (planResult.signal) {
      strengths.push(planResult.signal.label);
    }
    // end UNDO [application-plan]

    score = Math.max(5, Math.min(95, Math.round(score)));

    // ── Confidence based on how many metrics were provided ──
    const totalMetrics = gpaResult.metrics + testResult.metrics;
    const confidence: "low" | "medium" | "high" =
      totalMetrics >= 3 ? "high" : totalMetrics >= 1 ? "medium" : "low";

    const band = scoreToBand(score);
    const explanation = buildExplanation(band, college.name, college.acceptanceRate, confidence, strengths, weaknesses);

    return { band, bandLabel: BAND_LABELS[band], explanation, strengths, weaknesses, score, confidence };
  }, [inputs, college]);

  return { inputs, updateInput, resetInputs, college, result, colleges: COLLEGES };
}

function buildExplanation(
  band: ChanceBand,
  name: string,
  rate: number,
  confidence: "low" | "medium" | "high",
  strengths: string[],
  weaknesses: string[]
): string {
  const prefix: Record<ChanceBand, string> = {
    "very-low": `Admission to ${name} (${rate}% acceptance rate) would be very challenging based on your current profile.`,
    low: `Getting into ${name} (${rate}% acceptance rate) is an uphill battle, but not impossible with the right application.`,
    possible: `You have a reasonable shot at ${name} (${rate}% acceptance rate). Your profile has both strengths and areas to address.`,
    competitive: `You're a competitive applicant for ${name} (${rate}% acceptance rate). Your profile aligns well with what they're looking for.`,
    strong: `You're in a strong position for ${name} (${rate}% acceptance rate). Your stats are well above their typical admitted student.`,
  };

  const confidenceNote = confidence === "low"
    ? " Note: limited data was provided, so this estimate is less certain."
    : confidence === "medium"
    ? " Adding more data (test scores, GPA) would make this estimate more reliable."
    : "";

  const advice = strengths.length > weaknesses.length
    ? "Focus on making your application stand out through essays and extracurriculars."
    : "Consider strengthening the areas flagged below to improve your chances.";

  return `${prefix[band]} ${advice}${confidenceNote}`;
}
