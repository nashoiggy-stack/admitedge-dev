import type { Signal } from "./admissions";

// ── Types ────────────────────────────────────────────────────────────────────

export interface APScoreEntry {
  readonly subject: string;
  readonly score: 1 | 2 | 3 | 4 | 5;
}

// ── AP Subject List ─────────────────────────────────────────────────────────

export const AP_SUBJECTS = [
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Statistics",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP Physics 1",
  "AP Physics 2",
  "AP Physics C: Mechanics",
  "AP Physics C: E&M",
  "AP Chemistry",
  "AP Biology",
  "AP Environmental Science",
  "AP English Language",
  "AP English Literature",
  "AP US History",
  "AP World History",
  "AP European History",
  "AP US Government",
  "AP Comparative Government",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Psychology",
  "AP Human Geography",
  "AP Art History",
  "AP Music Theory",
  "AP Studio Art",
  "AP Spanish Language",
  "AP Spanish Literature",
  "AP French Language",
  "AP German Language",
  "AP Chinese Language",
  "AP Japanese Language",
  "AP Latin",
  "AP Seminar",
  "AP Research",
] as const;

// ── Major → Aligned AP Subjects ─────────────────────────────────────────────

const MAJOR_AP_ALIGNMENT: Record<string, readonly string[]> = {
  "Computer Science": ["AP Computer Science A", "AP Computer Science Principles", "AP Calculus AB", "AP Calculus BC", "AP Statistics"],
  "Engineering": ["AP Calculus AB", "AP Calculus BC", "AP Physics C: Mechanics", "AP Physics C: E&M", "AP Physics 1", "AP Physics 2", "AP Chemistry"],
  "Biology": ["AP Biology", "AP Chemistry", "AP Physics 1", "AP Calculus AB", "AP Statistics", "AP Environmental Science"],
  "Pre-Med": ["AP Biology", "AP Chemistry", "AP Physics 1", "AP Calculus AB", "AP Calculus BC", "AP Statistics"],
  "Chemistry": ["AP Chemistry", "AP Physics 1", "AP Calculus AB", "AP Calculus BC"],
  "Physics": ["AP Physics C: Mechanics", "AP Physics C: E&M", "AP Physics 1", "AP Physics 2", "AP Calculus BC"],
  "Mathematics": ["AP Calculus AB", "AP Calculus BC", "AP Statistics", "AP Computer Science A"],
  "Economics": ["AP Macroeconomics", "AP Microeconomics", "AP Calculus AB", "AP Calculus BC", "AP Statistics"],
  "Business": ["AP Macroeconomics", "AP Microeconomics", "AP Calculus AB", "AP Statistics"],
  "Political Science": ["AP US Government", "AP Comparative Government", "AP US History", "AP World History"],
  "History": ["AP US History", "AP World History", "AP European History", "AP Art History"],
  "Psychology": ["AP Psychology", "AP Biology", "AP Statistics"],
  "English": ["AP English Language", "AP English Literature", "AP US History"],
  "Communications": ["AP English Language", "AP English Literature", "AP Psychology"],
  "Education": ["AP Psychology", "AP English Language", "AP US History", "AP Statistics"],
  "Nursing": ["AP Biology", "AP Chemistry", "AP Psychology", "AP Statistics"],
  "Art": ["AP Art History", "AP Studio Art", "AP Music Theory"],
  "Music": ["AP Music Theory", "AP Art History"],
  "Pre-Law": ["AP US Government", "AP US History", "AP English Language", "AP World History", "AP Comparative Government"],
};

// ── Scoring Functions ───────────────────────────────────────────────────────

/**
 * Compute a quality index from AP score entries.
 * 5 = 1.0, 4 = 0.7, 3 = 0.3, 2 = 0, 1 = 0
 * Returns 0-1 weighted average favoring high scores.
 */
function computeApQualityIndex(entries: readonly APScoreEntry[]): number {
  if (entries.length === 0) return 0;

  const weights: Record<number, number> = { 5: 1.0, 4: 0.7, 3: 0.3, 2: 0, 1: 0 };
  let total = 0;
  let count = 0;

  for (const entry of entries) {
    const w = weights[entry.score] ?? 0;
    if (w > 0) {
      total += w;
      count++;
    }
  }

  return count > 0 ? total / count : 0;
}

/**
 * Count AP scores aligned with the intended major and compute their avg quality.
 */
