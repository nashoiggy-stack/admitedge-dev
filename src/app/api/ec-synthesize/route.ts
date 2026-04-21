import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildProfileSynthesisPrompt } from "@/lib/ec-prompts";
import { withAnthropicRetry } from "@/lib/anthropic-retry";
// UNDO [opus-upgrade]: delete the ` as ANTHROPIC_MODEL` alias below to revert
// this endpoint to Sonnet — the variable name in the call site stays the same.
import { ANTHROPIC_MODEL_PREMIUM as ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import type {
  ActivityEvaluation,
  ProfileEvaluation,
} from "@/lib/extracurricular-types";

// Opus 4.6 on holistic EC synthesis can take 40-90s for large portfolios.
// 300 is the Vercel Pro max.
export const maxDuration = 300;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "You are a college admissions extracurricular evaluator. Return only valid JSON. No markdown fences.";

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export async function POST(req: NextRequest) {
  try {
    const { activities } = (await req.json()) as {
      activities: ActivityEvaluation[];
    };

    if (!activities?.length) {
      return NextResponse.json(
        { error: "No scored activities to synthesize." },
        { status: 400 }
      );
    }

    const summaries = activities.map((a) => ({
      activityName: a.activityName,
      category: a.category,
      tier: a.tier,
      scores: a.scores,
    }));

    const prompt = buildProfileSynthesisPrompt(summaries);

    const response = await withAnthropicRetry(() =>
      anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      })
    );

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "Profile synthesis response truncated." },
        { status: 500 }
      );
    }

    let profile: Omit<ProfileEvaluation, "activities">;
    try {
      profile = parseJsonResponse<Omit<ProfileEvaluation, "activities">>(raw);
    } catch (parseErr) {
      console.error("Synthesis JSON parse error:", parseErr);
      return NextResponse.json(
        { error: "The synthesizer returned malformed data. Please try again." },
        { status: 500 }
      );
    }

    const result: ProfileEvaluation = {
      activities,
      ...profile,
    };

    return NextResponse.json({ result });
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof Anthropic.APIError) {
      const body = err.error as { error?: { message?: string } } | undefined;
      message = `Anthropic ${err.status ?? 500}: ${body?.error?.message ?? err.message}`;
    }
    console.error("EC Synthesize error:", message);
    return NextResponse.json(
      { error: `Failed to synthesize profile: ${message.slice(0, 200)}` },
      { status: 500 }
    );
  }
}
