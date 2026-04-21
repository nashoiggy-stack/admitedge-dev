// ── Import helpers for Resume Helper ────────────────────────────────────────
//
// Pulls data from existing tools (GPA calculator, EC Evaluator, profile)
// and returns typed resume entries. Pure functions — no localStorage side
// effects, so the hook can control when imports happen.

import type {
  ActivityEntry,
  CommunityServiceEntry,
  AthleticsEntry,
  SummerExperienceEntry,
  AwardEntry,
  EducationEntry,
  BasicInfo,
  ResumeData,
} from "./resume-types";
import { generateResumeId, normalizeTitle } from "./resume-types";
import type {
  ECConversation,
  ProfileEvaluation,
  ActivityEvaluation,
} from "./extracurricular-types";
import { EC_STORAGE_KEY, EC_ACTIVITIES_KEY } from "./extracurricular-types";
import type { UserProfile } from "./profile-types";
import { PROFILE_STORAGE_KEY } from "./profile-types";
import { classifyActivity, type ResumeSectionTarget } from "./resume-classifier";

// ── Safe localStorage reads ─────────────────────────────────────────────────

function safeParse<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── GPA fallback computation (mirrors useProfile.ts COL_UW table) ───────────
//
// If admitedge-profile has no GPA stored, compute it from gpa-calc-v1.

function computeGpaFromCalculator(): { gpaUW: string; gpaW: string } {
  const state = safeParse<{ years?: { rows?: { grade?: string; level?: string; credits?: string; nonCore?: boolean }[] }[] }>("gpa-calc-v1");
  if (!state?.years?.length) return { gpaUW: "", gpaW: "" };

  const COL_UW: Record<string, number> = {
    "A+": 4.0, A: 4.0, "A−": 3.7, "B+": 3.3, B: 3.0, "B−": 2.7,
    "C+": 2.3, C: 2.0, "C−": 1.7, "D+": 1.0, D: 1.0, F: 0.0,
  };
  const COL_BONUS: Record<string, number> = { CP: 0, Honors: 0.5, DE: 1.0, HDE: 1.0, AP: 1.0 };

  let colUW = 0;
  let colW = 0;
  let totalCredits = 0;
  for (const year of state.years) {
    if (!year.rows) continue;
    for (const row of year.rows) {
      if (!row.grade || row.nonCore) continue;
      const credits = parseFloat(row.credits ?? "1") || 1;
      const base = COL_UW[row.grade] ?? 0;
      const isF = row.grade === "F";
      colUW += base * credits;
      colW += (isF ? 0 : base + (COL_BONUS[row.level ?? "CP"] ?? 0)) * credits;
      totalCredits += credits;
    }
  }
  if (totalCredits === 0) return { gpaUW: "", gpaW: "" };
  return {
    gpaUW: (colUW / totalCredits).toFixed(2),
    gpaW: (colW / totalCredits).toFixed(2),
  };
}

// ── Profile import (basic info + GPA, with fallbacks) ───────────────────────

export interface ProfileImportResult {
  readonly basicInfo: Partial<BasicInfo>;
  readonly gpaUW: string;
  readonly gpaW: string;
}

export function importFromProfile(): ProfileImportResult {
  const profile = safeParse<UserProfile>(PROFILE_STORAGE_KEY);
  const fromCalc = computeGpaFromCalculator();

  const basicInfo: Partial<BasicInfo> = profile?.basicInfo ?? {};
  // Profile GPA takes precedence; calculator is a fallback
  const gpaUW = profile?.gpaUW || fromCalc.gpaUW || "";
  const gpaW = profile?.gpaW || fromCalc.gpaW || "";

  return { basicInfo, gpaUW, gpaW };
}

// ── EC Evaluator helpers ────────────────────────────────────────────────────

/**
 * Find the matching scored activity (from ProfileEvaluation) for a given
 * conversation. Matching is by title similarity — not by id because the
 * evaluator stores by activityName, not by conv id.
 */
