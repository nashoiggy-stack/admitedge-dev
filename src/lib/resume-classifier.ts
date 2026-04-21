// ── Resume activity classifier ──────────────────────────────────────────────
//
// Routes a raw activity (from EC Evaluator or user input) into the right
// resume section. Uses category hints first, then keyword scoring.

export type ResumeSectionTarget =
  | "activities"
  | "communityService"
  | "athletics"
  | "summerExperience"
  | "awards";

interface ClassifyInput {
  readonly title: string;
  readonly description?: string;
  readonly category?: string; // from EC Evaluator
  readonly highlights?: string;
}

// Keyword tables. Match on word boundaries; scores are summed per section.
// Higher score wins. Ties default to "activities".

const KEYWORDS: Record<ResumeSectionTarget, readonly string[]> = {
  communityService: [
    "volunteer", "volunteering", "nonprofit", "non-profit", "ngo",
    "community service", "service", "outreach", "charity", "donate", "donation",
    "homeless", "shelter", "food bank", "soup kitchen", "habitat",
    "tutor", "mentor", "mentoring", "key club", "interact club",
    "fundraise", "fundraiser", "fundraising", "drive", "red cross",
    "hospital volunteer", "elderly", "nursing home", "literacy",
    "ronald mcdonald", "salvation army", "goodwill",
  ],
  athletics: [
    "sport", "sports", "varsity", "junior varsity", "jv ", " jv",
    "team captain", "athlete", "athletics", "soccer", "basketball",
    "football", "baseball", "softball", "tennis", "golf", "swim",
    "swimming", "track", "cross country", "wrestling", "lacrosse",
    "hockey", "volleyball", "rugby", "cheer", "cheerleading", "rowing",
    "crew", "fencing", "gymnastics", "martial arts", "karate", "taekwondo",
    "boxing", "skiing", "snowboard", "climbing", "bouldering", "cycling",
    "running", "marathon", "triathlon", "captain of",
  ],
  summerExperience: [
    "summer program", "summer internship", "summer research", "summer course",
    "summer camp", "internship", "intern at", "research assistant",
    "research intern", "research program", "lab intern", "rotc",
    "governor's school", "ssp", "rsi", "summer institute",
    "shadow", "shadowing", "8-week", "6-week", "10-week", "summer 20",
    "boys state", "girls state", "boys nation", "girls nation",
    "cosmos", "tasp", "mites", "ross program", "promys",
  ],
  awards: [
    "award", "awarded", "honor", "honors", "medal", "medalist",
    "trophy", "scholarship", "recognition", "recognized",
    "national merit", "presidential", "valedictorian", "salutatorian",
    "honor roll", "dean's list", "first place", "1st place", "second place",
    "2nd place", "third place", "3rd place", "champion", "championship",
    "winner", "winning", "finalist", "semifinalist", "semi-finalist",
    "qualifier", "qualified for", "olympiad gold", "olympiad silver",
    "olympiad bronze", "ap scholar", "amc honor", "aime qualifier",
    "siemens", "intel sts", "regeneron",
  ],
  activities: [
    // Catch-all words that bias toward activities (not high-weight)
    "club", "society", "team", "association", "council",
    "newspaper", "yearbook", "magazine", "literary",
    "debate", "model un", "mun", "speech", "forensics",
    "robotics", "math team", "science olympiad", "chess", "computer",
    "band", "orchestra", "choir", "chorus", "ensemble", "musical",
    "theater", "theatre", "drama", "improv", "art club",
    "student government", "student council", "senate",
  ],
};

// Category hints from EC Evaluator → direct routing.
// These run before keyword scoring and override it when matched.
const CATEGORY_MAP: Record<string, ResumeSectionTarget> = {
  "community service": "communityService",
  service: "communityService",
  volunteer: "communityService",
  athletics: "athletics",
  sports: "athletics",
  sport: "athletics",
  "summer program": "summerExperience",
  internship: "summerExperience",
  research: "summerExperience",
  "summer research": "summerExperience",
};

function normalize(s: string): string {
  return s.toLowerCase();
}

/**
 * Classify a single activity into a resume section.
 * Returns the section key. Defaults to "activities" if nothing matches.
 */
export function classifyActivity(input: ClassifyInput): ResumeSectionTarget {
  // 1. Direct category hint from the EC Evaluator wins outright
  if (input.category) {
    const catNorm = normalize(input.category).trim();
    if (CATEGORY_MAP[catNorm]) return CATEGORY_MAP[catNorm];
    // Loose match: substring against the map keys
    for (const [key, target] of Object.entries(CATEGORY_MAP)) {
      if (catNorm.includes(key)) return target;
    }
  }

  // 2. Keyword scoring on combined text
  const haystack = [
    input.title,
    input.description ?? "",
    input.highlights ?? "",
  ]
    .map(normalize)
    .join(" ");

  const scores: Record<ResumeSectionTarget, number> = {
    communityService: 0,
    athletics: 0,
    summerExperience: 0,
    awards: 0,
    activities: 0,
  };

  for (const [section, keywords] of Object.entries(KEYWORDS) as [
    ResumeSectionTarget,
    readonly string[],
  ][]) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        // Title hits weigh more than description hits
        const weight = normalize(input.title).includes(kw) ? 3 : 1;
        scores[section] += weight;
      }
    }
  }

  // 3. Pick highest score; default to "activities" on tie/zero
  let best: ResumeSectionTarget = "activities";
  let bestScore = 0;
  // Specialized sections beat the generic "activities" bucket on ties
  const priority: ResumeSectionTarget[] = [
    "summerExperience",
    "athletics",
    "communityService",
    "awards",
    "activities",
  ];
  for (const section of priority) {
    if (scores[section] > bestScore) {
      best = section;
      bestScore = scores[section];
    }
  }
  return best;
}

// ── Section labels for UI ──────────────────────────────────────────────────

export const SECTION_LABEL: Record<ResumeSectionTarget, string> = {
  activities: "Activities",
  communityService: "Community Service",
  athletics: "Athletics",
  summerExperience: "Summer Experience",
  awards: "Awards & Honors",
};
