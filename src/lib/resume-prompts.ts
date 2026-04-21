// ── Resume improve prompts ──────────────────────────────────────────────────
//
// Tone target: Top-tier college admissions advising. Concise, action-led,
// quantified when honest, zero filler.

export type ResumeImproveMode = "activity" | "description";

const VOICE_RULES = `
WRITING VOICE — ABSOLUTE RULES:
1. Lead with a strong action verb. Past tense for finished work, present for ongoing roles.
2. Subject-line style: drop "I", drop articles ("a", "the") where natural.
3. Prefer concrete nouns and specific verbs over abstract claims.
4. Quantify ONLY with numbers the student actually provided. Never invent statistics.
5. Cut filler: "responsible for", "helped to", "in order to", "various", "many", "several",
   "successfully", "actively", "really", "very", "things", "stuff", "etc.", "as well as".
6. Cut throat-clearing: "I worked on...", "This involved...", "My role was...".
7. Use semicolons or dashes — not full sentences chained with "and" or "also".
8. One idea per phrase. Density over length.
9. No exclamation marks. No emoji. No personal pronouns where avoidable.
10. Honest > inflated. A precise small claim beats a vague big one.

STRONG VERBS (prefer these):
Built. Founded. Launched. Led. Designed. Engineered. Coordinated. Directed.
Authored. Researched. Analyzed. Modeled. Mentored. Trained. Taught. Tutored.
Organized. Hosted. Presented. Negotiated. Recruited. Mobilized. Published.
Raised. Generated. Grew. Expanded. Reduced. Optimized. Streamlined. Spearheaded.

WEAK VERBS (avoid):
Worked. Helped. Did. Was involved. Took part. Participated. Got. Made. Used. Tried.

NEVER FABRICATE:
- Numbers, percentages, dollar amounts, member counts, hours, awards
- Titles or roles the student didn't claim
- Outcomes or "impact" not stated in the source text
If the source has no number, write a strong qualitative phrase instead.
`;

// ── Single-entry rewrite ────────────────────────────────────────────────────

export function buildResumeImprovePrompt(
  text: string,
  mode: ResumeImproveMode,
  maxChars?: number
): string {
  if (mode === "activity") {
    // Common App-style short activity entry
    const titleLimit = 50;
    const descLimit = maxChars ?? 150;
    return `You are a top-tier college admissions advisor (think Harvard career office). A high school student needs you to polish ONE Common App activity entry.

INPUT (everything the student told you about this activity):
"""
${text}
"""

${VOICE_RULES}

OUTPUT REQUIREMENTS:

1. "shortVersion" — the activity name + role line. Max ${titleLimit} characters.
   Format: "Role, Organization" (e.g. "Co-Founder, Coding Outreach Initiative").
   If no clear role: just the organization/activity name.
   Title case. No period. Trim aggressively to fit.

2. "improved" — the activity description. Max ${descLimit} characters. HARD limit.
   Write as a dense single-line bullet, no full sentences.
   Structure: [Action verb] + [what] + [scope/scale if known] + [outcome/impact].
   Examples of what good looks like:
   - "Founded peer tutoring program serving 80+ underclassmen weekly; recruited and trained 12 student tutors."
   - "Led school robotics team to state semifinals; managed $4K budget and 15-member design subteam."
   - "Hosted weekly debate practice for novice members; coached 4 students to first regional placements."
   Count characters carefully. If over ${descLimit}, cut adverbs first, then adjectives, then secondary clauses.

3. "changes" — array of 1-3 short bullet strings explaining what you sharpened. Examples:
   - "Replaced 'helped with' with 'led'"
   - "Added concrete number from source"
   - "Cut redundant 'in order to' phrase"
   No apologies. No filler.

Return ONLY valid JSON. No markdown fences. Exact structure:
{
  "improved": "string (<= ${descLimit} chars)",
  "shortVersion": "string (<= ${titleLimit} chars)",
  "changes": ["string", "string"]
}`;
  }

  // mode === "description" — longer free-form resume bullet (used by per-field Improve buttons)
  const descLimit = maxChars ?? 240;
  return `You are a top-tier college admissions advisor polishing ONE resume bullet for a high school student.

INPUT:
"""
${text}
"""

${VOICE_RULES}

OUTPUT REQUIREMENTS:

1. "improved" — a single dense resume bullet. Max ${descLimit} characters.
   Must read like a top-tier resume line: action verb first, scope second, outcome last.
   Drop "I" and articles. No throat-clearing. No filler.
   If the source contains multiple distinct facts, separate them with semicolons, not new sentences.

2. "shortVersion" — a compressed Common App-length version of the same bullet. Max 150 characters.
   Same voice rules. Even tighter.

3. "changes" — array of 1-3 short bullets describing the sharpening (e.g. "Replaced passive voice", "Cut redundant clause").

Return ONLY valid JSON. No markdown fences. Exact structure:
{
  "improved": "string (<= ${descLimit} chars)",
  "shortVersion": "string (<= 150 chars)",
  "changes": ["string"]
}`;
}

// ── Bulk rewrite (Activities Helper auto-generation) ────────────────────────

export interface BulkActivityInput {
  readonly id: string;
  readonly source: string; // raw text describing this activity
}

export function buildBulkActivityPrompt(items: readonly BulkActivityInput[]): string {
  const itemsBlock = items
    .map((item, i) => `--- Item ${i + 1} (id: ${item.id}) ---\n${item.source}`)
    .join("\n\n");

  return `You are a top-tier college admissions advisor (think Harvard career office). A high school student needs polished Common App activity entries for ${items.length} activities. Polish all of them in one pass.

ACTIVITIES (each item is one activity, identified by id):
${itemsBlock}

${VOICE_RULES}

OUTPUT REQUIREMENTS:

For EACH activity, produce one entry containing:
- "id" — the exact id from the input
- "shortVersion" — activity name + role line. Max 50 characters. Format: "Role, Organization". No period.
- "improved" — dense single-line description. Max 150 characters. HARD limit. Action verb first.
   Structure: [Verb] + [what] + [scope] + [outcome]. No sentences. No filler.

CONSISTENCY RULES:
- Maintain a consistent voice across all entries. Same level of formality, same density.
- Vary action verbs across entries — don't start every entry with "Led".
- If two activities are similar, differentiate them by emphasizing different facts.
- Honor the 150-char limit per description. If over, cut adverbs first, then adjectives.

Return ONLY valid JSON. No markdown fences. Exact structure:
{
  "entries": [
    {
      "id": "string (matches input id)",
      "improved": "string (<= 150 chars)",
      "shortVersion": "string (<= 50 chars)"
    }
  ]
}`;
}
