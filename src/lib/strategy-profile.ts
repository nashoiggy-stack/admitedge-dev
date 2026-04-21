// ── Strategy Profile Reader ─────────────────────────────────────────────────
//
// Assembles a StrategyProfile from every localStorage source the rest of the
// app writes to. Handles missing data gracefully — every field is nullable,
// so the Strategy Engine degrades cleanly when the user hasn't used every
// tool yet.
//
// This function is pure (reads localStorage, no side effects) and must only
// run on the client.

import type {
  StrategyProfile,
  StrategyPinnedSchool,
  StrategyGpa,
  StrategyTests,
  StrategyEssay,
} from "./strategy-types";
import { DREAM_SCHOOL_KEY } from "./strategy-types";
import type { UserProfile } from "./profile-types";
import type { ProfileEvaluation } from "./extracurricular-types";
import type { GradingResult, SavedEssay } from "./types";
import type { ClassifiedCollege, PinnedCollege } from "./college-types";
import { PINNED_COLLEGES_KEY } from "./college-types";
import { PROFILE_STORAGE_KEY } from "./profile-types";
import { COLLEGES } from "@/data/colleges";
import { classifyCollege } from "./admissions";

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  return safeParseJSON<UserProfile>(localStorage.getItem(PROFILE_STORAGE_KEY));
}

function readEcEvaluation(): ProfileEvaluation | null {
  if (typeof window === "undefined") return null;
  return safeParseJSON<ProfileEvaluation>(localStorage.getItem("ec-evaluator-result"));
}

function readEssayHistory(): readonly SavedEssay[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParseJSON<SavedEssay[]>(localStorage.getItem("essay-grader-history"));
  return Array.isArray(parsed) ? parsed : [];
}

