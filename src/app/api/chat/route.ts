import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildChatSystemPrompt } from "@/lib/prompts";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, essayText, gradingResult, history } = await req.json();

    if (!message || !essayText || !gradingResult) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const systemPrompt = buildChatSystemPrompt(
      essayText,
      JSON.stringify(gradingResult, null, 2)
    );

    // Build conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