function computeApMajorAlignment(
  entries: readonly APScoreEntry[],
  major: string
): { alignedCount: number; alignedAvg: number } {
  if (!major || major === "Any" || entries.length === 0) {
    return { alignedCount: 0, alignedAvg: 0 };
  }

  const alignedSubjects = MAJOR_AP_ALIGNMENT[major] ?? [];
  if (alignedSubjects.length === 0) return { alignedCount: 0, alignedAvg: 0 };

  const weights: Record<number, number> = { 5: 1.0, 4: 0.7, 3: 0.3, 2: 0, 1: 0 };
  let total = 0;
  let count = 0;

  for (const entry of entries) {
    if (alignedSubjects.some((s) => entry.subject.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(entry.subject.toLowerCase()))) {
      const w = weights[entry.score] ?? 0;
      total += w;
      count++;
    }
  }

  return { alignedCount: count, alignedAvg: count > 0 ? total / count : 0 };
}

/**
 * Compute the full AP academic support adjustment + signals.
 *
 * Max total: +6 points (4 base + 2 alignment)
 *   - Base: qualityIndex * quantityFactor * 4
 *   - Alignment: +1 if ≥1 aligned AP with avg≥0.7, +2 if ≥2 aligned with avg≥0.7
 *   - Test-optional extra: +1 if no SAT/ACT and quality ≥ 0.7
 *
 * No penalty for missing AP scores. Scores of 1-2 contribute nothing.
 */
export function computeApAcademicSupport(
  entries: readonly APScoreEntry[],
  major: string,
  hasTestScores: boolean
): { adjustment: number; signals: Signal[] } {
  if (entries.length === 0) {
    return { adjustment: 0, signals: [] };
  }

  const signals: Signal[] = [];
  let adjustment = 0;

  // Quality index (0-1)
  const qualityIndex = computeApQualityIndex(entries);

  // Quantity factor with diminishing returns (caps around 10-15 APs)
  const quantityFactor = Math.log1p(entries.length) / Math.log1p(15);

  // Base adjustment: max ~4 points
  const base = qualityIndex * quantityFactor * 4;
  adjustment += base;

  // Count score distribution for explanation
  const fives = entries.filter((e) => e.score === 5).length;
  const fours = entries.filter((e) => e.score === 4).length;
  const threes = entries.filter((e) => e.score === 3).length;
  const weak = entries.filter((e) => e.score <= 2).length;

  // Major alignment bonus (max +2)
  const alignment = computeApMajorAlignment(entries, major);
  let alignBonus = 0;
  if (alignment.alignedCount >= 2 && alignment.alignedAvg >= 0.7) {
    alignBonus = 2;
  } else if (alignment.alignedCount >= 1 && alignment.alignedAvg >= 0.7) {
    alignBonus = 1;
  }
  adjustment += alignBonus;

  // Test-optional extra boost (max +1)
  if (!hasTestScores && qualityIndex >= 0.7) {
    adjustment += 1;
    signals.push({
      label: "Strong AP scores provide additional academic evidence without standardized test scores",
      delta: 1,
    });
  }

  // Hard cap at 6
  adjustment = Math.min(6, adjustment);

  // Build explanation signal
  if (qualityIndex >= 0.85) {
    const parts = [];
    if (fives > 0) parts.push(`${fives} score${fives > 1 ? "s" : ""} of 5`);
    if (fours > 0) parts.push(`${fours} of 4`);
    signals.push({
      label: `Strong AP profile (${entries.length} exams: ${parts.join(", ")}) provides solid academic support${alignBonus > 0 ? `, with ${alignment.alignedCount} aligned to your intended major` : ""}`,
      delta: adjustment,
    });
  } else if (qualityIndex >= 0.6) {
    signals.push({
      label: `Good AP profile (${entries.length} exams, avg quality ${fives} fives / ${fours} fours) adds positive academic evidence${alignBonus > 0 ? ` with major-aligned scores` : ""}`,
      delta: adjustment,
    });
  } else if (qualityIndex >= 0.3) {
    signals.push({
      label: `AP scores (${entries.length} exams) provide some academic support, though mixed results limit the signal`,
      delta: adjustment,
    });
  } else {
    signals.push({
      label: `AP scores submitted but mostly below 3 — limited additional academic signal`,
      delta: adjustment,
    });
  }

  return { adjustment: Math.round(adjustment * 10) / 10, signals };
}
