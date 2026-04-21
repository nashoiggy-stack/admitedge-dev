"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Bookmark, Plus, AlertCircle } from "lucide-react";
import { COLLEGES } from "@/data/colleges";
import type { College, PinnedCollege } from "@/lib/college-types";
import { PINNED_COLLEGES_KEY } from "@/lib/college-types";

interface CompareSelectorProps {
  readonly selected: readonly College[];
  readonly maxSlots?: number;
  readonly onAdd: (college: College) => void;
  readonly onRemove: (name: string) => void;
}

function readPinnedNames(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_COLLEGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PinnedCollege[];
    return parsed.map((p) => p.name);
  } catch {
    return [];
  }
}

/**
 * Match a search query against a college's name, aliases, state, and region.
 * Case-insensitive partial match.
 */
function matchesQuery(c: College, q: string): boolean {
  const lower = q.toLowerCase();
  if (c.name.toLowerCase().includes(lower)) return true;
  if (c.state.toLowerCase().includes(lower)) return true;
  if (c.region.toLowerCase().includes(lower)) return true;
  if (c.aliases) {
    for (const alias of c.aliases) {
      if (alias.toLowerCase().includes(lower)) return true;
    }
  }
  return false;
}

export const CompareSelector: React.FC<CompareSelectorProps> = ({
  selected,
  maxSlots = 4,
  onAdd,
  onRemove,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedNames = useMemo(() => new Set(selected.map((c) => c.name)), [selected]);
  const canAdd = selected.length < maxSlots;
  const atMax = selected.length >= maxSlots;

  // Close dropdown on outside click — mousedown on a backdrop overlay
  const closeDropdown = useCallback(() => setOpen(false), []);

  // Keyboard: Escape closes dropdown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeDropdown]);

  const results = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? COLLEGES.filter((c) => !selectedNames.has(c.name) && matchesQuery(c, q))
      : COLLEGES.filter((c) => !selectedNames.has(c.name));
    return filtered.slice(0, 8);
  }, [query, selectedNames]);

  const importPinned = () => {
    const pinnedNames = readPinnedNames();
    let added = 0;
    for (const name of pinnedNames) {
      if (selectedNames.has(name)) continue;
      if (selected.length + added >= maxSlots) break;
      const college = COLLEGES.find((c) => c.name === name);
      if (college) {
        onAdd(college);
        added++;
      }
    }
  };

  const handleSelect = (c: College) => {
    onAdd(c);
    setQuery("");
    if (selected.length + 1 >= maxSlots) {
      setOpen(false);
    } else {
      // Keep dropdown open and refocus for rapid adds
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected school slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <AnimatePresence mode="popLayout">
          {selected.map((c) => (
            <motion.div
              key={c.name}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="relative rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 group hover:border-white/[0.14] transition-[border-color] duration-200"
            >
              <button
                type="button"
                onClick={() => onRemove(c.name)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-[opacity,color,background-color] duration-200"
                aria-label={`Remove ${c.name}`}
              >
                <X className="w-3 h-3" />
              </button>
              <p className="text-[13px] font-semibold text-zinc-100 truncate pr-6">
                {c.name}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {c.state} · {c.acceptanceRate}%
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Empty slots */}
        {Array.from({ length: maxSlots - selected.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-xl border border-dashed border-white/[0.06] p-3 flex items-center justify-center min-h-[64px]"
          >
            <Plus className="w-4 h-4 text-zinc-600" />
          </div>
        ))}
      </div>

      {/* Max-reached banner */}
      {atMax && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <p className="text-[12px] text-amber-200">
            Maximum of {maxSlots} schools can be compared at once. Remove one to add another.
          </p>
        </motion.div>
      )}

      {/* Search + import */}
      <div className="flex gap-2" ref={containerRef}>
        <div className="relative flex-1">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 ${
              atMax
                ? "bg-[#0c0c1a]/60 border-white/[0.04] opacity-50 cursor-not-allowed"
                : "bg-[#0c0c1a] border-white/[0.06] focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/20"
            }`}
          >
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => {
                if (canAdd) setOpen(true);
              }}
              disabled={atMax}
              placeholder={
                atMax
                  ? `Maximum of ${maxSlots} schools selected`
                  : "Search by name, nickname, or state..."
              }
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none disabled:cursor-not-allowed"
            />
          </div>

          {/* Backdrop overlay — catches clicks outside the dropdown to close it.
              This prevents click-through to elements behind the dropdown. */}
          {open && canAdd && (
            <div
              className="fixed inset-0 z-40"
              onClick={closeDropdown}
              aria-hidden="true"
            />
          )}

          {/* Dropdown — fully solid, high z-index, blocks pointer events */}
          <AnimatePresence>
            {open && canAdd && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden z-50 max-h-[320px] overflow-y-auto"
                style={{ backgroundColor: "var(--bg-elevated, #0d0d1a)" }}
              >
                {results.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[12px] text-zinc-500">
                    No schools match &quot;{query}&quot;
                  </div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(c);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.06] active:bg-white/[0.08] transition-[background-color] duration-150 border-b border-white/[0.04] last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] text-zinc-100 truncate font-medium">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {c.state} · {c.acceptanceRate}% · {c.type}
                          {c.aliases && c.aliases.length > 0 && (
                            <span className="text-zinc-600">
                              {" "}· aka {c.aliases[0]}
                            </span>
                          )}
                        </p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Import pinned */}
        <button
          type="button"
          onClick={importPinned}
          disabled={atMax}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-3 py-2.5 text-[12px] font-semibold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Bookmark className="w-3.5 h-3.5" />
          Import pinned
        </button>
      </div>
    </div>
  );
};
