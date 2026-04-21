"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { College } from "@/lib/college-types";
import { CompareSection } from "./CompareVisuals";

// ── Types ──────────────────────────────────────────────────────────────────

interface QualField {
  readonly key: string;
  readonly label: string;
  readonly getTag: (c: College) => string | null;       // compact tag for collapsed view
  readonly getDetail: (c: College) => string | null;    // expanded description
}

// ── Tag label maps — strict definitions, no heuristics ────────────────────
// Tags are derived DIRECTLY from the qualitative classifications on College.
// Never from Tier3, never from vibeTags[0], never guessed.

const SOCIAL_SCENE_LABEL: Record<string, string> = {
  high: "Active",
  moderate: "Moderate",
  low: "Quiet / Niche",
};

const GREEK_ROLE_LABEL: Record<string, string> = {
  dominant: "Dominant",
  present: "Present",
  minimal: "Minimal",
};

const COLLAB_LABEL: Record<string, string> = {
  collaborative: "Collaborative",
  mixed: "Mixed",
  competitive: "Competitive",
};

const ARCHETYPE_LABEL: Record<string, string> = {
  preprofessional: "Preprofessional",
  intellectual: "Intellectual",
  balanced: "Balanced",
  entrepreneurial: "Entrepreneurial",
  "service-oriented": "Service-Oriented",
};

const VIBE_LABEL: Record<string, string> = {
  intense: "Intense",
  rigorous: "Rigorous",
  moderate: "Moderate",
  relaxed: "Relaxed",
};

const GRADE_LABEL: Record<string, string> = {
  deflation: "Grade Deflation",
  neutral: "Neutral",
  inflation: "Grade Inflation",
};

const SOCIAL_STYLE_LABEL: Record<string, string> = {
  "campus-centered": "Campus-Centered",
  "city-integrated": "City-Integrated",
  mixed: "Mixed",
};

const LOCATION_LABEL: Record<string, string> = {
  urban: "Urban",
  suburban: "Suburban",
  "college-town": "College Town",
  rural: "Rural",
};

const CLIMATE_LABEL: Record<string, string> = {
  "discussion-heavy": "Discussion-Heavy",
  "research-heavy": "Research-Heavy",
  "preprofessional-focused": "Career-Focused",
  balanced: "Balanced",
};

// Helper: read classification tag, fallback gracefully
function qTag(c: College, field: string, labelMap: Record<string, string>): string | null {
  const q = c.qualitative;
  if (!q) return null;
  const val = (q as unknown as Record<string, string>)[field];
  return val ? (labelMap[val] ?? val.charAt(0).toUpperCase() + val.slice(1)) : null;
}

// ── Campus fields ──────────────────────────────────────────────────────────

const CAMPUS_FIELDS: QualField[] = [
  {
    key: "socialScene",
    label: "Social Scene",
    getTag: (c) => qTag(c, "socialSceneType", SOCIAL_SCENE_LABEL),
    getDetail: (c) => c.campusDetails?.socialScene ?? null,
  },
  {
    key: "greekLife",
    label: "Greek Life",
    getTag: (c) => {
      // Show % when available, classification label as fallback
      if (c.greekLifePct != null && c.greekLifePct > 0) {
        const role = qTag(c, "greekLifeRole", GREEK_ROLE_LABEL);
        return `${c.greekLifePct}%${role ? ` · ${role}` : ""}`;
      }
      return qTag(c, "greekLifeRole", GREEK_ROLE_LABEL);
    },
    getDetail: (c) => c.campusDetails?.greekLife ?? null,
  },
  {
    key: "sportsCulture",
    label: "Sports Culture",
    getTag: (c) => {
      if (c.sportsCulture === "high") return "Game Day School";
      if (c.sportsCulture === "low") return "Minimal";
      return "Moderate";
    },
    getDetail: (c) => c.campusDetails?.sportsCulture ?? null,
  },
  {
    key: "socialStyle",
    label: "Social Style",
    getTag: (c) => qTag(c, "socialStyle", SOCIAL_STYLE_LABEL),
    getDetail: (c) => c.campusDetails?.housing ?? null,
  },
  {
    key: "environment",
    label: "Location Type",
    getTag: (c) => qTag(c, "locationType", LOCATION_LABEL),
    getDetail: (c) => c.campusDetails?.environment ?? null,
  },
];

const CULTURE_FIELDS: QualField[] = [
  {
    key: "academicVibe",
    label: "Academic Vibe",
    getTag: (c) => qTag(c, "academicVibe", VIBE_LABEL),
    getDetail: (c) => c.cultureDetails?.vibe ?? null,
  },
  {
    key: "collaboration",
    label: "Collaboration",
    getTag: (c) => qTag(c, "collaborationStyle", COLLAB_LABEL),
    getDetail: (c) => c.cultureDetails?.collaboration ?? null,
  },
  {
    key: "studentType",
    label: "Student Profile",
    getTag: (c) => qTag(c, "studentArchetype", ARCHETYPE_LABEL),
    getDetail: (c) => c.cultureDetails?.studentType ?? null,
  },
  {
    key: "gradeCulture",
    label: "Grade Culture",
    getTag: (c) => qTag(c, "gradeCulture", GRADE_LABEL),
    getDetail: (c) => c.cultureDetails?.academicCulture ?? null,
  },
  {
    key: "intellectualClimate",
    label: "Intellectual Climate",
    getTag: (c) => qTag(c, "intellectualClimate", CLIMATE_LABEL),
    getDetail: (c) => null, // no separate description — vibe covers this
  },
];

