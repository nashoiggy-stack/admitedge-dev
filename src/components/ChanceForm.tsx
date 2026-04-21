"use client";

import React, { useState } from "react";
import type { ChanceInputs, ApplicationPlan } from "@/lib/college-types";
import type { College } from "@/lib/college-types";
// UNDO [application-plan]: remove APPLICATION_PLAN_LABELS and getApplicationOptions imports
import { APPLICATION_PLAN_LABELS } from "@/lib/college-types";
import { getApplicationOptions } from "@/lib/admissions";
import { AP_SUBJECTS } from "@/lib/ap-scores";
import { Plus, Trash2 } from "lucide-react";

interface ChanceFormProps {
  readonly inputs: ChanceInputs;
  readonly colleges: readonly College[];
  readonly onUpdate: <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => void;
  readonly onReset: () => void;
}

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

export const ChanceForm: React.FC<ChanceFormProps> = ({ inputs, colleges, onUpdate, onReset }) => {
  const [apSubjectInput, setApSubjectInput] = useState("");
  const [apScoreInput, setApScoreInput] = useState<string>("5");
  const [showApSection, setShowApSection] = useState(inputs.apScores.length > 0);

  const addApScore = () => {
    if (!apSubjectInput.trim()) return;
    const score = parseInt(apScoreInput) as 1 | 2 | 3 | 4 | 5;
    if (score < 1 || score > 5) return;
    onUpdate("apScores", [...inputs.apScores, { subject: apSubjectInput.trim(), score }]);
    setApSubjectInput("");
    setApScoreInput("5");
  };

  const removeApScore = (index: number) => {
    onUpdate("apScores", inputs.apScores.filter((_, i) => i !== index));
  };

  return (
  <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06]">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-bold text-zinc-200">Your Profile</h3>
      <button onClick={onReset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        Reset
      </button>
    </div>
    {(inputs.gpaUW || inputs.essayCommonApp) && (
      <p className="text-xs text-blue-400/70 mb-4">
        {inputs.gpaUW ? "GPA auto-filled from GPA Calculator. " : ""}
        {inputs.essayCommonApp ? "Essay scores auto-filled from Essay Grader." : ""}
      </p>
    )}

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {/* College selector */}
      <div className="col-span-2 sm:col-span-3">
        <label className={labelClass}>Select a College</label>
        <select
          className={selectClass}
          value={inputs.collegeIndex ?? ""}
          onChange={(e) => onUpdate("collegeIndex", e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">Choose a school...</option>
          {colleges.map((c, i) => (
            <option key={c.name} value={i}>
              {c.name} — {c.state} ({c.acceptanceRate}%)
            </option>
          ))}
        </select>
      </div>

      {/* UNDO [application-plan]: remove this entire block (the plan selector). */}
      {inputs.collegeIndex !== null && (() => {
        const selectedCollege = colleges[inputs.collegeIndex];
        if (!selectedCollege) return null;
        const options = getApplicationOptions(selectedCollege);
        if (options.length <= 1) {
          // Single option — render as a static chip rather than a dropdown.
          const only = options[0];
          return (
            <div className="col-span-2 sm:col-span-3">
              <label className={labelClass}>Application Plan</label>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm text-zinc-300">
                <span>{APPLICATION_PLAN_LABELS[only.type]}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  only option
                </span>
              </div>
            </div>
          );
        }
        const bindingNote = options.some((o) => o.binding);
        return (
          <div className="col-span-2 sm:col-span-3">
            <label className={labelClass}>Application Plan</label>
            <select
              className={selectClass}
              value={inputs.applicationPlan}
              onChange={(e) => onUpdate("applicationPlan", e.target.value as ApplicationPlan)}
            >
              {options.map((o) => (
                <option key={o.type} value={o.type}>
                  {APPLICATION_PLAN_LABELS[o.type]}
                  {o.binding ? " — binding" : ""}
                </option>
              ))}
            </select>
            {bindingNote && (
              <p className="mt-1 text-[10px] text-zinc-600">
                Binding plans require you to attend if admitted.
              </p>
            )}
          </div>
        );
      })()}
      {/* end UNDO [application-plan] */}

      {/* Stats */}
      <div>
        <label className={labelClass}>Unweighted GPA (4.0)</label>
        <input type="number" step="0.01" min="0" max="4.0" placeholder="e.g. 3.8"
          className={inputClass} value={inputs.gpaUW}
          onChange={(e) => onUpdate("gpaUW", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Weighted GPA (5.0)</label>
        <input type="number" step="0.01" min="0" max="5.0" placeholder="e.g. 4.3"
          className={inputClass} value={inputs.gpaW}
          onChange={(e) => onUpdate("gpaW", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>SAT (optional)</label>
        <input type="number" min="400" max="1600" placeholder="e.g. 1400"
          className={inputClass} value={inputs.sat}
          onChange={(e) => onUpdate("sat", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT Composite (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 32"
          className={inputClass} value={inputs.act}
          onChange={(e) => onUpdate("act", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT Science (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 30"
          className={inputClass} value={inputs.actScience}
          onChange={(e) => onUpdate("actScience", e.target.value)} />
        <p className="text-[10px] text-zinc-600 mt-1">Not included in composite</p>
      </div>

      {/* Qualitative */}
      <div>
        <label className={labelClass}>Course Rigor</label>
        <select className={selectClass} value={inputs.rigor}
          onChange={(e) => onUpdate("rigor", e.target.value as ChanceInputs["rigor"])}>
          <option value="low">Basic / On-level</option>
          <option value="medium">Some Honors/AP</option>
          <option value="high">Mostly AP/IB/DE</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Extracurricular Band</label>
        <select className={selectClass} value={inputs.ecBand}
          onChange={(e) => onUpdate("ecBand", e.target.value as ChanceInputs["ecBand"])}>
          <option value="">Not set</option>
          <option value="limited">Limited — few or inactive</option>
          <option value="developing">Developing — building depth</option>
          <option value="solid">Solid — active + some leadership</option>
          <option value="strong">Strong — clear theme + impact</option>
          <option value="exceptional">Exceptional — national/major impact</option>
        </select>
        <p className="mt-1 text-[10px] text-zinc-500">Auto-fills from EC Evaluator.</p>
      </div>
      <div>
        <label className={labelClass}>Common App Score (0-100)</label>
        <input type="number" min="0" max="100" placeholder="From Essay Grader"
          className={inputClass} value={inputs.essayCommonApp}
          onChange={(e) => onUpdate("essayCommonApp", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>VSPICE Score (0-24)</label>
        <input type="number" step="1" min="0" max="24" placeholder="From Essay Grader"
          className={inputClass} value={inputs.essayVspice}
          onChange={(e) => onUpdate("essayVspice", e.target.value)} />
      </div>
    </div>

    {/* AP Scores — optional */}
    <div className="mt-5 pt-5 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-300">AP Exam Scores</h4>
          <p className="text-[10px] text-zinc-600 mt-0.5">Optional — helps refine academic context</p>
        </div>
        {!showApSection && (
          <button
            onClick={() => setShowApSection(true)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add AP Scores
          </button>
        )}
      </div>

      {showApSection && (
        <>
          {/* Existing AP entries */}
          {inputs.apScores.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {inputs.apScores.map((ap, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5">
                  <span className="flex-1 text-xs text-zinc-300 truncate">{ap.subject}</span>
                  <span className={`text-xs font-bold ${ap.score >= 4 ? "text-emerald-400" : ap.score === 3 ? "text-amber-400" : "text-zinc-500"}`}>{ap.score}</span>
                  <button onClick={() => removeApScore(i)} className="text-zinc-600 hover:text-red-400 transition-colors p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new AP score */}
          <div className="flex gap-2">
            <input
              type="text"
              list="ap-subjects-list"
              placeholder="AP Subject..."
              value={apSubjectInput}
              onChange={(e) => setApSubjectInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addApScore(); } }}
              className={`${inputClass} flex-1`}
            />
            <datalist id="ap-subjects-list">
              {AP_SUBJECTS.map((s) => <option key={s} value={s} />)}
            </datalist>
            <select
              value={apScoreInput}
              onChange={(e) => setApScoreInput(e.target.value)}
              className={`${selectClass} w-16`}
            >
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
            <button
              onClick={addApScore}
              disabled={!apSubjectInput.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </>
      )}
    </div>
  </div>
  );
};
