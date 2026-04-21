"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card3D } from "./Card3D";
import { APP_CONFIG, LOADING_TEXT, UPLOAD_ACCEPT } from "@/data/mockData";

interface EssayInputProps {
  readonly essayText: string;
  readonly file: File | null;
  readonly dragging: boolean;
  readonly wordCount: number;
  readonly loading: boolean;
  readonly error: string;
  readonly errorCode?: string | null;
  readonly canRetry?: boolean;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onTextChange: (value: string) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDragLeave: () => void;
  readonly onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onOpenFilePicker: () => void;
  readonly onGrade: () => void;
  readonly onRetry?: () => void;
  readonly onClear: () => void;
}

export const EssayInput: React.FC<EssayInputProps> = ({
  essayText, file, dragging, wordCount, loading, error, errorCode, canRetry,
  fileInputRef, onTextChange, onDrop, onDragOver, onDragLeave,
  onFileChange, onOpenFilePicker, onGrade, onRetry, onClear,
}) => {
  const { min, max } = APP_CONFIG.idealWordRange;
  const inRange = wordCount >= min && wordCount <= max;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!essayText) return;
    try {
      await navigator.clipboard.writeText(essayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API blocked (insecure context, etc.) — fall back silently
    }
  };

  return (
    <Card3D className="glass rounded-2xl p-6 sm:p-8" glowColor="rgba(99, 102, 241, 0.12)">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <label className="text-sm font-medium text-zinc-300">Your essay</label>
        <div className="flex items-center gap-2">
          {essayText && (
            <motion.button
              onClick={handleCopy}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1 transition-[background-color,color,box-shadow] duration-200 ${
                copied
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                  : "bg-[#0c0c1a]/90 text-zinc-400 ring-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.05]"
              }`}
              title="Copy essay to clipboard"
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </motion.button>
          )}
          {essayText && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-mono px-2.5 py-1 rounded-full ${
                inRange
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
              }`}
            >
              {wordCount} words
              {inRange ? " — ideal" : wordCount < min ? ` — ${min - wordCount} short` : ` — ${wordCount - max} over`}
            </motion.span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        className="w-full rounded-xl bg-[#0c0c1a]/90 border border-white/[0.06] p-4 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none resize-y transition-[border-color,box-shadow,background-color,color] duration-200 min-h-[60vh]"
        rows={30}
        placeholder="Paste your Common App essay here..."
        value={essayText}
        onChange={(e) => onTextChange(e.target.value)}
      />

      {/* Drop zone */}
      <motion.div
        className={`mt-4 flex items-center justify-center rounded-xl border-2 border-dashed p-5 transition-[border-color,box-shadow,background-color,color] duration-200 cursor-pointer ${
          dragging ? "border-blue-500 bg-blue-500/10" : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onOpenFilePicker}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={onFileChange}
        />
        <p className="text-sm text-zinc-400">
          {file ? (
            <><span className="font-medium text-blue-400">{file.name}</span> selected</>
          ) : (
            <><span className="font-medium text-blue-400">Click to upload</span> or drag & drop PDF / Word doc</>
          )}
        </p>
      </motion.div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <motion.button
          onClick={onGrade}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="relative rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600 pointer-events-none"
            animate={{ backgroundPosition: loading ? ["0% 50%", "200% 50%"] : "0% 50%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: "200% 100%" }}
          />
          <span className="relative z-10 flex items-center gap-2">
            {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? "Analyzing..." : "Grade Essay"}
          </span>
        </motion.button>
        <button
          onClick={onClear}
          className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-[border-color,box-shadow,background-color,color] duration-200"
        >
          Clear
        </button>
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 glass rounded-xl p-5 overflow-hidden animate-pulse-glow"
          >
            <p className="text-sm text-blue-300 font-medium">{LOADING_TEXT}</p>
            <div className="mt-3 h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full bg-blue-500/50 rounded-full shimmer w-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-red-300">{error}</p>
                {errorCode && errorCode !== "EMPTY_INPUT" && (
                  <p className="mt-1 text-[10px] text-red-400/60 font-mono tabular-nums">
                    Error: {errorCode}
                  </p>
                )}
              </div>
              {canRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 px-3 py-1.5 text-xs font-semibold transition-[background-color] duration-200"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.87"/>
                  </svg>
                  Try again
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card3D>
  );
};
