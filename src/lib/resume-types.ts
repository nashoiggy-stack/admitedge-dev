// ── Resume Helper types ──────────────────────────────────────────────────────
//
// A college-admissions resume is a collection of sections, each containing
// a list of entries. Entries are schema-light (plain objects) so importing
// from other tools is straightforward.

export interface BasicInfo {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly school: string;
  readonly graduationYear: string;
  readonly address: string; // optional; empty string when unset
}

export interface EducationEntry {
  readonly id: string;
  readonly school: string;
  readonly graduationDate: string;
  readonly gpa: string;           // legacy field — kept for back-compat, unused in forms
  readonly gpaUnweighted: string; // e.g. "3.87"
  readonly gpaWeighted: string;   // e.g. "4.52"
  readonly gpaScale: string;      // e.g. "4.00" or "5.00"
  readonly classRank: string;     // e.g. "5/450" or blank
  readonly source?: string;       // e.g. "GPA Calculator"
}

export interface AwardEntry {
  readonly id: string;
  readonly name: string;
  readonly grades: string;       // e.g. "11, 12"
  readonly description: string;  // optional
}

export interface CommunityServiceEntry {
  readonly id: string;
  readonly organization: string;
  readonly role: string;
  readonly grades: string;
  readonly description: string;
  readonly timeCommitment: string; // optional (e.g. "5 hrs/week")
  readonly source?: string;
}

export interface AthleticsEntry {
  readonly id: string;
  readonly sport: string;
  readonly level: string;        // e.g. "Varsity", "JV", "Club"
  readonly position: string;
  readonly grades: string;
  readonly achievements: string;
  readonly timeCommitment: string;
}

export interface ActivityEntry {
  readonly id: string;
  readonly activityName: string;
  readonly role: string;
  readonly grades: string;
  readonly description: string;
  readonly leadership: boolean;
  readonly impact: string;        // e.g. "Grew club from 15 to 40 members"
  readonly category?: string;     // from EC Evaluator
  readonly source?: string;
}

export interface SummerExperienceEntry {
  readonly id: string;
  readonly program: string;
  readonly organization: string;
  readonly duration: string;
  readonly description: string;
  readonly collegeCredit: boolean;
}

export interface SkillsData {
  readonly languages: string;
  readonly technical: string;
  readonly other: string;
}

export interface ResumeData {
  readonly basicInfo: BasicInfo;
  readonly education: readonly EducationEntry[];
  readonly awards: readonly AwardEntry[];
  readonly communityService: readonly CommunityServiceEntry[];
  readonly athletics: readonly AthleticsEntry[];
  readonly activities: readonly ActivityEntry[];
  readonly summerExperience: readonly SummerExperienceEntry[];
  readonly skills: SkillsData;
}

// ── Empty / defaults ────────────────────────────────────────────────────────

export const EMPTY_BASIC_INFO: BasicInfo = {
  name: "",
  email: "",
  phone: "",
  school: "",
  graduationYear: "",
  address: "",
};

export const EMPTY_SKILLS: SkillsData = {
  languages: "",
  technical: "",
  other: "",
};

export const EMPTY_RESUME: ResumeData = {
  basicInfo: EMPTY_BASIC_INFO,
  education: [],
  awards: [],
  communityService: [],
  athletics: [],
  activities: [],
  summerExperience: [],
  skills: EMPTY_SKILLS,
};

// ── Section keys + labels ───────────────────────────────────────────────────
//
// Ordered by the typical admissions resume layout. Used to drive the
// section card grid so adding a new section is a data-only change.

export type ResumeSectionKey =
  | "basicInfo"
  | "education"
  | "awards"
  | "communityService"
  | "athletics"
  | "activities"
  | "summerExperience"
  | "skills";

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  basicInfo: "Header",
  education: "Education",
  awards: "Awards & Honors",
  communityService: "Community Service",
  athletics: "Athletics",
  activities: "Activities",
  summerExperience: "Summer Experience",
  skills: "Skills",
};

// ── localStorage key ────────────────────────────────────────────────────────

export const RESUME_STORAGE_KEY = "admitedge-resume";

// ── Common App character limits ─────────────────────────────────────────────

export const COMMON_APP_LIMITS = {
  activityNameMax: 50,
  descriptionMax: 150,
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function generateResumeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Normalize a title for duplicate detection. Lowercase, trim, collapse
 * whitespace, strip punctuation.
 */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
