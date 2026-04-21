"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, Search } from "lucide-react";
import { COLLEGES } from "@/data/colleges";

interface DreamSchoolSelectorProps {
  readonly dreamSchool: string | null;
  readonly onChange: (name: string | null) => void;
}

/**
 * Search-as-you-type picker for the user's single dream school. Searches
 * the college database by name/state/region. Selecting a school stores it
 * via onChange; clearing removes it. Keeps itself compact when no school
 * is selected.
 */
export const DreamSchoolSelector: React.FC<DreamSchoolSelectorProps> = ({
  dreamSchool,
  onChange,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return COLLEGES.slice(0, 8);
    const q = query.trim().toLowerCase();
    return COLLEGES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    ).slice(0, 10);
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      {dreamSchool ? (
        // Selected state — compact chip with clear button
        <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] to-blue-500/[0.04] border border-blue-500/25 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-blue-200" fill="currentColor" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-blue-300/80 font-semibold mb-0.5">
              Your Dream School
            </p>
            <p className="text-base sm:text-lg font-semibold text-white truncate">
              {dreamSchool}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear dream school"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Empty state — search input
        <div>
          <div className="flex items-center gap-2 rounded-2xl bg-[#0f0f1c] border border-white/[0.08] px-4 py-3.5 focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/20 transition-[border-color,box-shadow] duration-200">
            <Star className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search your dream school..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
            />
            <Search className="w-4 h-4 text-zinc-600 shrink-0" strokeWidth={1.5} />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 px-1">
            Pick the one school that matters most. The Strategy Engine will give it a dedicated
            ED/EA decision with specific reasoning.
          </p>
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {!dreamSchool && open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-[#0c0c1a] border border-white/[0.08] shadow-[0_24px_48px_rgba(0,0,0,0.5)] overflow-hidden z-20 max-h-[360px] overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-zinc-500">No schools match &quot;{query}&quot;</p>
              </div>
            ) : (
              results.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    onChange(c.name);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-100 truncate font-medium">{c.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {c.state} · {c.acceptanceRate}% acceptance · {c.type}
                    </p>
                  </div>
                  <Star className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
