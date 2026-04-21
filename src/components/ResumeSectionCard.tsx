"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "text" | "textarea" | "checkbox";

export interface FieldSchema {
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly placeholder?: string;
  readonly improvable?: boolean; // shows "Improve" button for this field
}

interface Entry {
  readonly id: string;
  readonly source?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly [k: string]: any;
}

export type RecategoryTarget =
  | "activities"
  | "communityService"
  | "athletics"
  | "summerExperience"
  | "awards";

interface ResumeSectionCardProps<T extends Entry> {
  readonly title: string;
  readonly entries: readonly T[];
  readonly fields: readonly FieldSchema[];
  readonly onAdd: () => void;
  readonly onUpdate: (id: string, patch: Partial<T>) => void;
  readonly onRemove: (id: string) => void;
  readonly onMove: (id: string, dir: "up" | "down") => void;
  readonly onImprove?: (id: string, fieldKey: string, value: string) => void;
  readonly improvingKey?: string | null; // "id:field" key of the entry currently being improved
  readonly emptyLabel?: string;
  readonly extraHeaderAction?: React.ReactNode; // e.g. "Import from EC Evaluator" button
  readonly titleForEntry?: (e: T) => string;
  // Optional: lets the user reassign an entry to a different resume section.
  readonly currentSection?: RecategoryTarget;
  readonly onRecategorize?: (id: string, target: RecategoryTarget) => void;
}

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";

// ── Component ────────────────────────────────────────────────────────────────

const RECATEGORY_LABELS: Record<RecategoryTarget, string> = {
  activities: "Activities",
  communityService: "Community Service",
  athletics: "Athletics",
  summerExperience: "Summer Experience",
  awards: "Awards & Honors",
};

export function ResumeSectionCard<T extends Entry>({
  title,
  entries,
  fields,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onImprove,
  improvingKey,
  emptyLabel,
  extraHeaderAction,
  titleForEntry,
  currentSection,
  onRecategorize,
}: ResumeSectionCardProps<T>) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Auto-open newly added entries
  const entriesRef = React.useRef(entries);
  React.useEffect(() => {
    if (entries.length > entriesRef.current.length) {
      const newEntry = entries[entries.length - 1];
      setOpenId(newEntry.id);
      setCollapsed(false);
    }
    entriesRef.current = entries;
  }, [entries]);

  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
              collapsed ? "-rotate-90" : ""
            }`}
          />
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {entries.length}
          </span>
        </button>
        <div className="flex items-center gap-2">
          {extraHeaderAction}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
              setCollapsed(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Entries */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
            }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {entries.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[12px] text-zinc-600 italic text-center py-4"
                >
                  {emptyLabel ?? "No entries yet. Click Add to get started."}
                </motion.p>
              )}

              <AnimatePresence initial={false}>
              {entries.map((entry, idx) => {
                const isOpen = openId === entry.id;
                const entryTitle =
                  titleForEntry?.(entry) ||
                  (typeof entry[fields[0].key] === "string" && entry[fields[0].key]) ||
                  "New entry";

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, transform: "translateY(-4px)", height: 0 }}
                    animate={{ opacity: 1, transform: "translateY(0px)", height: "auto" }}
                    exit={{ opacity: 0, transform: "scale(0.97)", height: 0 }}
                    transition={{
                      layout: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
                      height: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
                      opacity: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
                      transform: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
                      default: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
                    }}
                    className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden"
                  >
                    {/* Entry header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <button
                        onClick={() => setOpenId(isOpen ? null : entry.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-zinc-600 shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
                            isOpen ? "" : "-rotate-90"
                          }`}
                        />
                        <span className="text-[13px] text-zinc-300 truncate">
                          {entryTitle}
                        </span>
                        {entry.source && (
                          <span className="text-[9px] uppercase tracking-wider text-blue-400/70 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5 shrink-0">
                            {entry.source}
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => onMove(entry.id, "up")}
                          disabled={idx === 0}
                          aria-label="Move up"
                          className="p-1 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-[background-color,color] duration-200"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onMove(entry.id, "down")}
                          disabled={idx === entries.length - 1}
                          aria-label="Move down"
                          className="p-1 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-[background-color,color] duration-200"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemove(entry.id)}
                          aria-label="Delete entry"
                          className="p-1 rounded hover:bg-red-500/15 text-zinc-500 hover:text-red-300 transition-[background-color,color] duration-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Fields */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
                            opacity: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/[0.04]">
                            {fields.map((f) => {
                              const value = entry[f.key] ?? "";
                              const improveKey = `${entry.id}:${f.key}`;
                              const isImproving = improvingKey === improveKey;
                              if (f.type === "checkbox") {
                                return (
                                  <label
                                    key={f.key}
                                    className="flex items-center gap-2 cursor-pointer select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) =>
                                        onUpdate(entry.id, { [f.key]: e.target.checked } as Partial<T>)
                                      }
                                      className="w-4 h-4 rounded border-white/20 bg-white/[0.03] accent-blue-500"
                                    />
                                    <span className="text-xs text-zinc-300">{f.label}</span>
                                  </label>
                                );
                              }
                              if (f.type === "textarea") {
                                return (
                                  <div key={f.key}>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-[11px] font-medium text-zinc-400">
                                        {f.label}
                                      </label>
                                      {f.improvable && onImprove && (
                                        <button
                                          onClick={() => onImprove(entry.id, f.key, String(value))}
                                          disabled={isImproving || !String(value).trim()}
                                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-300 hover:text-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-[color] duration-200"
                                        >
                                          <Sparkles className="w-3 h-3" />
                                          {isImproving ? "Improving..." : "Improve"}
                                        </button>
                                      )}
                                    </div>
                                    <textarea
                                      className={`${inputClass} resize-y min-h-[70px]`}
                                      rows={3}
                                      placeholder={f.placeholder}
                                      value={String(value)}
                                      onChange={(e) =>
                                        onUpdate(entry.id, { [f.key]: e.target.value } as Partial<T>)
                                      }
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div key={f.key}>
                                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                                    {f.label}
                                  </label>
                                  <input
                                    type="text"
                                    className={inputClass}
                                    placeholder={f.placeholder}
                                    value={String(value)}
                                    onChange={(e) =>
                                      onUpdate(entry.id, { [f.key]: e.target.value } as Partial<T>)
                                    }
                                  />
                                </div>
                              );
                            })}

                            {/* Move to another section */}
                            {currentSection && onRecategorize && (
                              <div className="pt-2 border-t border-white/[0.04]">
                                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                                  Move to section
                                </label>
                                <select
                                  value={currentSection}
                                  onChange={(e) =>
                                    onRecategorize(
                                      entry.id,
                                      e.target.value as RecategoryTarget
                                    )
                                  }
                                  className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                  {(
                                    Object.entries(RECATEGORY_LABELS) as [
                                      RecategoryTarget,
                                      string,
                                    ][]
                                  ).map(([k, label]) => (
                                    <option key={k} value={k}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
