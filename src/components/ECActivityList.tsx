"use client";

import React from "react";
import { motion } from "motion/react";
import { Plus, Trash2, MessageSquare, Check, EyeOff, Eye } from "lucide-react";
import type { ECConversation, ResumeCategory } from "@/lib/extracurricular-types";
import { RESUME_CATEGORY_LABELS } from "@/lib/extracurricular-types";

interface ECActivityListProps {
  readonly conversations: ECConversation[];
  readonly activeConvId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onAdd: () => void;
  readonly onToggleDisabled?: (id: string) => void;
  readonly onSetResumeCategory?: (id: string, category: ResumeCategory) => void;
}

export const ECActivityList: React.FC<ECActivityListProps> = ({
  conversations,
  activeConvId,
  onSelect,
  onRemove,
  onAdd,
  onToggleDisabled,
  onSetResumeCategory,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-semibold">
          Activities ({conversations.length})
        </h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-[background-color,color,border-color,opacity] duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Activity
        </button>
      </div>

      {conversations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-zinc-500 text-sm mb-3">No activities yet</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-[background-color,color,border-color,opacity] duration-200"
          >
            <Plus className="w-4 h-4" />
            Describe Your First Activity
          </button>
        </div>
      )}

      <div className="space-y-2">
        {conversations.map((conv) => {
          const isActive = conv.id === activeConvId;
          const isDisabled = !!conv.disabled;
          const msgCount = conv.messages.filter((m) => m.role === "user").length;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group relative rounded-xl border p-3 cursor-pointer transition-[background-color,color,border-color,opacity] duration-200 ${
                isDisabled
                  ? "border-white/[0.04] bg-white/[0.01] opacity-50 hover:opacity-70"
                  : isActive
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isDisabled ? (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    ) : conv.done ? (
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                    <span className={`text-sm font-medium truncate ${isDisabled ? "text-zinc-500 line-through decoration-zinc-700" : "text-white"}`}>
                      {conv.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>{msgCount} message{msgCount !== 1 ? "s" : ""}</span>
                    {isDisabled ? (
                      <span className="text-zinc-600">Excluded from evaluation</span>
                    ) : conv.done ? (
                      <span className="text-green-400/70">Ready to evaluate</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-[opacity] duration-200">
                  {onToggleDisabled && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleDisabled(conv.id); }}
                      aria-label={isDisabled ? "Re-enable activity" : "Disable activity"}
                      title={isDisabled ? "Re-enable this activity" : "Disable — keep but skip in evaluation"}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-[background-color,color] duration-200"
                    >
                      {isDisabled
                        ? <Eye className="w-3.5 h-3.5" />
                        : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(conv.id); }}
                    aria-label="Delete activity"
                    className="p-1 rounded-lg hover:bg-red-500/15 text-zinc-500 hover:text-red-300 transition-[background-color,color] duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Resume category picker — sorts this activity into the right resume section */}
              {onSetResumeCategory && !isDisabled && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 pt-2.5 border-t border-white/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 font-medium shrink-0">
                      Resume section
                    </span>
                    <select
                      value={conv.resumeCategory ?? "auto"}
                      onChange={(e) =>
                        onSetResumeCategory(conv.id, e.target.value as ResumeCategory)
                      }
                      className="flex-1 min-w-0 text-[11px] bg-[#0c0c1a]/90 border border-white/[0.08] rounded-md px-2 py-1 text-zinc-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200 appearance-none cursor-pointer"
                    >
                      {(Object.entries(RESUME_CATEGORY_LABELS) as [ResumeCategory, string][]).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
