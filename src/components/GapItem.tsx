"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, AlertCircle, Info, Plus } from "lucide-react";
import type { WeaknessFlag, WeaknessSeverity } from "@/lib/strategy-types";

const SEVERITY_STYLES: Record<
  WeaknessSeverity,
  { icon: React.ElementType; text: string; bg: string; ring: string; label: string }
> = {
  critical: {
    icon: AlertCircle,
    text: "text-red-300",
    bg: "bg-red-500/[0.06]",
    ring: "ring-red-500/30",
    label: "Critical",
  },
  high: {
    icon: AlertTriangle,
    text: "text-orange-300",
    bg: "bg-orange-500/[0.06]",
    ring: "ring-orange-500/30",
    label: "High",
  },
  medium: {
    icon: AlertTriangle,
    text: "text-amber-300",
    bg: "bg-amber-500/[0.05]",
    ring: "ring-amber-500/25",
    label: "Medium",
  },
  low: {
    icon: Info,
    text: "text-blue-300",
    bg: "bg-blue-500/[0.05]",
    ring: "ring-blue-500/25",
    label: "Low",
  },
};

interface GapItemProps {
  readonly flag: WeaknessFlag;
  readonly fixSuggestion?: string | null;
}

/**
 * Expandable gap row. Collapsed shows label + severity pill. Expanded shows
 * the full `detail` from the analyzer (which already references user data)
 * plus an optional `fixSuggestion` from the LLM narrative bullets.
 */
export const GapItem: React.FC<GapItemProps> = ({ flag, fixSuggestion }) => {
  const [open, setOpen] = useState(false);
  const style = SEVERITY_STYLES[flag.severity];
  const Icon = style.icon;

  return (
    <div
      className={`rounded-xl border border-white/[0.05] overflow-hidden transition-[border-color] duration-200 hover:border-white/[0.12]`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ring-1 ${style.ring}`}
        >
          <Icon className={`w-3.5 h-3.5 ${style.text}`} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-zinc-100 truncate">
              {flag.label}
            </p>
            <span
              className={`text-[9px] uppercase tracking-[0.12em] font-semibold ${style.text} shrink-0`}
            >
              {style.label}
            </span>
          </div>
        </div>
        <Plus
          className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
            open ? "rotate-45" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
            }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.04] space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1">
                  Why this matters
                </p>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{flag.detail}</p>
              </div>
              {fixSuggestion && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-400/80 font-semibold mb-1">
                    Fix
                  </p>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">
                    {fixSuggestion}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
