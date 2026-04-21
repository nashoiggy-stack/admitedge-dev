"use client";

import React, { useState } from "react";
import type { College, DemographicBreakdown, GenderBreakdown } from "@/lib/college-types";

// ── Chart colors — accessible, distinguishable, consistent order ───────────

const DEMO_COLORS: { key: keyof DemographicBreakdown; label: string; color: string }[] = [
  { key: "white", label: "White", color: "#94a3b8" },        // slate-400
  { key: "asian", label: "Asian", color: "#60a5fa" },         // blue-400
  { key: "hispanic", label: "Hispanic/Latino", color: "#fbbf24" }, // amber-400
  { key: "black", label: "Black", color: "#34d399" },         // emerald-400
  { key: "multiracial", label: "Multiracial", color: "#c084fc" }, // purple-400
  { key: "international", label: "International", color: "#f472b6" }, // pink-400
  { key: "other", label: "Other", color: "#64748b" },         // slate-500
];

const GENDER_COLORS = {
  male: "#60a5fa",     // blue-400
  female: "#f472b6",   // pink-400
};

// ── SVG Donut chart ────────────────────────────────────────────────────────

interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

function DonutChart({
  slices,
  size = 140,
  strokeWidth = 22,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Build cumulative offsets
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  let accumulated = 0;
  const arcs = slices
    .filter((sl) => sl.value > 0)
    .map((sl) => {
      const fraction = sl.value / total;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const offset = -(accumulated * circumference) / total + circumference * 0.25;
      accumulated += sl.value;
      return { ...sl, dash, gap, offset, fraction };
    });

  const hoveredSlice = arcs.find((a) => a.key === hovered);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={hovered === arc.key ? strokeWidth + 4 : strokeWidth}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.offset}
            className="transition-[stroke-width] duration-150"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(arc.key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {/* Center label — shows hovered slice or total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {hoveredSlice ? (
          <div className="text-center">
            <p className="text-[15px] font-bold text-zinc-100 tabular-nums">
              {hoveredSlice.value}%
            </p>
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider leading-tight max-w-[60px]">
              {hoveredSlice.label}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────

function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {items
        .filter((it) => it.value > 0)
        .map((it) => (
          <div key={it.label} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-[10px] text-zinc-400 truncate">{it.label}</span>
            <span className="text-[10px] text-zinc-300 font-mono tabular-nums ml-auto shrink-0">
              {it.value}%
            </span>
          </div>
        ))}
    </div>
  );
}

// ── Gender bar ─────────────────────────────────────────────────────────────

function GenderBar({ gender }: { gender: GenderBreakdown }) {
  const male = gender.male ?? 0;
  const female = gender.female ?? 0;
  if (male === 0 && female === 0) return null;

  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1.5">
        Gender Ratio
      </p>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${male}%`, backgroundColor: GENDER_COLORS.male }}
        />
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${female}%`, backgroundColor: GENDER_COLORS.female }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-blue-300 font-mono tabular-nums">{male}% Male</span>
        <span className="text-[10px] text-pink-300 font-mono tabular-nums">{female}% Female</span>
      </div>
    </div>
  );
}

// ── Full demographics card for one college ─────────────────────────────────

interface DemographicsCardProps {
  readonly college: College;
}

export const DemographicsCard: React.FC<DemographicsCardProps> = ({ college }) => {
  const demo = college.demographics;
  const gender = college.genderBreakdown;
  const hasDemo = demo && Object.values(demo).some((v) => v != null && v > 0);
  const hasGender = gender && (gender.male ?? 0) + (gender.female ?? 0) > 0;

  // Build donut slices from demographic breakdown
  const slices: DonutSlice[] = hasDemo
    ? DEMO_COLORS.map((dc) => ({
        key: dc.key,
        label: dc.label,
        value: demo[dc.key] ?? 0,
        color: dc.color,
      })).filter((s) => s.value > 0)
    : [];

  const legendItems = slices.map((s) => ({
    label: s.label,
    value: s.value,
    color: s.color,
  }));

  return (
    <div className="rounded-xl bg-[#0f0f1c] border border-white/[0.06] p-4 space-y-4">
      {/* Header */}
      <div>
        <p className="text-[13px] font-semibold text-zinc-100 truncate">{college.name}</p>
        {college.undergradPopulation && (
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {college.undergradPopulation.toLocaleString()} undergrads
          </p>
        )}
      </div>

      {/* Racial/ethnic donut */}
      {hasDemo ? (
        <div className="flex flex-col items-center gap-3">
          <DonutChart slices={slices} size={130} strokeWidth={20} />
          <Legend items={legendItems} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[130px] rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[11px] text-zinc-500">Detailed breakdown not available</p>
        </div>
      )}

      {/* Gender bar */}
      {hasGender && <GenderBar gender={gender!} />}

      {/* Supporting metrics */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
        {college.percentInternational != null && (
          <MetricChip label="International" value={`${college.percentInternational}%`} />
        )}
        {college.inStatePercent != null && college.type === "public" && (
          <MetricChip label="In-State" value={`${college.inStatePercent}%`} />
        )}
        {college.diversityIndex && (
          <MetricChip label="Diversity" value={college.diversityIndex.charAt(0).toUpperCase() + college.diversityIndex.slice(1)} />
        )}
      </div>
    </div>
  );
};

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-[0.1em] text-zinc-500">{label}</p>
      <p className="text-[12px] font-semibold text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

// ── Demographics insights generator ─────────────────────────────────────────

export interface DemoInsight {
  readonly label: string;
  readonly collegeName: string;
  readonly detail: string;
}

export function generateDemographicInsights(colleges: readonly College[]): DemoInsight[] {
  const insights: DemoInsight[] = [];
  if (colleges.length < 2) return insights;

  // Most internationally diverse
  const withIntl = colleges.filter((c) => c.percentInternational != null);
  if (withIntl.length > 0) {
    const best = [...withIntl].sort((a, b) => (b.percentInternational ?? 0) - (a.percentInternational ?? 0))[0];
    insights.push({
      label: "Most internationally diverse",
      collegeName: best.name,
      detail: `${best.percentInternational}% international students`,
    });
  }

  // Most balanced gender ratio (closest to 50/50)
  const withGender = colleges.filter((c) => c.genderBreakdown?.male != null);
  if (withGender.length > 0) {
    const best = [...withGender].sort(
      (a, b) => Math.abs((a.genderBreakdown?.male ?? 50) - 50) - Math.abs((b.genderBreakdown?.male ?? 50) - 50),
    )[0];
    insights.push({
      label: "Most balanced gender ratio",
      collegeName: best.name,
      detail: `${best.genderBreakdown?.male}% male / ${best.genderBreakdown?.female}% female`,
    });
  }

  // Most diverse overall (highest non-white + non-international %)
  const withDemo = colleges.filter((c) => c.demographics != null);
  if (withDemo.length > 0) {
    const diversity = (c: College) => {
      const d = c.demographics!;
      return (d.asian ?? 0) + (d.hispanic ?? 0) + (d.black ?? 0) + (d.multiracial ?? 0);
    };
    const best = [...withDemo].sort((a, b) => diversity(b) - diversity(a))[0];
    insights.push({
      label: "Most diverse overall",
      collegeName: best.name,
      detail: `${diversity(best)}% non-white domestic students`,
    });
  }

  // Largest out-of-state body (for publics)
  const publics = colleges.filter((c) => c.type === "public" && c.inStatePercent != null);
  if (publics.length > 0) {
    const best = [...publics].sort((a, b) => (a.inStatePercent ?? 100) - (b.inStatePercent ?? 100))[0];
    if ((best.inStatePercent ?? 100) < 70) {
      insights.push({
        label: "Most national public school",
        collegeName: best.name,
        detail: `Only ${best.inStatePercent}% in-state — draws broadly`,
      });
    }
  }

  return insights.slice(0, 4);
}
