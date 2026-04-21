"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, X, Wand2, RotateCw } from "lucide-react";
import type { ActivityEntry } from "@/lib/resume-types";
import { COMMON_APP_LIMITS } from "@/lib/resume-types";

interface ActivitiesHelperPanelProps {
  readonly activities: readonly ActivityEntry[];
  readonly onApply: (id: string, patch: Partial<ActivityEntry>) => void;
}

interface ImproveResponse {
  readonly improved: string;
  readonly shortVersion: string;
  readonly changes: readonly string[];
}

interface BulkEntry {
  readonly id: string;
  readonly improved: string;
  readonly shortVersion: string;
}

interface BulkResponse {
  readonly entries: readonly BulkEntry[];
}

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSourceText(a: ActivityEntry): string {
  return [a.role, a.activityName, a.description, a.impact]
    .filter(Boolean)
    .join(" — ");
}

// ── Component ────────────────────────────────────────────────────────────────

export const ActivitiesHelperPanel: React.FC<ActivitiesHelperPanelProps> = ({
  activities,
  onApply,
}) => {
  // Per-activity generated results (id -> BulkEntry)
  const [bulkResults, setBulkResults] = useState<Record<string, BulkEntry>>({});
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Single-activity manual mode (kept as a fallback for empty state)
  const [draftText, setDraftText] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState("");
  const [singleResult, setSingleResult] = useState<ImproveResponse | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const hasActivities = activities.length > 0;
  const eligibleActivities = useMemo(
    () =>
      activities.filter((a) => buildSourceText(a).trim().length >= 5),
    [activities]
  );

  // ── Bulk generate ─────────────────────────────────────────────────────────

  const generateAll = async () => {
    if (eligibleActivities.length === 0 || bulkLoading) return;
    setBulkLoading(true);
    setBulkError("");
    setBulkResults({});
    setAppliedIds(new Set());

    try {
      const res = await fetch("/api/resume-bulk-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: eligibleActivities.map((a) => ({
            id: a.id,
            source: buildSourceText(a),
          })),
        }),
      });
      const data = (await res.json()) as BulkResponse | { error: string };

      if ("error" in data) {
        setBulkError(data.error);
        return;
      }

      const indexed: Record<string, BulkEntry> = {};
      for (const entry of data.entries) {
        indexed[entry.id] = entry;
      }
      setBulkResults(indexed);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBulkLoading(false);
    }
  };

  const regenerateOne = async (id: string) => {
    const source = activities.find((a) => a.id === id);
    if (!source || regeneratingId) return;
    setRegeneratingId(id);
    try {
      const res = await fetch("/api/resume-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: buildSourceText(source),
          mode: "activity",
          maxChars: COMMON_APP_LIMITS.descriptionMax,
        }),
      });
      const data = (await res.json()) as ImproveResponse | { error: string };
      if ("error" in data) {
        setBulkError(data.error);
        return;
      }
      setBulkResults((prev) => ({
        ...prev,
        [id]: { id, improved: data.improved, shortVersion: data.shortVersion },
      }));
      // If it was already applied, clear that flag so the user can re-apply
      setAppliedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setRegeneratingId(null);
    }
  };

  const applyOne = (id: string) => {
    const entry = bulkResults[id];
    if (!entry) return;
    onApply(id, {
      activityName: entry.shortVersion || activities.find((a) => a.id === id)?.activityName || "",
      description: entry.improved,
    });
    setAppliedIds((prev) => new Set(prev).add(id));
  };

  const applyAll = () => {
    for (const id of Object.keys(bulkResults)) {
      if (appliedIds.has(id)) continue;
      applyOne(id);
    }
  };

  const unappliedCount = Object.keys(bulkResults).length - appliedIds.size;

  // ── Single manual improve (fallback when no activities exist) ─────────────

  const runSingle = async () => {
    if (!draftText.trim() || singleLoading) return;
    setSingleLoading(true);
    setSingleError("");
    setSingleResult(null);
    try {
      const res = await fetch("/api/resume-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: draftText,
          mode: "activity",
          maxChars: COMMON_APP_LIMITS.descriptionMax,
        }),
      });
      const data = (await res.json()) as ImproveResponse | { error: string };
      if ("error" in data) {
        setSingleError(data.error);
        return;
      }
      setSingleResult(data);
    } catch (e) {
      setSingleError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setSingleLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Activities Helper</h2>
        <p className="text-[12px] text-zinc-500">
          Polish all Activities into Common App entries in one click. ~{COMMON_APP_LIMITS.activityNameMax} char titles, ~{COMMON_APP_LIMITS.descriptionMax} char descriptions. No fabrication — the advisor only uses facts from your entries.
        </p>
      </div>

      {/* ── Bulk flow: main entry point ──────────────────────────── */}
      {hasActivities && (
        <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-zinc-200">
                Generate all activities
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {eligibleActivities.length} activit{eligibleActivities.length === 1 ? "y" : "ies"} from your resume
              </p>
            </div>
            <button
              onClick={generateAll}
              disabled={bulkLoading || eligibleActivities.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-200"
            >
              <Wand2 className="w-4 h-4" />
              {bulkLoading ? "Generating..." : "Generate All"}
            </button>
          </div>

          {bulkError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-[12px] text-red-300">{bulkError}</p>
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {Object.keys(bulkResults).length > 0 && (
              <motion.div
                initial={{ opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-3 pt-2"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-medium">
                    {Object.keys(bulkResults).length} generated
                  </p>
                  {unappliedCount > 0 && (
                    <button
                      onClick={applyAll}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-3 py-1.5 text-[11px] font-semibold transition-[background-color] duration-200"
                    >
                      <Check className="w-3 h-3" />
                      Apply all ({unappliedCount})
                    </button>
                  )}
                </div>

                {eligibleActivities.map((a) => {
                  const entry = bulkResults[a.id];
                  if (!entry) return null;
                  const isApplied = appliedIds.has(a.id);
                  const isRegen = regeneratingId === a.id;
                  const shortLen = entry.shortVersion.length;
                  const descLen = entry.improved.length;

                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-4 transition-[border-color,background-color] duration-200 ${
                        isApplied
                          ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                          : "border-white/[0.05] bg-white/[0.02]"
                      }`}
                    >
                      {/* Title */}
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-medium truncate">
                          {a.activityName || "Untitled"}
                        </p>
                        <span
                          className={`text-[10px] font-mono tabular-nums shrink-0 ${
                            shortLen > COMMON_APP_LIMITS.activityNameMax ? "text-amber-400" : "text-zinc-600"
                          }`}
                        >
                          {shortLen}/{COMMON_APP_LIMITS.activityNameMax}
                        </span>
                      </div>
                      <p className="text-[13px] text-zinc-100 font-semibold mb-2">
                        {entry.shortVersion}
                      </p>

                      {/* Description */}
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-medium">
                          Description
                        </p>
                        <span
                          className={`text-[10px] font-mono tabular-nums shrink-0 ${
                            descLen > COMMON_APP_LIMITS.descriptionMax ? "text-amber-400" : "text-zinc-600"
                          }`}
                        >
                          {descLen}/{COMMON_APP_LIMITS.descriptionMax}
                        </span>
                      </div>
                      <p className="text-[13px] text-zinc-300 leading-snug mb-3">
                        {entry.improved}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!isApplied ? (
                          <button
                            onClick={() => applyOne(a.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-2.5 py-1 text-[11px] font-semibold transition-[background-color] duration-200"
                          >
                            <Check className="w-3 h-3" />
                            Apply
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 font-semibold">
                            <Check className="w-3 h-3" />
                            Applied
                          </span>
                        )}
                        <button
                          onClick={() => regenerateOne(a.id)}
                          disabled={isRegen}
                          className="inline-flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,color] duration-200"
                        >
                          <RotateCw className={`w-3 h-3 ${isRegen ? "animate-spin" : ""}`} />
                          {isRegen ? "Regenerating..." : "Regenerate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Single-activity fallback ─────────────────────────────── */}
      {!hasActivities && (
        <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-5 space-y-4">
          <p className="text-[12px] text-zinc-500">
            No activities in your resume yet. Add activities in Resume mode (or import from EC Evaluator), then come back here to generate Common App versions all at once.
          </p>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Or paste a single activity description
            </label>
            <textarea
              className={`${inputClass} resize-y min-h-[100px]`}
              rows={4}
              placeholder="Describe what you did. Role, actions, results, any numbers..."
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-zinc-600">{draftText.length} characters</p>
          </div>
          <button
            onClick={runSingle}
            disabled={singleLoading || draftText.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-200"
          >
            <Sparkles className="w-4 h-4" />
            {singleLoading ? "Generating..." : "Generate"}
          </button>
          {singleError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-[12px] text-red-300">{singleError}</p>
            </div>
          )}
          <AnimatePresence>
            {singleResult && (
              <motion.div
                initial={{ opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-3 rounded-xl bg-[#0c0c1a]/60 border border-blue-500/20 p-4"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-medium mb-1">Short title</p>
                  <p className="text-sm text-zinc-100 font-semibold">{singleResult.shortVersion}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-medium mb-1">Description</p>
                  <p className="text-sm text-zinc-200 leading-snug">{singleResult.improved}</p>
                </div>
                <button
                  onClick={() => setSingleResult(null)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 text-[11px] font-semibold transition-[background-color,color] duration-200"
                >
                  <X className="w-3 h-3" />
                  Discard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
};
