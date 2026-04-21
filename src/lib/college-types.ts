// ── UNDO [application-plan] ─────────────────────────────────────────────────
// To fully revert the application-plan feature, remove every block tagged
// `UNDO [application-plan]` across:
//   - src/lib/college-types.ts
//   - src/lib/admissions.ts
//   - src/data/colleges.ts
//   - src/hooks/useChanceCalculator.ts
//   - src/components/ChanceForm.tsx
//   - src/components/ChanceResult.tsx
// The field on College is optional and the ChanceInputs default is "RD",
// so removing the tagged regions restores the original behavior with no
// data migration required.
// ────────────────────────────────────────────────────────────────────────────

// UNDO [application-plan]: remove this block (ApplicationPlan + ApplicationOption)
export type ApplicationPlan =
  | "RD"
  | "EA"
  | "REA"
  | "SCEA"
  | "ED"
  | "ED2"
  | "Rolling";

export interface ApplicationOption {
  readonly type: ApplicationPlan;
  readonly binding?: boolean; // true only for ED / ED2
}

export const APPLICATION_PLAN_LABELS: Record<ApplicationPlan, string> = {
  RD: "Regular Decision",
  EA: "Early Action",
  REA: "Restrictive Early Action",
  SCEA: "Single-Choice Early Action",
  ED: "Early Decision",
  ED2: "Early Decision II",
  Rolling: "Rolling Admission",
};
// end UNDO [application-plan]

// Tier types used across the extended college profile. "low" | "medium" | "high"
// is deliberately coarse — normalized tiers are better than fake precision when
// exact data isn't publicly available.
export type Tier3 = "low" | "medium" | "high";

export interface College {
  // ── Core (original) ──────────────────────────────────────────────────────
  readonly name: string;
  readonly state: string;
  readonly type: "public" | "private";
  readonly size: "small" | "medium" | "large";
  readonly setting: "urban" | "suburban" | "rural";
  readonly acceptanceRate: number; // 0-100
  readonly avgGPAUW: number; // unweighted (4.0 scale, college recalculated)
  readonly avgGPAW: number; // weighted (5.0 scale, with AP/Honors bonuses)
  readonly sat25: number;
  readonly sat75: number;
  readonly act25: number;
  readonly act75: number;
  readonly testPolicy: "required" | "optional" | "blind";
  readonly topMajors: string[];
  readonly competitiveMajors: string[]; // majors harder to get into at this school
  readonly tags: string[]; // e.g. ["selective", "tech", "research", "collaborative"]
  readonly usNewsRank: number | null;
  readonly region: string;
  // UNDO [application-plan]: remove this field.
  readonly applicationOptions?: readonly ApplicationOption[];

  // ── Extended (all optional — used by comparison engine) ──────────────────

  // Location
  readonly city?: string;
  readonly selectivityTier?: "ultra" | "high" | "medium" | "low";

  // Academics — quantitative first, tier fallback only when no number exists
  readonly academicIntensity?: Tier3;           // fallback: no clean numeric proxy
  readonly researchStrength?: Tier3;            // fallback: no clean numeric proxy
  readonly internshipStrength?: Tier3;          // fallback: no clean numeric proxy
  readonly knownFor?: readonly string[];
  readonly flexibility?: Tier3;                 // fallback: no clean numeric proxy
  readonly coreCurriculum?: "open" | "moderate" | "structured";
  readonly avgGPARange?: string;                // e.g. "3.8-4.0" — display string
  readonly pctTopTenClass?: number;             // 0-100, % of freshmen from top 10% of HS class
  readonly studentFacultyRatio?: number;        // e.g. 6 means 6:1
  readonly fourYearGradRate?: number;           // 0-100

  // ── CDS-authoritative fields ─────────────────────────────────────────────
  // Sourced from each college's Common Data Set PDF via scripts/cds-sync.ts.
  // When present, these override the hand-curated estimates for the same
  // concept (e.g. acceptanceRate, pctTopTenClass).
  readonly yield?: number;                        // 0-100, % of admitted who enrolled (CDS C1)
  readonly edAdmitRate?: number;                  // 0-100, Early Decision admit rate (CDS C21)
  readonly eaAdmitRate?: number;                  // 0-100, Early Action admit rate (CDS C21)
  readonly regularDecisionAdmitRate?: number;     // 0-100, RD-only admit rate (CDS C1/C21 derived)
  readonly top10HSPercent?: number;               // 0-100, CDS-reported top 10% of HS class (CDS C11)
  readonly avgGPACDS?: number;                    // CDS-reported average HS GPA of enrolled freshmen (CDS C12)

  // Career / Outcomes — quantitative
  readonly topIndustries?: readonly string[];
  readonly careerPipelines?: readonly string[];
  readonly gradSchoolStrength?: Tier3;          // fallback: hard to quantify
  readonly avgStartingSalary?: number;          // USD, approximate median for all majors
  readonly pctEmployed6Mo?: number;             // 0-100, % employed/grad school within 6 months
  readonly medianEarnings10Yr?: number;         // USD, College Scorecard 10-year median