function findMatchingEvaluation(
  conv: ECConversation,
  evaluation: ProfileEvaluation | null
): ActivityEvaluation | null {
  if (!evaluation?.activities?.length) return null;
  const convTitle = normalizeTitle(conv.title);
  return (
    evaluation.activities.find(
      (a) => normalizeTitle(a.activityName) === convTitle
    ) ?? null
  );
}

/**
 * Build a clean draft description from evaluator outputs first, raw chat last.
 * The result is a concise prose draft — the AI rewriter polishes it later.
 */
function buildDraftDescription(
  conv: ECConversation,
  evalMatch: ActivityEvaluation | null
): string {
  // Prefer structured evaluator output
  if (evalMatch) {
    const parts: string[] = [];
    if (evalMatch.tierExplanation) parts.push(evalMatch.tierExplanation);
    if (evalMatch.highlights?.length) {
      parts.push(evalMatch.highlights.join("; "));
    }
    if (parts.length > 0) {
      const combined = parts.join(" ");
      return combined.length > 400 ? combined.slice(0, 397) + "..." : combined;
    }
  }

  // Fallback: clean concatenation of substantive user messages
  const userMessages = conv.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 20);

  if (userMessages.length === 0) return "";
  const combined = userMessages.slice(0, 2).join(" ");
  return combined.length > 400 ? combined.slice(0, 397) + "..." : combined;
}

// ── Distributed import result ────────────────────────────────────────────────

export interface DistributedImportResult {
  readonly activities: readonly ActivityEntry[];
  readonly communityService: readonly CommunityServiceEntry[];
  readonly athletics: readonly AthleticsEntry[];
  readonly summerExperience: readonly SummerExperienceEntry[];
  readonly awards: readonly AwardEntry[];
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly distribution: Record<ResumeSectionTarget, number>;
}

interface ExistingEntries {
  readonly activities: readonly ActivityEntry[];
  readonly communityService: readonly CommunityServiceEntry[];
  readonly athletics: readonly AthleticsEntry[];
  readonly summerExperience: readonly SummerExperienceEntry[];
  readonly awards: readonly AwardEntry[];
}

function buildExistingTitleSet(existing: ExistingEntries): Set<string> {
  const titles = new Set<string>();
  for (const a of existing.activities) titles.add(normalizeTitle(a.activityName));
  for (const c of existing.communityService) titles.add(normalizeTitle(c.organization));
  for (const a of existing.athletics) titles.add(normalizeTitle(a.sport));
  for (const s of existing.summerExperience) titles.add(normalizeTitle(s.program));
  for (const aw of existing.awards) titles.add(normalizeTitle(aw.name));
  return titles;
}

/**
 * Import EC conversations and intelligently distribute them across resume
 * sections (Activities, Community Service, Athletics, Summer Experience,
 * Awards) using the classifier.
 *
 * Rules:
 * - Disabled conversations are excluded
 * - Empty conversations are excluded
 * - Existing entries with matching normalized titles are skipped (dedup)
 *   regardless of which section they live in
 */
