"use client";

import React from "react";
import { motion } from "motion/react";
import type { ChatMessage } from "@/hooks/useChat";
import { CHAT_SUGGESTIONS } from "@/data/mockData";

interface ChatTabProps {
  readonly messages: ChatMessage[];
  readonly input: string;
  readonly loading: boolean;
  readonly chatEndRef: React.RefObject<HTMLDivElement | null>;
  readonly onInputChange: (value: string) => void;
  readonly onSend: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  messages, input, loading, chatEndRef, onInputChange, onSend,
}) => (
  <motion.div
    key="chat"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
  >
    <p className="text-sm text-zinc-500 mb-4">
      Ask follow-up questions about your scores or how to improve.
    </p>

    {/* Messages */}
    <div className="mb-4 max-h-80 min-h-[140px] overflow-y-auto rounded-xl bg-[#0c0c1a]/90 border border-white/[0.04] p-4 space-y-3">
      {messages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-zinc-600 text-sm mb-3">No messages yet</p>
          <div className="flex flex-wrap justify-center gap-2">
            {CHAT_SUGGESTIONS.map((q) => (
              <motion.button
                key={q}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onInputChange(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-[#0c0c1a]/90 text-zinc-300 hover:bg-blue-500/15 hover:text-blue-300 transition-[border-color,box-shadow,background-color,color,opacity] duration-200"
              >
                {q}
              </motion.button>
            ))}
          </div>
        </div>
      )}
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
            msg.role === "user"
              ? "bg-blue-500/10 text-blue-200 ml-12"
              : "bg-[#0c0c1a]/90 border border-white/[0.06] text-zinc-300 mr-12"
          }`}
        >
          {msg.content}
        </motion.div>
      ))}
      {loading && (
        <div className="bg-[#0c0c1a]/90 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-zinc-500 italic mr-12">
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
            Thinking...
          </motion.span>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>

    {/* Input */}
    <div className="flex gap-2">
      <textarea
        className="flex-1 rounded-xl bg-[#0c0c1a]/90 border border-white/[0.06] p-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow,background-color,color,opacity] duration-200"
        rows={2}
        placeholder="Ask anything about your essay..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
        }}
      />
      <motion.button
        onClick={onSend}
        disabled={loading || !input.trim()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="self-end rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-[border-color,box-shadow,background-color,color,opacity] duration-200"
      >
        Send
      </motion.button>
    </div>
  </motion.div>
);
