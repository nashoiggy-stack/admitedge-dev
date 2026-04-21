import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildBulkActivityPrompt, type BulkActivityInput } from "@/lib/resume-prompts";
import { withAnthropicRetry } from "@/lib/anthropic-retry";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "You are a top-tier college admissions advisor. Return only valid JSON. No markdown fences. Never fabricate facts.";

interface BulkResponseEntry {
  readonly id: string;
  readonly improved: string;
  readonly shortVersion: string;
}

interface BulkResponse {
  readonly entries: readonly BulkResponseEntry[];
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

// Estimate ~250 tokens per activity in the response, plus 800 baseline.
// Hard cap at 8000 to fit within the 60s function budget for Sonnet.
function computeMaxTokens(itemCount: number): number {
  return Math.min(8000, Math.max(1500, 800 + itemCount * 250));
}

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items?: BulkActivityInput[] };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty 'items' array." },
        { status: 400 }
      );
    }

    if (items.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 activities per bulk request." },
        { status: 400 }
      );
    }

    // Validate each item has id and source
    for (const it of items) {
      if (!it.id || typeof it.source !== "string" || it.source.trim().length < 5) {
        return NextResponse.json(
          { error: "Each item must have id and source (5+ chars)." },
          { status: 400 }
        );
      }
    }

    const prompt = buildBulkActivityPrompt(items);
    const maxTokens = computeMaxTokens(items.length);

    const response = await withAnthropicRetry(() =>
      anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      })
    );

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (response.stop_reason === "max_tokens") {
      console.error(`Bulk improve truncated at ${maxTokens} tokens for ${items.length} items.`);
      return NextResponse.json(
        { error: "Response was too long. Try with fewer activities at once." },
        { status: 500 }
      );
    }

    let parsed: BulkResponse;
    try {
      parsed = parseJsonResponse<BulkResponse>(raw);
    } catch (parseErr) {
      console.error("Bulk improve JSON parse error:", parseErr);
      console.error("Raw (first 400 chars):", raw.slice(0, 400));
      return NextResponse.json(
        { error: "The helper returned malformed data. Please try again." },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.entries)) {
      return NextResponse.json(
        { error: "Unexpected response shape. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Bulk improve error:", message);
    return NextResponse.json(
      { error: `Failed to bulk improve: ${message.slice(0, 120)}` },
      { status: 500 }
    );
  }
}
