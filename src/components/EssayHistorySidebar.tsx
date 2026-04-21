"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SavedEssay } from "@/lib/types";

interface EssayHistorySidebarProps {
  readonly essays: SavedEssay[];
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onLoad: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onRename: (id: string, title: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-blue-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export const EssayHistorySidebar: React.FC<EssayHistorySidebarProps> = ({
  essays, isOpen, onToggle, onLoad, onDelete, onRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startRename = (essay: SavedEssay) => {
    setEditingId(essay.id);
    setEditTitle(essay.title);
  };

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Toggle button (always visible) */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="fixed right-4 top-20 z-40 rounded-xl bg-[#12121f] border border-white/[0.08] px-3 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15] transition-[background-color,color,border-color] duration-200 shadow-lg shadow-black/40 flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
        </svg>
        {essays.length > 0 && (
          <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
            {essays.length}
          </span>
        )}
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 z-40 bg-[#06060f]/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-[#0a0a14] border-l border-white/[0.06] shadow-2xl shadow-black/60 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-zinc-200">Saved Essays</h3>
              <button
                onClick={onToggle}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Essay list */}
            <div className="flex-1 overflow-y-auto">
              {essays.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-zinc-600 text-sm">No saved essays yet</p>
                  <p className="text-zinc-700 text-xs mt-1">
                    Grade an essay and click Save to keep it here
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {essays.map((essay, i) => (
                    <motion.div
                      key={essay.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group px-4 py-3 hover:bg-[#0c0c1a]/90 transition-colors border-b border-white/[0.03]"
                    >
                      {/* Title row */}
                      {editingId === essay.id ? (
                        <div className="flex gap-1.5 mb-1">
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }}
                            onBlur={commitRename}
                            className="flex-1 bg-white/[0.05] border border-blue-500/30 rounded-md px-2 py-0.5 text-xs text-zinc-200 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => onLoad(essay.id)}
                          className="w-full text-left"
                        >
                          <p className="text-sm font-medium text-zinc-300 truncate group-hover:text-blue-400 transition-colors">
                            {essay.title}
                          </p>
                        </button>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${scoreColor(essay.result.rawScore)}`}>
                            {essay.result.rawScore}
                          </span>
                          <span className="text-[10px] text-zinc-600">/100</span>
                          <span className="text-[10px] text-zinc-700">&middot;</span>
                          <span className="text-[10px] text-zinc-600">
                            {essay.result.wordCount}w
                          </span>
                          <span className="text-[10px] text-zinc-700">&middot;</span>
                          <span className="text-[10px] text-zinc-600">
                            {formatDate(essay.savedAt)}
                          </span>
                        </div>

                        {/* Actions (visible on hover) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRename(essay); }}
                            className="text-zinc-600 hover:text-zinc-300 p-0.5"
                            title="Rename"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>
                          {confirmDeleteId === essay.id ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(essay.id); setConfirmDeleteId(null); }}
                              className="text-red-400 text-[10px] font-semibold px-1"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(essay.id); }}
                              className="text-zinc-600 hover:text-red-400 p-0.5"
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
