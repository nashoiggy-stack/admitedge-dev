"use client";

import { useState, useRef } from "react";
import type { GradingResult } from "@/lib/types";
import { APP_CONFIG } from "@/data/mockData";

export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

interface UseChatReturn {
  readonly messages: ChatMessage[];
  readonly input: string;
  readonly loading: boolean;
  readonly chatEndRef: React.RefObject<HTMLDivElement | null>;
  readonly setInput: (value: string) => void;
  readonly send: (
    essayText: string,
    gradingResult: GradingResult
  ) => Promise<void>;
  readonly reset: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const send = async (essayText: string, gradingResult: GradingResult) => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(APP_CONFIG.chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          essayText: essayText || "(uploaded file)",
          gradingResult,
          history: messages,
        }),
      });

      const data = await res.json();
      setMessages([
        ...newMsgs,
        { role: "assistant", content: data.reply || data.error },
      ]);
    } catch {
      setMessages([
        ...newMsgs,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(
        () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    }
  };

  const reset = () => {
    setMessages([]);
    setInput("");
  };

  return { messages, input, loading, chatEndRef, setInput, send, reset };
}
