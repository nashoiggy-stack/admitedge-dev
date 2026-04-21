"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  ResumeData,
  BasicInfo,
  EducationEntry,
  AwardEntry,
  CommunityServiceEntry,
  AthleticsEntry,
  ActivityEntry,
  SummerExperienceEntry,
  SkillsData,
} from "@/lib/resume-types";
import { EMPTY_RESUME, RESUME_STORAGE_KEY, generateResumeId } from "@/lib/resume-types";
import { buildInitialResume, importFromECEvaluator } from "@/lib/resume-import";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";

// ── List-section keys (everything except basicInfo / skills) ────────────────

type ListSectionKey =
  | "education"
  | "awards"
  | "communityService"
  | "athletics"
  | "activities"
  | "summerExperience";

type EntryByKey = {
  education: EducationEntry;
  awards: AwardEntry;
  communityService: CommunityServiceEntry;
  athletics: AthleticsEntry;
  activities: ActivityEntry;
  summerExperience: SummerExperienceEntry;
};

// ── Hook ────────────────────────────────────────────────────────────────────

export function useResume() {
  const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME);
  const [loaded, setLoaded] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [importFlash, setImportFlash] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(RESUME_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as ResumeData;
        setResume(parsed);
      } else {
        // Seed from profile/GPA calc on first load
        setResume(buildInitialResume(EMPTY_RESUME));
      }
    } catch {
      setResume(EMPTY_RESUME);
    }
    setLoaded(true);
  }, []);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
      } catch { /* ignore quota errors */ }
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [resume, loaded]);

  // ── Re-sync from external sources on focus ────────────────────────────────
  // If the profile page or another tab updates basicInfo / GPA, pull the
  // freshest values into the resume.
  useEffect(() => {
    if (!loaded) return;

    const syncFromExternal = () => {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return;
        const profile = JSON.parse(raw) as { basicInfo?: BasicInfo };
        if (profile.basicInfo) {
          setResume((prev) => {
            // Only fill empty fields — don't stomp user edits in the resume
            const merged: BasicInfo = {
              name: prev.basicInfo.name || profile.basicInfo!.name || "",
              email: prev.basicInfo.email || profile.basicInfo!.email || "",
              phone: prev.basicInfo.phone || profile.basicInfo!.phone || "",
              school: prev.basicInfo.school || profile.basicInfo!.school || "",
              graduationYear: prev.basicInfo.graduationYear || profile.basicInfo!.graduationYear || "",
              address: prev.basicInfo.address || profile.basicInfo!.address || "",
            };
            return { ...prev, basicInfo: merged };
          });
        }
      } catch { /* ignore */ }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_STORAGE_KEY) syncFromExternal();
    };

    window.addEventListener("focus", syncFromExternal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", syncFromExternal);
      window.removeEventListener("storage", onStorage);
    };
  }, [loaded]);

  // ── Basic info — write-through to shared profile ──────────────────────────
  //
  // Resume basicInfo is mirrored into admitedge-profile.basicInfo so other
  // tools (and future sessions) reuse it without re-typing.
  const updateBasicInfo = useCallback((patch: Partial<BasicInfo>) => {
    setResume((prev) => {
      const next = { ...prev, basicInfo: { ...prev.basicInfo, ...patch } };
      // Mirror to shared profile
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        const profile = raw ? JSON.parse(raw) : {};
        profile.basicInfo = next.basicInfo;
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ── Skills ────────────────────────────────────────────────────────────────
  const updateSkills = useCallback((patch: Partial<SkillsData>) => {
    setResume((prev) => ({ ...prev, skills: { ...prev.skills, ...patch } }));
  }, []);

  // ── Generic list-section operations ───────────────────────────────────────
  function addEntry<K extends ListSectionKey>(section: K, entry: EntryByKey[K]) {
    setResume((prev) => ({
      ...prev,
      [section]: [...prev[section], entry],
    }));
  }

  function updateEntry<K extends ListSectionKey>(
    section: K,
    id: string,
    patch: Partial<EntryByKey[K]>
  ) {
    setResume((prev) => ({
      ...prev,
      [section]: prev[section].map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    }));
  }

  function removeEntry<K extends ListSectionKey>(section: K, id: string) {
    setResume((prev) => ({
      ...prev,
      [section]: prev[section].filter((e) => e.id !== id),
    }));
  }

  function moveEntry<K extends ListSectionKey>(
    section: K,
    id: string,
    direction: "up" | "down"
  ) {
    setResume((prev) => {
      const list = [...prev[section]];
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...prev, [section]: list };
    });
  }

  // ── Section-specific add shortcuts ────────────────────────────────────────

  const addEducation = useCallback(() => {
    addEntry("education", {
      id: generateResumeId(),
      school: "",
      graduationDate: "",
      gpa: "",
      gpaUnweighted: "",
      gpaWeighted: "",
      gpaScale: "4.00",
      classRank: "",
    });
  }, []);

  const addAward = useCallback(() => {
    addEntry("awards", {
      id: generateResumeId(),
      name: "",
      grades: "",
      description: "",
    });
  }, []);

  const addCommunityService = useCallback(() => {
    addEntry("communityService", {
      id: generateResumeId(),
      organization: "",
      role: "",
      grades: "",
      description: "",
      timeCommitment: "",
    });
  }, []);

  const addAthletics = useCallback(() => {
    addEntry("athletics", {
      id: generateResumeId(),
      sport: "",
      level: "",
      position: "",
      grades: "",
      achievements: "",
      timeCommitment: "",
    });
  }, []);

  const addActivity = useCallback(() => {
    addEntry("activities", {
      id: generateResumeId(),
      activityName: "",
      role: "",
      grades: "",
      description: "",
      leadership: false,
      impact: "",
    });
  }, []);

  const addSummerExperience = useCallback(() => {
    addEntry("summerExperience", {
      id: generateResumeId(),
      program: "",
      organization: "",
      duration: "",
      description: "",
      collegeCredit: false,
    });
  }, []);

  // ── Import from EC Evaluator (distributed across sections) ────────────────

  const importFromECs = useCallback(() => {
    const result = importFromECEvaluator({
      activities: resume.activities,
      communityService: resume.communityService,
      athletics: resume.athletics,
      summerExperience: resume.summerExperience,
      awards: resume.awards,
    });

    if (result.importedCount === 0) {
      setImportFlash(
        result.skippedCount > 0
          ? `No new activities — ${result.skippedCount} were already imported.`
          : "No activities found in EC Evaluator."
      );
    } else {
      setResume((prev) => ({
        ...prev,
        activities: [...prev.activities, ...result.activities],
        communityService: [...prev.communityService, ...result.communityService],
        athletics: [...prev.athletics, ...result.athletics],
        summerExperience: [...prev.summerExperience, ...result.summerExperience],
        awards: [...prev.awards, ...result.awards],
      }));

      // Build a distribution summary
      const parts: string[] = [];
      if (result.distribution.activities > 0) parts.push(`${result.distribution.activities} Activit${result.distribution.activities === 1 ? "y" : "ies"}`);
      if (result.distribution.communityService > 0) parts.push(`${result.distribution.communityService} Community`);
      if (result.distribution.athletics > 0) parts.push(`${result.distribution.athletics} Athletics`);
      if (result.distribution.summerExperience > 0) parts.push(`${result.distribution.summerExperience} Summer`);
      if (result.distribution.awards > 0) parts.push(`${result.distribution.awards} Awards`);

      setImportFlash(
        `Imported ${result.importedCount} entries — ${parts.join(", ")}` +
          (result.skippedCount > 0 ? ` (${result.skippedCount} duplicates skipped)` : "")
      );
    }
    setTimeout(() => setImportFlash(null), 5000);
  }, [resume.activities, resume.communityService, resume.athletics, resume.summerExperience, resume.awards]);

  // ── Move an activity to a different section ───────────────────────────────

  type RecategorizableTarget =
    | "activities"
    | "communityService"
    | "athletics"
    | "summerExperience"
    | "awards";

  const recategorizeActivity = useCallback(
    (id: string, target: RecategorizableTarget) => {
      // Find the activity in any section
      setResume((prev) => {
        // Search all 5 sections for the entry
        const sections: RecategorizableTarget[] = [
          "activities", "communityService", "athletics", "summerExperience", "awards",
        ];

        for (const src of sections) {
          if (src === target) continue;
          const list = prev[src];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const found = list.find((e: any) => e.id === id);
          if (!found) continue;

          // Remove from source
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const withoutFromSrc = list.filter((e: any) => e.id !== id);

          // Build a new entry shape for the target section, carrying as much data as possible
          // Pull a "name" + "description" + "impact" from any shape
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f = found as any;
          const name: string = f.activityName ?? f.organization ?? f.sport ?? f.program ?? f.name ?? "";
          const desc: string = f.description ?? f.achievements ?? "";
          const impact: string = f.impact ?? f.achievements ?? "";

          let newEntry: ActivityEntry | CommunityServiceEntry | AthleticsEntry | SummerExperienceEntry | AwardEntry;
          switch (target) {
            case "activities":
              newEntry = {
                id, activityName: name, role: f.role ?? "", grades: f.grades ?? "",
                description: desc, leadership: !!f.leadership, impact,
                source: f.source,
              };
              break;
            case "communityService":
              newEntry = {
                id, organization: name, role: f.role ?? "", grades: f.grades ?? "",
                description: desc, timeCommitment: f.timeCommitment ?? "",
                source: f.source,
              };
              break;
            case "athletics":
              newEntry = {
                id, sport: name, level: f.level ?? "", position: f.position ?? "",
                grades: f.grades ?? "", achievements: impact || desc,
                timeCommitment: f.timeCommitment ?? "",
              };
              break;
            case "summerExperience":
              newEntry = {
                id, program: name, organization: f.organization ?? "",
                duration: f.duration ?? "", description: desc, collegeCredit: !!f.collegeCredit,
              };
              break;
            case "awards":
              newEntry = {
                id, name, grades: f.grades ?? "", description: desc,
              };
              break;
          }

          return {
            ...prev,
            [src]: withoutFromSrc,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [target]: [...(prev[target] as any[]), newEntry],
          };
        }
        return prev;
      });
    },
    []
  );

  // ── Save manually (explicit button) ───────────────────────────────────────

  const saveNow = useCallback(() => {
    try {
      localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
      return true;
    } catch {
      return false;
    }
  }, [resume]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetResume = useCallback(() => {
    setResume(buildInitialResume(EMPTY_RESUME));
    try {
      localStorage.removeItem(RESUME_STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  // ── Replace a single activity entry (used by Activities Helper Mode) ──────

  const replaceActivity = useCallback(
    (id: string, patch: Partial<ActivityEntry>) => {
      updateEntry("activities", id, patch);
    },
    []
  );

  return {
    resume,
    loaded,
    saveFlash,
    importFlash,
    updateBasicInfo,
    updateSkills,
    // Education
    addEducation,
    updateEducation: (id: string, patch: Partial<EducationEntry>) =>
      updateEntry("education", id, patch),
    removeEducation: (id: string) => removeEntry("education", id),
    moveEducation: (id: string, dir: "up" | "down") =>
      moveEntry("education", id, dir),
    // Awards
    addAward,
    updateAward: (id: string, patch: Partial<AwardEntry>) =>
      updateEntry("awards", id, patch),
    removeAward: (id: string) => removeEntry("awards", id),
    moveAward: (id: string, dir: "up" | "down") =>
      moveEntry("awards", id, dir),
    // Community Service
    addCommunityService,
    updateCommunityService: (id: string, patch: Partial<CommunityServiceEntry>) =>
      updateEntry("communityService", id, patch),
    removeCommunityService: (id: string) => removeEntry("communityService", id),
    moveCommunityService: (id: string, dir: "up" | "down") =>
      moveEntry("communityService", id, dir),
    // Athletics
    addAthletics,
    updateAthletics: (id: string, patch: Partial<AthleticsEntry>) =>
      updateEntry("athletics", id, patch),
    removeAthletics: (id: string) => removeEntry("athletics", id),
    moveAthletics: (id: string, dir: "up" | "down") =>
      moveEntry("athletics", id, dir),
    // Activities
    addActivity,
    updateActivity: (id: string, patch: Partial<ActivityEntry>) =>
      updateEntry("activities", id, patch),
    removeActivity: (id: string) => removeEntry("activities", id),
    moveActivity: (id: string, dir: "up" | "down") =>
      moveEntry("activities", id, dir),
    replaceActivity,
    // Summer Experience
    addSummerExperience,
    updateSummerExperience: (id: string, patch: Partial<SummerExperienceEntry>) =>
      updateEntry("summerExperience", id, patch),
    removeSummerExperience: (id: string) => removeEntry("summerExperience", id),
    moveSummerExperience: (id: string, dir: "up" | "down") =>
      moveEntry("summerExperience", id, dir),
    // Meta
    importFromECs,
    recategorizeActivity,
    saveNow,
    resetResume,
  };
}