export function importFromECEvaluator(
  existing: ExistingEntries
): DistributedImportResult {
  const conversations = safeParse<ECConversation[]>(EC_ACTIVITIES_KEY) ?? [];
  const evaluation = safeParse<ProfileEvaluation>(EC_STORAGE_KEY);

  const existingTitles = buildExistingTitleSet(existing);

  const newActivities: ActivityEntry[] = [];
  const newCommunity: CommunityServiceEntry[] = [];
  const newAthletics: AthleticsEntry[] = [];
  const newSummer: SummerExperienceEntry[] = [];
  const newAwards: AwardEntry[] = [];

  let skipped = 0;
  const distribution: Record<ResumeSectionTarget, number> = {
    activities: 0,
    communityService: 0,
    athletics: 0,
    summerExperience: 0,
    awards: 0,
  };

  for (const conv of conversations) {
    if (conv.disabled) continue;
    if (conv.messages.length === 0) continue;

    const evalMatch = findMatchingEvaluation(conv, evaluation);
    const name = evalMatch?.activityName ?? conv.title;
    const description = buildDraftDescription(conv, evalMatch);
    const impact = evalMatch?.highlights?.length ? evalMatch.highlights.join("; ") : "";
    const leadership = evalMatch ? evalMatch.scores.leadership >= 3 : false;
    const category = evalMatch?.category;

    if (existingTitles.has(normalizeTitle(name))) {
      skipped += 1;
      continue;
    }
    existingTitles.add(normalizeTitle(name));

    // Manual resume category override wins over auto-classification
    let target: ResumeSectionTarget;
    if (conv.resumeCategory && conv.resumeCategory !== "auto") {
      target = conv.resumeCategory;
    } else {
      target = classifyActivity({
        title: name,
        description,
        category,
        highlights: impact,
      });
    }
    distribution[target] += 1;

    const id = generateResumeId();

    switch (target) {
      case "communityService": {
        newCommunity.push({
          id,
          organization: name,
          role: leadership ? "Leadership Role" : "",
          grades: "",
          description,
          timeCommitment: "",
          source: "EC Evaluator",
        });
        break;
      }
      case "athletics": {
        newAthletics.push({
          id,
          sport: name,
          level: "",
          position: leadership ? "Captain" : "",
          grades: "",
          achievements: impact || description,
          timeCommitment: "",
        });
        break;
      }
      case "summerExperience": {
        newSummer.push({
          id,
          program: name,
          organization: "",
          duration: "",
          description,
          collegeCredit: false,
        });
        break;
      }
      case "awards": {
        newAwards.push({
          id,
          name,
          grades: "",
          description: impact || description,
        });
        break;
      }
      case "activities":
      default: {
        newActivities.push({
          id,
          activityName: name,
          role: "",
          grades: "",
          description,
          leadership,
          impact,
          category,
          source: "EC Evaluator",
        });
        break;
      }
    }
  }

  const importedCount =
    newActivities.length +
    newCommunity.length +
    newAthletics.length +
    newSummer.length +
    newAwards.length;

  return {
    activities: newActivities,
    communityService: newCommunity,
    athletics: newAthletics,
    summerExperience: newSummer,
    awards: newAwards,
    importedCount,
    skippedCount: skipped,
    distribution,
  };
}

// ── Full initial autofill (called once on hook mount) ──────────────────────

/**
 * Build an initial ResumeData seeded from whatever existing tool data we can
 * find. Called only when there's no saved resume in localStorage yet.
 */
export function buildInitialResume(base: ResumeData): ResumeData {
  const { basicInfo, gpaUW, gpaW } = importFromProfile();

  const mergedBasicInfo: BasicInfo = {
    ...base.basicInfo,
    name: basicInfo.name || base.basicInfo.name,
    email: basicInfo.email || base.basicInfo.email,
    phone: basicInfo.phone || base.basicInfo.phone,
    school: basicInfo.school || base.basicInfo.school,
    graduationYear: basicInfo.graduationYear || base.basicInfo.graduationYear,
    address: basicInfo.address || base.basicInfo.address,
  };

  // Seed an Education entry from the profile GPA if one is available.
  // Prefer unweighted as the "primary" gpa field for back-compat.
  const hasGpa = gpaUW || gpaW;
  const education: readonly EducationEntry[] =
    hasGpa && base.education.length === 0
      ? [
          {
            id: generateResumeId(),
            school: mergedBasicInfo.school,
            graduationDate: mergedBasicInfo.graduationYear,
            gpa: gpaUW || gpaW || "",
            gpaUnweighted: gpaUW || "",
            gpaWeighted: gpaW || "",
            gpaScale: gpaUW ? "4.00" : gpaW ? "5.00" : "",
            classRank: "",
            source: "GPA Calculator",
          },
        ]
      : base.education;

  return {
    ...base,
    basicInfo: mergedBasicInfo,
    education,
  };
}