  // Campus / Life — tier retained internally, descriptions are user-facing
  readonly vibeTags?: readonly string[];
  readonly socialScene?: Tier3;
  readonly greekLifePresence?: Tier3;
  readonly greekLifePct?: number;
  readonly sportsCulture?: Tier3;
  readonly campusCohesion?: Tier3;

  // Structured qualitative: strict classifications + descriptions.
  // Classifications are the source of truth for tag labels.
  // Descriptions are 1-2 sentences for expanded detail.
  readonly qualitative?: QualitativeClassifications;
  readonly campusDetails?: CampusDetails;
  readonly cultureDetails?: CultureDetails;
  readonly locationDetails?: LocationDetails;

  // Location — quantitative where possible
  readonly proximityToCity?: Tier3;
  readonly distanceToCityMiles?: number;
  readonly weather?: string;

  // Cost — quantitative
  readonly costTier?: Tier3;                    // kept as fallback label
  readonly annualCostEstimate?: number;         // USD, sticker price (before aid)
  readonly avgNetPrice?: number;                // USD, average net price after aid
  readonly strongFinancialAid?: boolean;
  readonly strongMeritAid?: boolean;

  // Demographics
  readonly diversityIndex?: Tier3;
  readonly percentInternational?: number | null;

  // Detailed demographics
  readonly demographics?: DemographicBreakdown;
  readonly genderBreakdown?: GenderBreakdown;
  readonly undergradPopulation?: number;
  readonly inStatePercent?: number;

  // Search aliases
  readonly aliases?: readonly string[];
}

export interface DemographicBreakdown {
  readonly white?: number;
  readonly asian?: number;
  readonly hispanic?: number;
  readonly black?: number;
  readonly multiracial?: number;
  readonly international?: number;
  readonly other?: number;
}

export interface GenderBreakdown {
  readonly male?: number;
  readonly female?: number;
}

// ── Strict qualitative classifications ───────────────────────────────────────
//
// Each classification uses a fixed enum with a real-world definition.
// Tags are derived FROM these enums, never guessed from Tier3 values.
// Descriptions are 1-2 sentences, school-specific, never generic filler.

// LOCATION: based on actual geography, NOT distance to NYC
export type LocationType =
  | "urban"          // integrated with a major metro (Columbia, NYU, BU)
  | "suburban"       // near a major city, 30-60 min access (Princeton, Villanova)
  | "college-town"   // town dominated by the university (Ann Arbor, Chapel Hill)
  | "rural";         // isolated, low population, limited access (Dartmouth, Cornell)

// COLLABORATION style
export type CollaborationStyle =
  | "collaborative"  // group-oriented, shared work culture (MIT psets, Rice colleges)
  | "mixed"          // varies by major or department
  | "competitive";   // grade-conscious, high comparison (pre-med heavy, curve-graded)

// STUDENT archetype
export type StudentArchetype =
  | "preprofessional" // career-focused: finance, consulting, tech pipelines
  | "intellectual"    // theory-driven, discussion-heavy, academia-leaning
  | "balanced"        // genuine mix (only use when truly neither-dominant)
  | "entrepreneurial" // startup/innovation-focused
  | "service-oriented"; // mission/community driven

// ACADEMIC VIBE
export type AcademicVibe =
  | "intense"        // heavy workload, high pressure, demanding
  | "rigorous"       // challenging but manageable, well-supported
  | "moderate"       // standard college workload
  | "relaxed";       // lighter workload, flexible pacing

// GRADE CULTURE
export type GradeCulture =
  | "deflation"      // harder grading (Princeton, MIT, Berkeley)
  | "neutral"        // standard grading
  | "inflation";     // easier grading (Harvard, Stanford, Brown)

// PARTY / SOCIAL SCENE
export type SocialSceneType =
  | "high"           // frequent large events, dominant social activity
  | "moderate"       // active but not dominant
  | "low";           // limited or niche, intellectual/small-group focused

// GREEK LIFE role
export type GreekLifeRole =
  | "dominant"       // major part of social structure (>25%)
  | "present"        // exists but not dominant (10-25%)
  | "minimal";       // small role (<10%)

// SOCIAL STYLE
export type SocialStyle =
  | "campus-centered"  // activity mostly on campus
  | "city-integrated"  // social life heavily off-campus
  | "mixed";           // blend of both

// INTELLECTUAL CLIMATE
export type IntellectualClimate =
  | "discussion-heavy"      // seminars, debate, humanities-leaning
  | "research-heavy"        // labs, projects, STEM-leaning
  | "preprofessional-focused" // career prep dominates intellectual life
  | "balanced";             // genuine mix

export interface CampusDetails {
  readonly socialScene?: string;
  readonly greekLife?: string;
  readonly sportsCulture?: string;
  readonly housing?: string;
  readonly environment?: string;
}

export interface CultureDetails {
  readonly vibe?: string;
  readonly collaboration?: string;
  readonly studentType?: string;
  readonly academicCulture?: string;
}

