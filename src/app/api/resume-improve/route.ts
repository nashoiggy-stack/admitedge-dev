import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildResumeImprovePrompt, type ResumeImproveMode } from "@/lib/resume-prompts";
import { withAnthropicRetry } from "@/lib/anthropic-retry";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "You are a college admissions resume coach. Return only valid JSON. No markdown fences. Never fabricate facts.";

interface ImproveResponse {
  readonly improved: string;
  readonly shortVersion: string;
  readonly changes: readonly string[];
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export async function POST(req: NextRequest) {
  try {
    const { text, mode, maxChars } = (await req.json()) as {
      text?: string;
      mode?: ResumeImproveMode;
      maxChars?: number;
    };

    if (!text || text.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide at least a short description (5+ characters)." },
        { status: 400 }
      );
    }

    if (mode !== "activity" && mode !== "description") {
      return NextResponse.json(
        { error: "Invalid mode. Use 'activity' or 'description'." },
        { status: 400 }
      );
    }

    const prompt = buildResumeImprovePrompt(text.trim(), mode, maxChars);

    const response = await withAnthropicRetry(() =>
      anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 800,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      })
    );

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "Response was too long. Try with shorter input." },
        { status: 500 }
      );
    }

    let parsed: ImproveResponse;
    try {
      parsed = parseJsonResponse<ImproveResponse>(raw);
    } catch (parseErr) {
      console.error("Resume improve JSON parse error:", parseErr);
      console.error("Raw (first 300 chars):", raw.slice(0, 300));
      return NextResponse.json(
        { error: "The helper returned malformed data. Please try again." },
        { status: 500 }
      );
    }

    // Validate shape
    if (
      typeof parsed.improved !== "string" ||
      typeof parsed.shortVersion !== "string" ||
      !Array.isArray(parsed.changes)
    ) {
      return NextResponse.json(
        { error: "Unexpected response shape. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Resume improve error:", message);
    return NextResponse.json(
      { error: `Failed to improve text: ${message.slice(0, 120)}` },
      { status: 500 }
    );
  }
}
