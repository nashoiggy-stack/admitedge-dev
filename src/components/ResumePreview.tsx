"use client";

import React from "react";
import type { ResumeData } from "@/lib/resume-types";

interface ResumePreviewProps {
  readonly resume: ResumeData;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="resume-section mb-5">
      <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-zinc-700 pb-1 mb-2 border-b border-zinc-300">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EntryRow({
  title,
  meta,
  description,
  bullets,
}: {
  title: string;
  meta?: string;
  description?: string;
  bullets?: string[];
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-zinc-900 leading-tight">{title}</p>
        {meta && <p className="text-[11px] text-zinc-600 shrink-0">{meta}</p>}
      </div>
      {description && (
        <p className="text-[12px] text-zinc-700 leading-snug mt-0.5">{description}</p>
      )}
      {bullets && bullets.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[12px] text-zinc-700 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-zinc-500">
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ resume }) => {
  const { basicInfo, education, awards, communityService, athletics, activities, summerExperience, skills } = resume;
  const hasAnyActivity =
    education.length > 0 ||
    awards.length > 0 ||
    communityService.length > 0 ||
    athletics.length > 0 ||
    activities.length > 0 ||
    summerExperience.length > 0;

  return (
    <div className="resume-preview bg-white text-zinc-900 rounded-2xl p-8 sm:p-10 shadow-xl max-w-[780px] mx-auto font-sans">
      {/* Header */}
      <header className="mb-6 pb-4 border-b-2 border-zinc-900">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 leading-none mb-2">
          {basicInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-700">
          {basicInfo.email && <span>{basicInfo.email}</span>}
          {basicInfo.phone && <span>{basicInfo.phone}</span>}
          {basicInfo.address && <span>{basicInfo.address}</span>}
          {basicInfo.school && (
            <span>
              {basicInfo.school}
              {basicInfo.graduationYear ? ` • Class of ${basicInfo.graduationYear}` : ""}
            </span>
          )}
        </div>
      </header>

      {/* Education */}
      {education.length > 0 && (
        <Section title="Education">
          {education.map((e) => {
            // Build the GPA line: "GPA 3.87 / 4.00 UW • 4.52 / 4.00 W" etc.
            const gpaParts: string[] = [];
            if (e.gpaUnweighted) {
              gpaParts.push(
                `GPA ${e.gpaUnweighted}${e.gpaScale ? `/${e.gpaScale}` : ""} UW`
              );
            }
            if (e.gpaWeighted) {
              gpaParts.push(`${e.gpaWeighted} W`);
            }
            // Back-compat: legacy single "gpa" field
            if (gpaParts.length === 0 && e.gpa) {
              gpaParts.push(`GPA ${e.gpa}`);
            }
            if (e.classRank) {
              gpaParts.push(`Rank ${e.classRank}`);
            }
            const metaParts = [e.graduationDate, gpaParts.join(" • ")].filter(Boolean);
            return (
              <EntryRow
                key={e.id}
                title={e.school || "—"}
                meta={metaParts.join(" • ")}
              />
            );
          })}
        </Section>
      )}

      {/* Awards */}
      {awards.length > 0 && (
        <Section title="Awards & Honors">
          {awards.map((a) => (
            <EntryRow
              key={a.id}
              title={a.name || "—"}
              meta={a.grades ? `Grade ${a.grades}` : undefined}
              description={a.description}
            />
          ))}
        </Section>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <Section title="Activities">
          {activities.map((a) => (
            <EntryRow
              key={a.id}
              title={[a.role, a.activityName].filter(Boolean).join(", ") || a.activityName || "—"}
              meta={[a.grades ? `Grade ${a.grades}` : "", a.leadership ? "Leadership" : ""].filter(Boolean).join(" • ")}
              description={a.description}
              bullets={a.impact ? [a.impact] : undefined}
            />
          ))}
        </Section>
      )}

      {/* Community Service */}
      {communityService.length > 0 && (
        <Section title="Community Service">
          {communityService.map((c) => (
            <EntryRow
              key={c.id}
              title={[c.role, c.organization].filter(Boolean).join(", ") || c.organization || "—"}
              meta={[c.grades ? `Grade ${c.grades}` : "", c.timeCommitment].filter(Boolean).join(" • ")}
              description={c.description}
            />
          ))}
        </Section>
      )}

      {/* Athletics */}
      {athletics.length > 0 && (
        <Section title="Athletics">
          {athletics.map((a) => (
            <EntryRow
              key={a.id}
              title={[a.level, a.sport].filter(Boolean).join(" ") || a.sport || "—"}
              meta={[a.grades ? `Grade ${a.grades}` : "", a.position, a.timeCommitment].filter(Boolean).join(" • ")}
              description={a.achievements}
            />
          ))}
        </Section>
      )}

      {/* Summer Experience */}
      {summerExperience.length > 0 && (
        <Section title="Summer Experience">
          {summerExperience.map((s) => (
            <EntryRow
              key={s.id}
              title={[s.program, s.organization].filter(Boolean).join(" — ") || "—"}
              meta={[s.duration, s.collegeCredit ? "College credit" : ""].filter(Boolean).join(" • ")}
              description={s.description}
            />
          ))}
        </Section>
      )}

      {/* Skills */}
      {(skills.languages || skills.technical || skills.other) && (
        <Section title="Skills">
          <div className="space-y-1">
            {skills.languages && (
              <p className="text-[12px] text-zinc-700">
                <span className="font-semibold">Languages:</span> {skills.languages}
              </p>
            )}
            {skills.technical && (
              <p className="text-[12px] text-zinc-700">
                <span className="font-semibold">Technical:</span> {skills.technical}
              </p>
            )}
            {skills.other && (
              <p className="text-[12px] text-zinc-700">
                <span className="font-semibold">Other:</span> {skills.other}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Empty-state hint */}
      {!hasAnyActivity && !skills.languages && !skills.technical && !skills.other && (
        <p className="text-center text-[12px] text-zinc-500 py-8 italic">
          Add entries on the left to see your resume take shape.
        </p>
      )}
    </div>
  );
};
