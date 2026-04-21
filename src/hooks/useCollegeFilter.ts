"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { COLLEGES } from "@/data/colleges";
import type { CollegeFilters, ClassifiedCollege } from "@/lib/college-types";
import { EMPTY_FILTERS as DEFAULT_FILTERS } from "@/lib/college-types";
import { classifyCollege } from "@/lib/admissions";
import { getMajorMatch, MAJOR_MATCH_RANK } from "@/lib/major-match";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";
import { setItemAndNotify } from "@/lib/sync-event";

export function useCollegeFilter() {
  const [filters, setFilters] = useState<CollegeFilters>(DEFAULT_FILTERS);

  // ── Auto-fill from profile + source keys (direct read) ─────────────────
  const fillFromSources = useCallback(() => {
    try {
      const raw = localStorage.getItem("admitedge-profile");
      const p = raw ? JSON.parse(raw) : {};

      // Direct reads from source tools
      let essayCA = p.essayCommonApp || "";
      let essayV = p.essayVspice || "";
      try {
        const er = localStorage.getItem("essay-grader-result");
        if (er) {
          const e = JSON.parse(er);
          if (e?.rawScore != null) essayCA = String(e.rawScore);
          if (e?.vspiceComposite != null) essayV = String(e.vspiceComposite);
        }
      } catch { /* ignore */ }

      let gpaUW = p.gpaUW || "";
      let gpaW = p.gpaW || "";
      try {
        const gr = localStorage.getItem("gpa-calc-v1");
        if (gr) {
          const state = JSON.parse(gr);
          if (state?.years?.length) {
            const COL_UW: Record<string, number> = {
              "A+":4,"A":4,"A−":3.7,"B+":3.3,"B":3,"B−":2.7,"C+":2.3,"C":2,"C−":1.7,"D+":1,"D":1,"F":0,
            };
            const COL_BONUS: Record<string, number> = { CP:0, Honors:0.5, DE:1, HDE:1, AP:1 };
            let uw = 0, w = 0, tc = 0;
            for (const year of state.years) {
              for (const row of year.rows) {
                if (!row.grade || row.nonCore) continue;
                const cr = parseFloat(row.credits) || 1;
                const base = COL_UW[row.grade] ?? 0;
                uw += base * cr;
                w += (row.grade === "F" ? 0 : base + (COL_BONUS[row.level] ?? 0)) * cr;
                tc += cr;
              }
            }
            if (tc > 0) { gpaUW = (uw / tc).toFixed(2); gpaW = (w / tc).toFixed(2); }
          }
        }
      } catch { /* ignore */ }

      setFilters((prev) => ({
        ...prev,
        gpaUW: gpaUW || prev.gpaUW || "",
        gpaW: gpaW || prev.gpaW || "",
        sat: (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : prev.sat) || "",
        act: (p.act?.english && p.act?.math && p.act?.reading && p.act?.science
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading) + parseInt(p.act.science)) / 4))
          : prev.act) || "",
        essayCommonApp: essayCA || prev.essayCommonApp || "",
        essayVspice: essayV || prev.essayVspice || "",
        // Major/interest persist from the shared profile, but only adopt
        // the stored value if the user hasn't already typed something
        // different into this page's filter panel.
        major: prev.major || p.intendedMajor || "",
        intendedInterest: prev.intendedInterest || p.intendedInterest || "",
      }));
    } catch (e) {
      console.warn("Could not read sources:", e);
    }
  }, []);

  useEffect(() => {
    fillFromSources();

    const onUpdated = () => fillFromSources();
    window.addEventListener("profile-source-updated", onUpdated);
    window.addEventListener("cloud-sync-loaded", onUpdated);
    return () => {
      window.removeEventListener("profile-source-updated", onUpdated);
      window.removeEventListener("cloud-sync-loaded", onUpdated);
    };
  }, [fillFromSources]);

  const updateFilter = <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));

    // Persist major + interest to the shared profile so the strategy page
    // (and any other surface that reads PROFILE_STORAGE_KEY) stays in sync.
    // Other filter fields are page-local.
    if (key === "major" || key === "intendedInterest") {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : {};
        const field = key === "major" ? "intendedMajor" : "intendedInterest";
        setItemAndNotify(
          PROFILE_STORAGE_KEY,
          JSON.stringify({ ...current, [field]: value }),
        );
      } catch { /* ignore write errors */ }
    }
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const results = useMemo((): ClassifiedCollege[] => {
    const gpaUW = filters.gpaUW ? parseFloat(filters.gpaUW) : null;
    const gpaW = filters.gpaW ? parseFloat(filters.gpaW) : null;
    const sat = filters.sat ? parseInt(filters.sat) : null;
    const act = filters.act ? parseInt(filters.act) : null;
    const essayCA = filters.essayCommonApp ? parseFloat(filters.essayCommonApp) : null;
    const essayV = filters.essayVspice ? parseFloat(filters.essayVspice) : null;
    const arMin = filters.acceptanceRateMin ? parseFloat(filters.acceptanceRateMin) : 0;
    const arMax = filters.acceptanceRateMax ? parseFloat(filters.acceptanceRateMax) : 100;

    // Major is now a *preference*, not a hard filter. Non-matching schools
    // stay in the list so users can discover unexpected fits — we just
    // attach a majorMatch level so the UI can badge strong ones.
    return COLLEGES
      .filter((c) => {
        if (filters.region !== "any" && c.region !== filters.region) return false;
        if (filters.size !== "any" && c.size !== filters.size) return false;
        if (filters.setting !== "any" && c.setting !== filters.setting) return false;
        if (filters.type !== "any" && c.type !== filters.type) return false;
        if (filters.testPolicy !== "any" && c.testPolicy !== filters.testPolicy) return false;
        if (c.acceptanceRate < arMin || c.acceptanceRate > arMax) return false;
        return true;
      })
      .map((c) => {
        const { classification, reason, fitScore } = classifyCollege(c, gpaUW, gpaW, sat, act, essayCA, essayV);
        const majorMatch = getMajorMatch(c, {
          major: filters.major,
          interest: filters.intendedInterest,
        });
        return { college: c, classification, reason, fitScore, majorMatch };
      })
      .sort((a, b) => a.college.acceptanceRate - b.college.acceptanceRate);
  }, [filters]);

  const sortedBy = (key: "acceptanceRate" | "fit" | "majorMatch"): ClassifiedCollege[] => {
    if (key === "fit") return [...results].sort((a, b) => b.fitScore - a.fitScore);
    if (key === "majorMatch") {
      return [...results].sort((a, b) => {
        const ra = MAJOR_MATCH_RANK[a.majorMatch ?? "none"];
        const rb = MAJOR_MATCH_RANK[b.majorMatch ?? "none"];
        if (ra !== rb) return rb - ra;
        // Break ties by fit score so matches of equal tier sort sensibly.
        return b.fitScore - a.fitScore;
      });
    }
    return results;
  };

  return { filters, updateFilter, resetFilters, results, sortedBy };
}