const LOCATION_FIELDS: QualField[] = [
  {
    key: "locationType",
    label: "Location Type",
    getTag: (c) => {
      // Primary: read from strict classification. Fallback: derive from setting.
      const q = c.qualitative?.locationType;
      if (q) return LOCATION_LABEL[q] ?? q;
      // Legacy fallback for schools without qualitative yet
      if (c.setting === "urban") return "Urban";
      if (c.setting === "suburban") return "Suburban";
      if (c.setting === "rural") return "Rural";
      return null;
    },
    getDetail: (c) => c.locationDetails?.cityIntegration ?? null,
  },
  {
    key: "internshipAccess",
    label: "Internship Access",
    getTag: (c) => {
      // Show distance to city as concrete data when available
      if (c.distanceToCityMiles != null) {
        if (c.distanceToCityMiles <= 5) return "In-city";
        return `${c.distanceToCityMiles} mi to metro`;
      }
      return c.internshipStrength === "high" ? "Strong" : c.internshipStrength === "low" ? "Limited" : "Moderate";
    },
    getDetail: (c) => c.locationDetails?.internshipAccess ?? null,
  },
  {
    key: "surroundings",
    label: "Surroundings",
    getTag: (c) => c.weather ?? null,
    getDetail: (c) => c.locationDetails?.surroundings ?? null,
  },
];

// ── Expandable qualitative row ─────────────────────────────────────────────

function QualRow({
  field,
  colleges,
}: {
  field: QualField;
  colleges: readonly College[];
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1.5">
        {field.label}
      </p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}
      >
        {colleges.map((c, i) => {
          const tag = field.getTag(c);
          const detail = field.getDetail(c);
          const isExpanded = expandedIdx === i;
          const hasDetail = detail != null && detail.length > 0;

          return (
            <div key={c.name} className="min-w-0">
              <button
                type="button"
                onClick={() => hasDetail && setExpandedIdx(isExpanded ? null : i)}
                disabled={!hasDetail}
                className={`w-full rounded-lg text-left transition-all duration-200 ${
                  hasDetail
                    ? "hover:bg-white/[0.04] cursor-pointer"
                    : "cursor-default"
                } ${
                  isExpanded
                    ? "bg-white/[0.03] ring-1 ring-white/[0.08]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                  <span className="text-[11px] text-zinc-200 font-medium truncate">
                    {tag ?? "—"}
                  </span>
                  {hasDetail && (
                    <ChevronDown
                      className={`w-3 h-3 text-zinc-600 shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                  )}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && hasDetail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
                      opacity: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
                    }}
                    className="overflow-hidden"
                  >
                    <p className="px-2.5 pb-2 text-[11px] text-zinc-400 leading-relaxed">
                      {detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section wrapper — composes CompareSection to avoid duplicating
//    the expand/collapse pattern ─────────────────────────────────────���───────

function QualSection({
  title,
  fields,
  colleges,
  defaultExpanded = true,
}: {
  title: string;
  fields: readonly QualField[];
  colleges: readonly College[];
  defaultExpanded?: boolean;
}) {
  return (
    <CompareSection title={title} defaultExpanded={defaultExpanded}>
      {/* Column headers */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}
      >
        {colleges.map((c) => (
          <p key={c.name} className="text-[10px] text-zinc-500 font-medium truncate px-2.5">
            {c.name.length > 20 ? c.name.split(" ").slice(0, 2).join(" ") : c.name}
          </p>
        ))}
      </div>
      {/* Rows */}
      {fields.map((f) => (
        <QualRow key={f.key} field={f} colleges={colleges} />
      ))}
    </CompareSection>
  );
}

// ── Public tab components ───────────────────────────────────────────────────

export function CampusTab({ colleges }: { colleges: readonly College[] }) {
  return (
    <div className="space-y-4">
      <QualSection title="Social & Residential" fields={CAMPUS_FIELDS} colleges={colleges} />
      <QualSection title="Location & Surroundings" fields={LOCATION_FIELDS} colleges={colleges} />
    </div>
  );
}

export function CultureTab({ colleges }: { colleges: readonly College[] }) {
  return (
    <div className="space-y-4">
      <QualSection title="Culture & Atmosphere" fields={CULTURE_FIELDS} colleges={colleges} />
      {/* Vibe tags as pill cloud */}
      <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] px-5 py-4">
        <p className="text-[12px] font-bold text-zinc-200 uppercase tracking-[0.12em] mb-3">
          Vibe Tags
        </p>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}
        >
          {colleges.map((c) => (
            <div key={c.name} className="space-y-1">
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                {c.name.length > 20 ? c.name.split(" ").slice(0, 2).join(" ") : c.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {(c.vibeTags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
