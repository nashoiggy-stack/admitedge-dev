"use client";

import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

interface ActionChecklistProps {
  readonly items: readonly string[];
  readonly isDone: (index: number) => boolean;
  readonly onToggle: (index: number) => void;
}

/**
 * Interactive checkbox list for the Action Plan card. Each item strikes
 * through + dims when checked. Completion state is persisted by the parent
 * via useActionChecklist.
 */
export const ActionChecklist: React.FC<ActionChecklistProps> = ({
  items,
  isDone,
  onToggle,
}) => {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const done = isDone(i);
        return (
          <motion.li
            key={i}
            layout
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <button
              type="button"
              onClick={() => onToggle(i)}
              aria-pressed={done}
              className={`w-full flex items-start gap-3 text-left rounded-xl p-3 transition-[background-color] duration-200 ${
                done
                  ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.06]"
                  : "bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-[background-color,border-color] duration-200 ${
                  done
                    ? "bg-emerald-500/30 border-emerald-400/50"
                    : "bg-transparent border-white/[0.15]"
                }`}
              >
                {done && <Check className="w-3.5 h-3.5 text-emerald-200" strokeWidth={3} />}
              </span>
              <span
                className={`text-[13px] leading-relaxed transition-[color] duration-200 ${
                  done ? "text-zinc-500 line-through" : "text-zinc-200"
                }`}
              >
                {item}
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
};
