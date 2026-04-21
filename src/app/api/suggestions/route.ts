import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSuggestionsPrompt,
  SUGGESTIONS_SYSTEM_PROMPT,
  FILTER_SYSTEM_PROMPT,
  type SuggestionFocus,
} from "@/lib/suggestions-prompt";
// UNDO [opus-upgrade]: delete the ` as ANTHROPIC_MODEL` alias below to revert
// this endpoint to Sonnet — the variable name in the call site stays the same.
import { ANTHROPIC_MODEL_PREMIUM as ANTHROPIC_MODEL } from "@/lib/anthropic-model";

// Opus 4.6 can exceed 60s on long essays with the full refined-alignment
// rules. Two-stage pipeline (Opus generate + Opus filter) needs headroom.
// 300 is the Vercel Pro max.
export const maxDuration = 300;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── JSON repair & parse helpers ─────────────────────────────────────────
// Shared across Stage 1 and Stage 2 parsing.

function repairJson(raw: string): string {
  let s = raw;
  s = s.replace(/,\s*([}\]])/g, "$1");
  s = s.replace(/"([^"]*?)"/g, (_match, inner: string) =>
    `"${inner.replace(/\n/g, "\\n")}"`
  );
  return s;
}

function tryParse(s: string): unknown | null {
  try { return JSON.parse(s); } catch { return null; }
}

interface Suggestion {
  type: string;
  original: string;
  replacement: string;
  reason: string;
}

/** Extract and normalize a suggestions payload from raw model text. */
function extractSuggestions(raw: string): { suggestions: Suggestion[] } {
  let text = raw.trim();

  // Strip markdown code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any = tryParse(text);

  if (parsed === null) parsed = tryParse(repairJson(text));

  if (parsed === null) {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) parsed = tryParse(objMatch[0]) ?? tryParse(repairJson(objMatch[0]));
  }

  if (parsed === null) {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const arr = tryParse(arrMatch[0]) ?? tryParse(repairJson(arrMatch[0]));
      if (arr !== null) parsed = { suggestions: arr };
    }
  }

  if (parsed === null) {
    console.error("All JSON parse attempts failed:", text.slice(0, 500));
    return { suggestions: [] };
  }

  // Normalize shape
  if (Array.isArray(parsed)) parsed = { suggestions: parsed };
  if (!parsed.suggestions && Array.isArray(parsed.Suggestions)) {
    parsed = { suggestions: parsed.Suggestions };
  }

  // Normalize type casing
  if (Array.isArray(parsed.suggestions)) {
    parsed.suggestions = parsed.suggestions.map(
      (s: { type?: string; [k: string]: unknown }) => ({
        ...s,
        type: typeof s.type === "string" ? s.type.toLowerCase() : s.type,
      })
    );
  }

  return { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] };
}

// ── Stage 1: Generate suggestions ───────────────────────────────────────

async function generateSuggestions(essayText: string, focus: SuggestionFocus): Promise<Suggestion[]> {
  const focusPrompt = buildSuggestionsPrompt(focus);
  const wordCount = essayText.split(/\s+/).filter(Boolean).length;

  // For Lower Word Count, tell the model the exact word count and target
  // so it knows how aggressive to be (models are bad at counting words).
  let userContent: string;
  if (focus === "Lower Word Count") {
    const wordsOver = Math.max(0, wordCount - 650);
    const target = wordCount > 650 ? "600-650" : wordCount > 550 ? "~600" : "preserve length";
    userContent = `This essay is currently ${wordCount} words${wordsOver > 0 ? ` (${wordsOver} words over the 650 limit)` : ""}. Target: ${target} words. You need to find cuts and rewrites that remove at least ${wordsOver > 0 ? wordsOver : "10-30"} words total.\n\nGenerate inline suggestions to reduce the word count.\n\n---\n${essayText}\n---`;
  } else {
    userContent = `Here is the essay to analyze. Generate inline suggestions focused on "${focus}".\n\n---\n${essayText}\n---`;
  }

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: `${SUGGESTIONS_SYSTEM_PROMPT}\n\n${focusPrompt}`,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractSuggestions(text).suggestions;
}

// ── Stage 2: Filter suggestions ─────────────────────────────────────────
// Uses Opus to validate and prune Stage 1 output — nuanced cross-category
// judgment benefits from the strongest model.

