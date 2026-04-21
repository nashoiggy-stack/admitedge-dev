"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useProfile } from "@/hooks/useProfile";
import { computeSATComposite, computeACTComposite } from "@/lib/profile-types";
import type { APScoreProfile } from "@/lib/profile-types";
import { EC_BAND_LABELS } from "@/lib/extracurricular-types";
import { AP_SUBJECTS } from "@/lib/ap-scores";
import { Plus, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";
const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-blue-400" />
      {source}
    </span>
  );
}

export default function ProfilePage() {
  const { profile, computed, loaded, updateField, updateSAT, updateACT, updateBasicInfo, resetToComputed } = useProfile();
  const bi = profile.basicInfo ?? { name: "", email: "", phone: "", school: "", graduationYear: "", address: "" };

  if (!loaded) {
    return (
      <AuroraBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      </AuroraBackground>
    );
  }

  const satComposite = computeSATComposite(profile.sat);
  const actComposite = computeACTComposite(profile.act);

  // Completeness: 6 sections, each 0/1
  const sections = [
    { key: "GPA", done: !!profile.gpaUW },
    { key: "Test", done: satComposite !== null || actComposite !== null },
    { key: "APs", done: profile.apScores.length > 0 },
    { key: "Essay", done: !!profile.essayCommonApp },
    { key: "ECs", done: !!profile.ecBand },
    { key: "Rigor", done: !!profile.rigor },
  ];
  const completed = sections.filter((s) => s.done).length;
  const total = sections.length;
  const pct = Math.round((completed / total) * 100);
  const completeMessage =
    completed === total
      ? "Your profile is complete. Every tool will use this data."
      : completed >= 4
      ? "Almost there — a few more fields for the best chance estimates."
      : completed >= 2
      ? "You're making progress. Keep filling sections as you go."
      : "Start with the basics — GPA and a test score unlock the most tools.";

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">Your Profile</span>
          </h1>
          <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
            Your scores and stats auto-fill from the tools you&apos;ve used. Edit anything here — it will be used across all tools.
          </p>
        </div>

        {/* Completeness Meter */}
        <ScrollReveal delay={0.03}>
          <div className="mb-8 rounded-2xl bg-[#0f0f1c] border border-white/[0.08] p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-1">Profile completeness</p>
                <p className="text-sm text-zinc-200">{completeMessage}</p>
              </div>
              <p className="font-mono tabular-nums text-2xl font-semibold text-white leading-none">
                {completed}<span className="text-zinc-600">/{total}</span>
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sections.map((s, i) => (
                <motion.span
                  key={s.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.4 + i * 0.05,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full transition-[background-color,color] duration-300 ${
                    s.done
                      ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25"
                      : "bg-white/[0.03] text-zinc-600 ring-1 ring-white/[0.05]"
                  }`}
                >
                  {s.done ? "✓ " : ""}{s.key}
                </motion.span>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Reset Button */}
        <ScrollReveal delay={0.05}>
          <div className="flex justify-end mb-6">
            <button
              onClick={resetToComputed}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-white/[0.06] rounded-lg px-3 py-1.5 hover:bg-white/[0.04] transition-[background-color,color] duration-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.87"/></svg>
              Reset to calculated values
            </button>
          </div>
        </ScrollReveal>

        {/* Basic Info — shared across resume + future tools */}
        <ScrollReveal delay={0.08}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Basic Info</h2>
              <span className="text-[10px] text-zinc-500">Used in Resume Helper</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={bi.name}
                  onChange={(e) => updateBasicInfo({ name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={bi.email}
                  onChange={(e) => updateBasicInfo({ email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={bi.phone}
                  onChange={(e) => updateBasicInfo({ phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Address (optional)</label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={bi.address}
                  onChange={(e) => updateBasicInfo({ address: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>School</label>
                <input
                  type="text"
                  placeholder="e.g. Lincoln High School"
                  value={bi.school}
                  onChange={(e) => updateBasicInfo({ school: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Graduation year</label>
                <input
                  type="text"
                  placeholder="e.g. 2026"
                  value={bi.graduationYear}
                  onChange={(e) => updateBasicInfo({ graduationYear: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* GPA Section */}
        <ScrollReveal delay={0.1}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">GPA</h2>
              {computed?.gpaUW && <SourceBadge source="GPA Calculator" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Unweighted GPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.0"
                  placeholder="e.g. 3.85"
                  value={profile.gpaUW}
                  onChange={(e) => updateField("gpaUW", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Weighted GPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5.0"
                  placeholder="e.g. 4.52"
                  value={profile.gpaW}
                  onChange={(e) => updateField("gpaW", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Course Rigor</label>
              <select
                value={profile.rigor}
                onChange={(e) => updateField("rigor", e.target.value as "low" | "medium" | "high")}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </ScrollReveal>

        {/* SAT Section */}
        <ScrollReveal delay={0.15}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">SAT</h2>
              {satComposite !== null && (
                <span className="text-sm font-mono text-zinc-300">
                  Composite: <span className="text-white font-bold">{satComposite}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Reading & Writing (200-800)</label>
                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="e.g. 720"
                  value={profile.sat.readingWriting}
                  onChange={(e) => updateSAT("readingWriting", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Math (200-800)</label>
                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="e.g. 780"
                  value={profile.sat.math}
                  onChange={(e) => updateSAT("math", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ACT Section */}
        <ScrollReveal delay={0.2}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">ACT</h2>
              {actComposite !== null && (
                <span className="text-sm font-mono text-zinc-300">
                  Composite: <span className="text-white font-bold">{actComposite}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>English (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 34"
                  value={profile.act.english}
                  onChange={(e) => updateACT("english", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Math (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 33"
                  value={profile.act.math}
                  onChange={(e) => updateACT("math", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Reading (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 35"
                  value={profile.act.reading}
                  onChange={(e) => updateACT("reading", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Science (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 32"
                  value={profile.act.science}
                  onChange={(e) => updateACT("science", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* AP Scores */}
        <ScrollReveal delay={0.22}>
          <APScoresSection
            apScores={profile.apScores ?? []}
            onUpdate={(scores) => updateField("apScores", scores)}
          />
        </ScrollReveal>

        {/* Essay Scores */}
        <ScrollReveal delay={0.25}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Essay Scores</h2>
              {computed?.essayCommonApp && <SourceBadge source="Essay Grader" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Common App Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 82"
                  value={profile.essayCommonApp}
                  onChange={(e) => updateField("essayCommonApp", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>VSPICE Composite (0-24)</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  placeholder="e.g. 18"
                  value={profile.essayVspice}
                  onChange={(e) => updateField("essayVspice", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Extracurriculars */}
        <ScrollReveal delay={0.3}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Extracurriculars</h2>
              {computed?.ecBand && <SourceBadge source="EC Evaluator" />}
            </div>
            <div>
              <label className={labelClass}>EC Band</label>
              <select
                value={profile.ecBand}
                onChange={(e) => updateField("ecBand", e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">Not evaluated yet</option>
                <option value="limited">Limited — few or inactive</option>
                <option value="developing">Developing — building depth</option>
                <option value="solid">Solid — active + some leadership</option>
                <option value="strong">Strong — clear theme + impact</option>
                <option value="exceptional">Exceptional — national/major impact</option>
              </select>
              <p className="mt-1.5 text-[10px] text-zinc-500">
                Auto-fills from EC Evaluator. You can also set this manually.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Summary Card */}
        <ScrollReveal delay={0.35}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06]">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Auto-Fill Summary</h2>
            <p className="text-xs text-zinc-500 mb-4">
              These values auto-fill into the College List Builder and Chance Calculator.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryItem label="UW GPA" value={profile.gpaUW || "—"} />
              <SummaryItem label="W GPA" value={profile.gpaW || "—"} />
              <SummaryItem label="SAT" value={satComposite !== null ? String(satComposite) : "—"} />
              <SummaryItem label="ACT" value={actComposite !== null ? String(actComposite) : "—"} />
              <SummaryItem label="Essay" value={profile.essayCommonApp ? `${profile.essayCommonApp}/100` : "—"} />
              <SummaryItem label="VSPICE" value={profile.essayVspice ? `${profile.essayVspice}/24` : "—"} />
              <SummaryItem label="ECs" value={profile.ecBand ? (EC_BAND_LABELS as Record<string, string>)[profile.ecBand] ?? profile.ecBand : "—"} />
              <SummaryItem label="Rigor" value={profile.rigor.charAt(0).toUpperCase() + profile.rigor.slice(1)} />
            </div>
          </div>
        </ScrollReveal>
      </main>
    </AuroraBackground>
  );
}

function APScoresSection({ apScores, onUpdate }: { apScores: APScoreProfile[]; onUpdate: (scores: APScoreProfile[]) => void }) {
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState<string>("5");
  const [expanded, setExpanded] = useState(apScores.length > 0);

  const addScore = () => {
    if (!subject.trim()) return;
    const s = parseInt(score) as 1 | 2 | 3 | 4 | 5;
    if (s < 1 || s > 5) return;
    onUpdate([...apScores, { subject: subject.trim(), score: s }]);
    setSubject("");
    setScore("5");
  };

  const removeScore = (index: number) => {
    onUpdate(apScores.filter((_, i) => i !== index));
  };

  return (
    <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">AP Exam Scores</h2>
          <p className="text-[10px] text-zinc-600 mt-0.5">Optional — saved to your profile and auto-filled into Chance Calculator</p>
        </div>
        {!expanded && (
          <button onClick={() => setExpanded(true)} className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {expanded && (
        <>
          {apScores.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {apScores.map((ap, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5">
                  <span className="flex-1 text-xs text-zinc-300 truncate">{ap.subject}</span>
                  <span className={`text-xs font-bold ${ap.score >= 4 ? "text-emerald-400" : ap.score === 3 ? "text-amber-400" : "text-zinc-500"}`}>{ap.score}</span>
                  <button onClick={() => removeScore(i)} className="text-zinc-600 hover:text-red-400 transition-colors p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              list="profile-ap-subjects"
              placeholder="AP Subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addScore(); } }}
              className={`${inputClass} flex-1`}
            />
            <datalist id="profile-ap-subjects">
              {AP_SUBJECTS.map((s) => <option key={s} value={s} />)}
            </datalist>
            <select
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={`${inputClass} w-16 appearance-none cursor-pointer`}
            >
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
            <button
              onClick={addScore}
              disabled={!subject.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";
  return (
    <div className="text-center">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${isEmpty ? "text-zinc-700" : "text-zinc-200"}`}>{value}</p>
    </div>
  );
}
