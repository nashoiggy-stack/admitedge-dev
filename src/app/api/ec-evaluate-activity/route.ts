import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSingleActivityPrompt } from "@/lib/ec-prompts";
import { withAnthropicRetry } from "@/lib/anthropic-retry";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import type {
  ECConversation,
  ActivityEvaluation,
} from "@/lib/extracurricular-types";

export const maxDuration = 60;
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
    const { conversation } = (await req.json()) as {
      conversation: ECConversation;
    };

    if (!conversation?.messages?.length) {
      return NextResponse.json(
        { error: "No activity to evaluate." },
        { status: 400 }
      );
    }

    const prompt = buildSingleActivityPrompt(conversation);

    const response = await withAnthropicRetry(() =>
      anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      })
    );

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          error: `Activity "${conversation.title}" response truncated. The description may be too long.`,
        },
        { status: 500 }
      );
    }

    let activity: ActivityEvaluation;
    try {
      activity = parseJsonResponse<ActivityEvaluation>(raw);
    } catch (parseErr) {
      console.error("Single activity JSON parse error:", parseErr);
      console.error("Raw (first 300):", raw.slice(0, 300));
      return NextResponse.json(
        {
          error: `The evaluator returned malformed data for "${conversation.title}". Please try again.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ activity });
  } catch (err) {
    // Surface the real Anthropic error body so the client can show it
    let message = err instanceof Error ? err.message : String(err);
    let status = 500;
    if (err instanceof Anthropic.APIError) {
      status = err.status ?? 500;
      // Prefer the structured error message when available
      const body = err.error as { error?: { message?: string } } | undefined;
      const apiMessage = body?.error?.message ?? err.message;
      message = `Anthropic ${status}: ${apiMessage}`;
    }
    console.error("EC Activity error:", message);
    return NextResponse.json(
      { error: `Failed to evaluate activity: ${message.slice(0, 200)}` },
      { status: 500 }
    );
  }
}
