import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildECChatSystemPrompt } from "@/lib/ec-prompts";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, history, allActivities } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }

    const systemPrompt = buildECChatSystemPrompt(
      history ?? [],
      allActivities ?? []
    );

    const messages: { role: "user" | "assistant"; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("EC Chat error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
