// Shared matcher for "is this college strong in the major/interest the user
// cares about?" Used by both the college list (to badge cards) and the
// strategy engine (to rank recommended colleges). Keeping the rules in one
// file means the two surfaces stay consistent.
//
// The match is deliberately fuzzy and three-tiered:
//   - STRONG: the major appears directly in College.topMajors, or the
//             interest matches something in College.knownFor.
//   - DECENT: weaker signal — the major shows up in careerPipelines /
//             topIndustries, or the interest has token overlap with
//             knownFor / careerPipelines / topIndustries.
//   - NONE:   no discernible signal. The college still shows on the list
//             — it just doesn't get the "fit for X" badge.

import type { College } from "./college-types";

export type MajorMatch = "strong" | "decent" | "none";

export interface MajorMatchInput {
  readonly major?: string | null;    // e.g. "Computer Science" (from MAJORS)
  readonly interest?: string | null; // free-text, e.g. "sustainability"
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

// "substring either direction" — the user's query or the college's tag can
// be the superstring. Keeps matches robust to small wording differences
// ("Computer Science" vs "CS", "Business" vs "Business Administration").
function biSubstringMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function anyBiSubstring(query: string, pool: readonly string[] | undefined): boolean {
  if (!pool || pool.length === 0) return false;
  return pool.some((p) => biSubstringMatch(query, normalize(p)));
}

// Token overlap = any non-trivial shared word. Used only for the fuzzier
// "decent" tier so we don't over-match on common words.
const STOPWORDS = new Set([
  "the", "and", "or", "of", "a", "an", "in", "for", "to", "with",
  "on", "is", "are", "at", "be", "by", "as", "it", "this", "that",
]);

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function hasTokenOverlap(query: string, pool: readonly string[] | undefined): boolean {
  if (!pool || pool.length === 0) return false;
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return false;
  for (const entry of pool) {
    for (const t of tokens(entry)) {
      if (qTokens.has(t)) return true;
    }
  }
  return false;
}

export function getMajorMatch(college: College, input: MajorMatchInput): MajorMatch {
  const major = normalize(input.major);
  const interest = normalize(input.interest);

  // No query at all — nothing to say.
  if ((!major || major === "any") && !interest) return "none";

  // ── STRONG ──────────────────────────────────────────────────────────────
  // Major appears in the college's topMajors. This is the authoritative
  // "this school is known for this major" signal.
  if (major && major !== "any" && anyBiSubstring(major, college.topMajors)) {
    return "strong";
  }
  // Interest matches College.knownFor — the hand-curated tags that describe
  // what the school is famous for (e.g. "pre-med powerhouse",
  // "sustainability").
  if (interest && anyBiSubstring(interest, college.knownFor)) {
    return "strong";
  }

  // ── DECENT ──────────────────────────────────────────────────────────────
  // Major shows up in careerPipelines or topIndustries — the school
  // produces graduates who go into this area, even if it's not a headline
  // major.
  if (
    major &&
    major !== "any" &&
    (anyBiSubstring(major, college.careerPipelines) ||
      anyBiSubstring(major, college.topIndustries))
  ) {
    return "decent";
  }
  // Interest has token overlap with any of the qualitative descriptive
  // fields. Fuzzier, catches e.g. "sustainable design" → "sustainability"
  // in knownFor.
  if (
    interest &&
    (hasTokenOverlap(interest, college.knownFor) ||
      hasTokenOverlap(interest, college.careerPipelines) ||
      hasTokenOverlap(interest, college.topIndustries))
  ) {
    return "decent";
  }

  return "none";
}

// Ordered ranking used by sort comparators ("strong" beats "decent" beats
// "none"). Higher number = better match.
export const MAJOR_MATCH_RANK: Record<MajorMatch, number> = {
  strong: 2,
  decent: 1,
  none: 0,
};

export function compareByMajorMatch(a: MajorMatch, b: MajorMatch): number {
  return MAJOR_MATCH_RANK[b] - MAJOR_MATCH_RANK[a];
}