export interface LocationDetails {
  readonly cityIntegration?: string;
  readonly internshipAccess?: string;
  readonly surroundings?: string;
}

// ── Structured classifications (used for tag derivation) ────────────────────
// These live on College and are the SOURCE OF TRUTH for tag labels.
// The UI reads these directly — never derives tags from Tier3 values.

export interface QualitativeClassifications {
  readonly locationType: LocationType;
  readonly collaborationStyle: CollaborationStyle;
  readonly studentArchetype: StudentArchetype;
  readonly academicVibe: AcademicVibe;
  readonly gradeCulture: GradeCulture;
  readonly socialSceneType: SocialSceneType;
  readonly greekLifeRole: GreekLifeRole;
  readonly socialStyle: SocialStyle;
  readonly intellectualClimate: IntellectualClimate;
}

export type Classification = "unlikely" | "reach" | "target" | "likely" | "safety";

export type MajorMatchLevel = "strong" | "decent" | "none";

export interface ClassifiedCollege {
  readonly college: College;
  readonly classification: Classification;
  readonly reason: string;
  readonly fitScore: number; // 0-100
  // Set when the user has picked a major or interest. "strong" = this
  // school is known for it; "decent" = adjacent signal (career pipeline,
  // industry, or token overlap); "none" = no signal or no query.
  readonly majorMatch?: MajorMatchLevel;
}

export type ChanceBand = "very-low" | "low" | "possible" | "competitive" | "strong";

export interface ChanceResult {
  readonly band: ChanceBand;
  readonly bandLabel: string;
  readonly explanation: string;
  readonly strengths: string[];
  readonly weaknesses: string[];
  readonly score: number; // internal 0-100
  readonly confidence: "low" | "medium" | "high";
}

export interface CollegeFilters {
  gpaUW: string;
  gpaW: string;
  sat: string;
  act: string;
  actScience: string; // optional, not in composite
  // Preference, not a hard filter. Colleges that aren't known for this
  // major still appear in the list — they just don't get the "Strong fit"
  // badge. Used to rank results when sort = majorMatch.
  major: string;
  // Free-text interest box (e.g. "sustainability", "quant trading").
  // Matched fuzzily against knownFor / careerPipelines / topIndustries.
  intendedInterest: string;
  region: string;
  size: string;
  setting: string;
  type: string;
  acceptanceRateMin: string;
  acceptanceRateMax: string;
  testPolicy: string;
  essayCommonApp: string; // 0-100
  essayVspice: string; // 0-4
}

export type ECBandInput = "" | "limited" | "developing" | "solid" | "strong" | "exceptional";

export interface ChanceInputs {
  gpaUW: string;
  gpaW: string;
  sat: string;
  act: string;
  actScience: string; // optional, not in composite
  apScores: { subject: string; score: 1 | 2 | 3 | 4 | 5 }[]; // optional AP exam scores
  rigor: "low" | "medium" | "high";
  major: string;
  ecBand: ECBandInput; // 5-band scale from EC Evaluator
  essayCommonApp: string; // 0-100
  essayVspice: string; // 0-4 (composite)
  collegeIndex: number | null;
  // UNDO [application-plan]: remove this field. Default "RD" means removing
  // it and deleting the reset-on-college-change effect restores the original
  // behavior exactly.
  applicationPlan: ApplicationPlan;
}

export const EMPTY_FILTERS: CollegeFilters = {
  gpaUW: "",
  gpaW: "",
  sat: "",
  act: "",
  actScience: "",
  major: "",
  intendedInterest: "",
  region: "any",
  size: "any",
  setting: "any",
  type: "any",
  acceptanceRateMin: "",
  acceptanceRateMax: "",
  testPolicy: "any",
  essayCommonApp: "",
  essayVspice: "",
};

export const EMPTY_CHANCE_INPUTS: ChanceInputs = {
  gpaUW: "",
  gpaW: "",
  sat: "",
  act: "",
  actScience: "",
  apScores: [],
  rigor: "medium",
  major: "",
  ecBand: "",
  essayCommonApp: "",
  essayVspice: "",
  collegeIndex: null,
  // UNDO [application-plan]: remove this line.
  applicationPlan: "RD",
};

export const REGIONS = [
  "any", "Northeast", "Southeast", "Midwest", "Southwest", "West",
] as const;

export const MAJORS = [
  "Any", "Business", "Computer Science", "Engineering", "Biology",
  "Psychology", "Economics", "Political Science", "Communications",
  "Nursing", "Education", "English", "Mathematics", "Chemistry",
  "Physics", "History", "Art", "Music", "Pre-Med", "Pre-Law",
] as const;

// ── Pinned Colleges ────────────────────────────────────────────────────────
// Users pin schools they're actually considering. The Strategy Engine reads
// this list as its primary source for school-list analysis.
export interface PinnedCollege {
  readonly name: string;         // matches College.name exactly
  readonly pinnedAt: number;     // epoch ms — for stable ordering
  readonly applicationPlan?: ApplicationPlan; // optional user override
}

export const PINNED_COLLEGES_KEY = "admitedge-pinned-colleges";