function readPinnedCollegeList(): readonly PinnedCollege[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParseJSON<PinnedCollege[]>(localStorage.getItem(PINNED_COLLEGES_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (p): p is PinnedCollege =>
      typeof p?.name === "string" && typeof p?.pinnedAt === "number",
  );
}

// ── Transforms ──────────────────────────────────────────────────────────────

function buildGpa(profile: UserProfile | null): StrategyGpa {
  const uw = profile?.gpaUW ? parseFloat(profile.gpaUW) : NaN;
  const w = profile?.gpaW ? parseFloat(profile.gpaW) : NaN;
  return {
    uw: Number.isFinite(uw) ? uw : null,
    w: Number.isFinite(w) ? w : null,
    rigor: profile?.rigor ?? "medium",
  };
}

function buildTests(profile: UserProfile | null): StrategyTests {
  let sat: number | null = null;
  let act: number | null = null;
  let apCount = 0;
  let apStrongCount = 0;

  if (profile?.sat?.readingWriting && profile?.sat?.math) {
    const r = parseInt(profile.sat.readingWriting, 10);
    const m = parseInt(profile.sat.math, 10);
    if (Number.isFinite(r) && Number.isFinite(m)) sat = r + m;
  }
  if (profile?.act?.english && profile?.act?.math && profile?.act?.reading) {
    const e = parseInt(profile.act.english, 10);
    const m = parseInt(profile.act.math, 10);
    const r = parseInt(profile.act.reading, 10);
    const s = profile.act.science ? parseInt(profile.act.science, 10) : NaN;
    const parts = [e, m, r, s].filter((v) => Number.isFinite(v));
    if (parts.length >= 3) {
      act = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    }
  }
  if (Array.isArray(profile?.apScores)) {
    for (const ap of profile!.apScores) {
      apCount++;
      if (ap.score >= 4) apStrongCount++;
    }
  }

  return { sat, act, apCount, apStrongCount };
}

function buildEssay(
  profile: UserProfile | null,
  history: readonly SavedEssay[],
): StrategyEssay | null {
  const summaryScore = profile?.essayCommonApp
    ? Number.parseFloat(profile.essayCommonApp)
    : null;
  const vspice = profile?.essayVspice
    ? Number.parseFloat(profile.essayVspice)
    : null;

  const hasAny =
    (summaryScore != null && Number.isFinite(summaryScore)) ||
    (vspice != null && Number.isFinite(vspice)) ||
    history.length > 0;
  if (!hasAny) return null;

  // Pick the most recently saved essay as "latest" for richer LLM context.
  const latest: GradingResult | null =
    history.length > 0
      ? history.reduce((a, b) => (a.savedAt > b.savedAt ? a : b)).result
      : null;

  return {
    summaryScore: Number.isFinite(summaryScore ?? NaN) ? summaryScore : null,
    vspice: Number.isFinite(vspice ?? NaN) ? vspice : null,
    latest,
  };
}

function buildPinnedSchools(
  pins: readonly PinnedCollege[],
  profile: UserProfile | null,
): readonly StrategyPinnedSchool[] {
  if (pins.length === 0) return [];

  // Parse the profile into the shape classifyCollege expects.
  const gpaUW = profile?.gpaUW ? parseFloat(profile.gpaUW) : null;
  const gpaW = profile?.gpaW ? parseFloat(profile.gpaW) : null;
  const sat =
    profile?.sat?.readingWriting && profile?.sat?.math
      ? parseInt(profile.sat.readingWriting, 10) + parseInt(profile.sat.math, 10)
      : null;
  const actParts = [
    profile?.act?.english,
    profile?.act?.math,
    profile?.act?.reading,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isFinite(v));
  const act =
    actParts.length >= 3
      ? Math.round(actParts.reduce((a, b) => a + b, 0) / actParts.length)
      : null;
  const essayCA = profile?.essayCommonApp
    ? parseFloat(profile.essayCommonApp)
    : null;
  const essayV = profile?.essayVspice ? parseFloat(profile.essayVspice) : null;

  const result: StrategyPinnedSchool[] = [];
  for (const pin of pins) {
    const college = COLLEGES.find((c) => c.name === pin.name);
    if (!college) continue; // pinned a school that's no longer in the DB — skip
    const { classification, reason, fitScore } = classifyCollege(
      college,
      Number.isFinite(gpaUW ?? NaN) ? gpaUW : null,
      Number.isFinite(gpaW ?? NaN) ? gpaW : null,
      Number.isFinite(sat ?? NaN) ? sat : null,
      Number.isFinite(act ?? NaN) ? act : null,
      Number.isFinite(essayCA ?? NaN) ? essayCA : null,
      Number.isFinite(essayV ?? NaN) ? essayV : null,
    );
    const classified: ClassifiedCollege = {
      college,
      classification,
      reason,
      fitScore,
    };
    result.push({ pin, classified });
  }
  return result;
}

// ── Public reader ───────────────────────────────────────────────────────────

function readDreamSchool(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DREAM_SCHOOL_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    // Accept both a plain string and a JSON-quoted string for backward compat.
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return JSON.parse(trimmed) as string;
    }
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function readStrategyProfile(): StrategyProfile {
  const profile = readUserProfile();
  const ec = readEcEvaluation();
  const essayHistory = readEssayHistory();
  const pins = readPinnedCollegeList();
  const dreamSchool = readDreamSchool();

  const gpa = buildGpa(profile);
  const tests = buildTests(profile);
  const essay = buildEssay(profile, essayHistory);
  const pinnedSchools = buildPinnedSchools(pins, profile);

  const hasGpa = gpa.uw != null || gpa.w != null;
  const hasTests = tests.sat != null || tests.act != null;
  const hasEc = ec != null && Array.isArray(ec.activities) && ec.activities.length > 0;
  const hasEssay = essay != null;
  const hasPinnedSchools = pinnedSchools.length > 0;
  const hasDreamSchool = dreamSchool != null && dreamSchool.length > 0;

  // Normalize "Any" (the default dropdown value on the colleges page) down
  // to empty string — downstream code only cares whether the user actually
  // picked a major.
  const rawMajor = (profile?.intendedMajor ?? "").trim();
  const intendedMajor = rawMajor && rawMajor !== "Any" ? rawMajor : "";
  const intendedInterest = (profile?.intendedInterest ?? "").trim();

  return {
    gpa,
    tests,
    ec,
    essay,
    pinnedSchools,
    dreamSchool,
    intendedMajor,
    intendedInterest,
    basicInfo:
      profile?.basicInfo?.name || profile?.basicInfo?.graduationYear
        ? {
            name: profile?.basicInfo?.name ?? "",
            graduationYear: profile?.basicInfo?.graduationYear ?? "",
          }
        : null,
    hasGpa,
    hasTests,
    hasEc,
    hasEssay,
    hasPinnedSchools,
    hasDreamSchool,
  };
}
