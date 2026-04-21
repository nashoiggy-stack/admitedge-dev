"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ECConversation,
  ECMessage,
  ProfileEvaluation,
  ActivityEvaluation,
  ResumeCategory,
} from "@/lib/extracurricular-types";
import {
  EC_STORAGE_KEY,
  EC_ACTIVITIES_KEY,
  computeReadinessScore,
  bandFromScore,
} from "@/lib/extracurricular-types";
import { setItemAndNotify } from "@/lib/sync-event";

/**
 * Reconcile the band field with the computed readiness score.
 * ECResults.tsx displays bandFromScore(computeReadinessScore(...)) — the
 * saved result.band from the model can drift from this. Force them to
 * match so downstream tools (profile, chances, colleges) show the same
 * band as the EC evaluator UI.
 */
function reconcileBand(result: ProfileEvaluation): ProfileEvaluation {
  const score = computeReadinessScore({
    activities: result.activities,
    spikes: result.spikes,
  });
  return { ...result, band: bandFromScore(score) };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function deriveTitle(messages: ECMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Activity";
  const words = first.content.split(/\s+/).slice(0, 6).join(" ");
  return words.length < first.content.length ? `${words}...` : words;
}

export function useECEvaluator() {
  const [conversations, setConversations] = useState<ECConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [evalProgress, setEvalProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ProfileEvaluation | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved activities from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EC_ACTIVITIES_KEY);
      if (raw) {
        const saved: ECConversation[] = JSON.parse(raw);
        if (saved.length > 0) setConversations(saved);
      }
      const resultRaw = localStorage.getItem(EC_STORAGE_KEY);
      if (resultRaw) {
        // Reconcile on load so a stored result with a drifted band is fixed
        const parsed: ProfileEvaluation = JSON.parse(resultRaw);
        const reconciled = reconcileBand(parsed);
        setResult(reconciled);
        if (reconciled.band !== parsed.band) {
          setItemAndNotify(EC_STORAGE_KEY, JSON.stringify(reconciled));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save activities to localStorage on change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(EC_ACTIVITIES_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) ?? null;

  const startNewActivity = useCallback(() => {
    const id = generateId();
    const newConv: ECConversation = { id, messages: [], done: false, title: "New Activity" };
    setConversations((prev) => [...prev, newConv]);
    setActiveConvId(id);
    setChatInput("");
  }, []);

  const selectActivity = useCallback((id: string) => {
    setActiveConvId(id);
    setChatInput("");
  }, []);

  const removeActivity = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) setActiveConvId(null);
  }, [activeConvId]);

  const markDone = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: true } : c))
    );
    setActiveConvId(null);
  }, []);

  const reopenActivity = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: false } : c))
    );
    setActiveConvId(id);
  }, []);

  const toggleDisabled = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, disabled: !c.disabled } : c))
    );
  }, []);

  const setResumeCategory = useCallback((id: string, category: ResumeCategory) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resumeCategory: category } : c))
    );
  }, []);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !activeConvId || chatLoading) return;

    const userMsg: ECMessage = { role: "user", content: chatInput.trim() };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConvId) return c;
        const updatedMessages = [...c.messages, userMsg];
        return {
          ...c,
          messages: updatedMessages,
          title: c.messages.length === 0 ? deriveTitle(updatedMessages) : c.title,
        };
      })
    );
    setChatInput("");
    setChatLoading(true);

    try {
      const conv = conversations.find((c) => c.id === activeConvId);
      const history = conv ? [...conv.messages, userMsg] : [userMsg];
      const allActivities = conversations.map((c) => ({
        title: c.title,
        done: c.done,
      }));

      const res = await fetch("/api/ec-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: history.slice(0, -1), // don't double-send the last message
          allActivities,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        const assistantMsg: ECMessage = { role: "assistant", content: data.reply };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, messages: [...c.messages, assistantMsg] }
              : c
          )
        );
      }
    } catch {
      const errorMsg: ECMessage = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
      );
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatInput, activeConvId, chatLoading, conversations]);

  const evaluate = useCallback(async () => {
    const doneConvs = conversations.filter(
      (c) => c.done && c.messages.length > 0 && !c.disabled
    );
    if (doneConvs.length === 0) return;

    setEvaluating(true);
    setEvalError("");
    setEvalProgress({ done: 0, total: doneConvs.length });

    try {
      // Step 1: Evaluate each activity in parallel, updating progress as each completes
      let completed = 0;
      const activityPromises = doneConvs.map(async (conv) => {
        try {
          const res = await fetch("/api/ec-evaluate-activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation: conv }),
          });
          const data = await res.json();
          completed += 1;
          setEvalProgress({ done: completed, total: doneConvs.length });
          if (data.error) {
            return { ok: false as const, title: conv.title, error: data.error };
          }
          return { ok: true as const, activity: data.activity as ActivityEvaluation };
        } catch (e) {
          completed += 1;
          setEvalProgress({ done: completed, total: doneConvs.length });
          return {
            ok: false as const,
            title: conv.title,
            error: e instanceof Error ? e.message : "Network error",
          };
        }
      });

      const results = await Promise.all(activityPromises);
      const activities: ActivityEvaluation[] = [];
      const failures: string[] = [];
      for (const r of results) {
        if (r.ok) activities.push(r.activity);
        else failures.push(`"${r.title}": ${r.error.slice(0, 60)}`);
      }

      if (activities.length === 0) {
        setEvalError(`All activities failed to evaluate. ${failures[0] ?? ""}`);
        return;
      }

      if (failures.length > doneConvs.length / 2) {
        setEvalError(`${failures.length} of ${doneConvs.length} activities failed. Please try again.`);
        return;
      }

      // Step 2: Synthesize profile from the scored activities.
      // Retry client-side on overload/transient errors so users don't lose
      // their per-activity progress.
      let synthData: { result?: ProfileEvaluation; error?: string } | null = null;
      const synthMaxAttempts = 3;
      for (let attempt = 0; attempt < synthMaxAttempts; attempt++) {
        try {
          const synthRes = await fetch("/api/ec-synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activities }),
          });
          synthData = await synthRes.json();
          if (!synthData?.error) break;
          const isOverloaded = /overload|529|503|rate/i.test(synthData.error);
          if (!isOverloaded || attempt === synthMaxAttempts - 1) break;
          // Wait before retrying: 1s, 3s
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1) * 2));
        } catch (e) {
          if (attempt === synthMaxAttempts - 1) {
            synthData = { error: e instanceof Error ? e.message : "Network error" };
            break;
          }
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1) * 2));
        }
      }

      if (!synthData || synthData.error || !synthData.result) {
        setEvalError(
          synthData?.error
            ? `Claude was overloaded — your ${activities.length} activities are scored but the summary failed. Try evaluating again in a moment.`
            : "Synthesis failed. Please try again."
        );
        return;
      }

      const reconciled = reconcileBand(synthData.result);
      setResult(reconciled);
      setItemAndNotify(EC_STORAGE_KEY, JSON.stringify(reconciled));

      if (failures.length > 0) {
        setEvalError(
          `Note: ${failures.length} activit${failures.length === 1 ? "y" : "ies"} could not be evaluated and ${failures.length === 1 ? "was" : "were"} skipped.`
        );
      }
    } catch (e) {
      setEvalError(
        e instanceof Error
          ? `Failed to evaluate: ${e.message}`
          : "Failed to evaluate. Please try again."
      );
    } finally {
      setEvaluating(false);
      setEvalProgress(null);
    }
  }, [conversations]);

  const saveAll = useCallback(() => {
    try {
      setItemAndNotify(EC_ACTIVITIES_KEY, JSON.stringify(conversations));
      if (result) {
        setItemAndNotify(EC_STORAGE_KEY, JSON.stringify(result));
      }
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
      return true;
    } catch {
      return false;
    }
  }, [conversations, result]);

  const resetAll = useCallback(() => {
    setConversations([]);
    setActiveConvId(null);
    setResult(null);
    setChatInput("");
    setEvalError("");
    localStorage.removeItem(EC_ACTIVITIES_KEY);
    localStorage.removeItem(EC_STORAGE_KEY);
  }, []);

  const doneCount = conversations.filter((c) => c.done && !c.disabled).length;
  const disabledCount = conversations.filter((c) => c.disabled).length;

  return {
    conversations,
    activeConversation,
    activeConvId,
    chatInput,
    chatLoading,
    evaluating,
    evalError,
    evalProgress,
    result,
    doneCount,
    disabledCount,
    saveFlash,
    saveAll,
    chatEndRef,
    setChatInput,
    startNewActivity,
    selectActivity,
    removeActivity,
    markDone,
    reopenActivity,
    toggleDisabled,
    setResumeCategory,
    sendMessage,
    evaluate,
    resetAll,
  };
}
