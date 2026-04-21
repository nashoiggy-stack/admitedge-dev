import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { STRATEGY_SYSTEM_PROMPT, buildStrategyPrompt } from "@/lib/strategy-prompt";
import type { StrategyProfile, StrategyAnalysis, StrategyResult } from "@/lib/strategy-types";
// Strategy is reasoning-heavy and low-frequency — use Opus 4.6, same as
// essay grade / suggestions / ec-synthesize.
import { ANTHROPIC_MODEL_PREMIUM as ANTHROPIC_MODEL } from "@/lib/anthropic-model";

// Opus 4.6 on a 7-section reasoning task with ~3000 output tokens routinely
// takes 60-120s. 300 is the Vercel Pro max. If you hit this ceiling too, the
// next step is to trim the prompt (drop the raw profile block to just the
// analysis block) — it'll lose some personalization but cut latency ~40%.
export const maxDuration = 300;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface StrategyRequestBody {
  readonly profile: StrategyProfile;
  readonly analysis: StrategyAnalysis;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StrategyRequestBody;

    if (!body?.profile || !body?.analysis) {
      return NextResponse.json(
        { error: "Missing profile or analysis in request body." },
        { status: 400 },
      );
    }

    const userPrompt = buildStrategyPrompt(body.profile, body.analysis);

    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if the model wrapped the JSON
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let parsed: Omit<StrategyResult, "generatedAt">;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Failed to parse strategy JSON:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse strategy response. Please try again." },
        { status: 500 },
      );
    }

    const result: StrategyResult = {
      ...parsed,
      generatedAt: Date.now(),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Strategy error:", err);
    let status = 500;
    let message = "Something went wrong generating your strategy.";
    if (err instanceof Anthropic.APIError) {
      status = err.status ?? 500;
      const errBody = err.error as { error?: { message?: string } } | undefined;
      message = `Anthropic ${status}: ${errBody?.error?.message ?? err.message}`;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