async function filterSuggestions(essayText: string, stage1: Suggestion[]): Promise<Suggestion[]> {
  if (stage1.length === 0) return [];

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: FILTER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `ORIGINAL ESSAY:\n---\n${essayText}\n---\n\nCANDIDATE SUGGESTIONS:\n${JSON.stringify({ suggestions: stage1 }, null, 2)}\n\nReturn only the suggestions that pass validation. Same JSON format.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractSuggestions(text).suggestions;
}

// ── Server-side original-text repair ─────────────────────────────────────
// The model frequently misquotes the essay: smart quotes vs straight quotes,
// collapsed whitespace, em-dashes vs hyphens, truncated passages, etc.
// This function tries progressively looser matching strategies to fix each
// suggestion's `original` field so it's an exact substring of the essay.

function normalizeText(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')   // smart double quotes
    .replace(/[\u2013\u2014]/g, "-")                 // en/em dashes
    .replace(/\u2026/g, "...")                        // ellipsis character
    .replace(/\s+/g, " ")                             // collapse whitespace
    .trim();
}

function repairOriginals(essayText: string, suggestions: Suggestion[]): Suggestion[] {
  const essayNorm = normalizeText(essayText);
  const result: Suggestion[] = [];

  for (const s of suggestions) {
    // Strategy 1: exact match — already good
    if (essayText.includes(s.original)) {
      result.push(s);
      continue;
    }

    // Strategy 2: normalized match — fix quotes/whitespace/dashes
    const origNorm = normalizeText(s.original);
    const normIdx = essayNorm.indexOf(origNorm);
    if (normIdx !== -1) {
      // Map the normalized index back to the original essay text
      const realOriginal = findRealSubstring(essayText, essayNorm, normIdx, origNorm.length);
      if (realOriginal) {
        result.push({ ...s, original: realOriginal });
        continue;
      }
    }

    // Strategy 3: case-insensitive normalized match
    const normIdxCI = essayNorm.toLowerCase().indexOf(origNorm.toLowerCase());
    if (normIdxCI !== -1) {
      const realOriginal = findRealSubstring(essayText, essayNorm, normIdxCI, origNorm.length);
      if (realOriginal) {
        result.push({ ...s, original: realOriginal });
        continue;
      }
    }

    // Strategy 4: first 60 chars match (model truncated the passage)
    if (origNorm.length > 60) {
      const prefix = origNorm.slice(0, 60);
      const prefixIdx = essayNorm.indexOf(prefix);
      if (prefixIdx !== -1) {
        // Find the end: look for the last 40 chars
        const suffix = origNorm.slice(-40);
        const suffixIdx = essayNorm.indexOf(suffix, prefixIdx);
        if (suffixIdx !== -1) {
          const endIdx = suffixIdx + suffix.length;
          const realOriginal = findRealSubstring(essayText, essayNorm, prefixIdx, endIdx - prefixIdx);
          if (realOriginal) {
            result.push({ ...s, original: realOriginal });
            continue;
          }
        }
      }
    }

    // No match found — drop this suggestion
    console.warn(`[suggestions] Dropped unmatched original (${s.original.slice(0, 50)}...)`);
  }

  return result;
}

/** Map a position+length in normalized text back to the original essay */
function findRealSubstring(original: string, normalized: string, normStart: number, normLen: number): string | null {
  // Walk through original text, tracking position in normalized space
  let origIdx = 0;
  let normIdx = 0;

  // Find the start position in the original
  while (normIdx < normStart && origIdx < original.length) {
    if (/\s/.test(original[origIdx])) {
      // Consume all whitespace in original = 1 space in normalized
      while (origIdx < original.length && /\s/.test(original[origIdx])) origIdx++;
      normIdx++; // the single space
    } else {
      origIdx++;
      normIdx++;
    }
  }
  const realStart = origIdx;

  // Find the end position
  let consumed = 0;
  while (consumed < normLen && origIdx < original.length) {
    if (/\s/.test(original[origIdx])) {
      while (origIdx < original.length && /\s/.test(original[origIdx])) origIdx++;
      consumed++; // single space in normalized
    } else {
      origIdx++;
      consumed++;
    }
  }

  const realEnd = origIdx;
  const sub = original.substring(realStart, realEnd);
  // Verify the extraction actually works
  return original.includes(sub) ? sub : null;
}

// ── Route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { essayText, focus } = (await req.json()) as {
      essayText: string;
      focus: SuggestionFocus;
    };

    if (!essayText?.trim()) {
      return NextResponse.json({ error: "No essay text provided." }, { status: 400 });
    }

    // Stage 1: Generate
    const stage1 = await generateSuggestions(essayText, focus);

    // Stage 2: Filter — skip for Lower Word Count (already tightly constrained,
    // and the second Opus call doubles latency causing client-side timeouts)
    let finalSuggestions: Suggestion[];
    if (focus === "Lower Word Count") {
      finalSuggestions = stage1;
    } else {
      try {
        const filtered = await filterSuggestions(essayText, stage1);

        if (filtered.length > 0) {
          finalSuggestions = filtered;
        } else {
          // Stage 2 returned empty — fallback to top 6 from Stage 1
          finalSuggestions = stage1.slice(0, 6);
        }
      } catch (filterErr) {
        // Stage 2 failed entirely — fallback to Stage 1 output
        console.error("Stage 2 filter failed, using Stage 1 output:", filterErr);
        finalSuggestions = stage1;
      }
    }

    // ── Server-side match repair ──────────────────────────────────────
    // The model often slightly misquotes the essay (smart quotes, extra
    // spaces, truncated text). Fix originals server-side so the client
    // filter doesn't silently drop them.
    const repaired = repairOriginals(essayText, finalSuggestions);
    console.log(`[suggestions] ${focus}: ${finalSuggestions.length} generated, ${repaired.length} matched`);

    return NextResponse.json({ suggestions: repaired });
  } catch (err) {
    console.error("Suggestions error:", err);
    return NextResponse.json(
      { error: "Something went wrong generating suggestions." },
      { status: 500 }
    );
  }
}
