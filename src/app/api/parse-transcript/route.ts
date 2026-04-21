import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL_PREMIUM as ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export const maxDuration = 120;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a transcript parser. You extract grades from a high school transcript and return them in a strict JSON format.

Output format (return ONLY valid JSON, no markdown):
{
  "totalYears": <number 1-4>,
  "activeYear": <number 0-3, usually most recent year>,
  "years": [
    {
      "rows": [
        {
          "name": "<course name>",
          "grade": "A+" | "A" | "A−" | "B+" | "B" | "B−" | "C+" | "C" | "C−" | "D+" | "D" | "F",
          "level": "CP" | "Honors" | "DE" | "HDE" | "AP",
          "credits": "<string like '1' or '0.5'>",
          "nonCore": <boolean>
        }
      ]
    }
  ]
}

GRADE RULES:
- Use "A−" (with the unicode minus sign U+2212), NOT "A-" (ASCII hyphen)
- Same for B− and C−
- If transcript shows letter+number (like "A- 93"), use only the letter
- If only percentage: 97+ = A+, 93-96 = A, 90-92 = A−, 87-89 = B+, 83-86 = B, 80-82 = B−, 77-79 = C+, 73-76 = C, 70-72 = C−, 67-69 = D+, 65-66 = D, <65 = F

LEVEL RULES:
- AP classes (with "AP" in the name) → "AP"
- Honors classes → "Honors"
- Dual Enrollment / Dual Credit / DE → "DE"
- Honors Dual Enrollment / HDE → "HDE"
- Regular classes → "CP"

NON-CORE RULES:
- Set nonCore: true for: PE, Physical Education, Health, Art (non-AP), Music (non-AP), Band, Orchestra, Theatre, Study Hall, Homeroom, Driver's Ed, Yearbook, Student Government
- Set nonCore: false for: English, Math, Science, History, Social Studies, Foreign Languages, AP/Honors versions of anything

CREDITS:
- Default to "1" (full year course)
- Semester-only courses → "0.5"
- If transcript shows explicit credit values, use those as strings

YEARS:
- Organize by grade level: 9th grade = years[0] (Freshman), 10th = years[1], 11th = years[2], 12th = years[3]
- totalYears = number of years with grade data
- activeYear = index of most recent year

MULTI-FILE HANDLING (CRITICAL):
- If you see multiple "=== FILE N of M: ===" labels, you must extract grades from EVERY file
- Each file may contain different years, semesters, or pages — treat them as pieces of the same student's record
- After reviewing ALL files, produce ONE merged JSON containing every unique course from every file
- Deduplicate: if the same course appears in two files with the same grade, include it only ONCE
- If two files show the same course with DIFFERENT grades (e.g. semester 1 vs semester 2), include BOTH as separate rows with appropriate credits (e.g. "0.5" each)
- Do not skip files or return data from only the first file

If you cannot identify any grades, return: { "totalYears": 0, "activeYear": 0, "years": [], "error": "No grades found in document" }`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // Accept multiple files: formData.getAll("file") or "files"
    const rawFiles = [
      ...formData.getAll("file"),
      ...formData.getAll("files"),
    ].filter((f): f is File => f instanceof File && f.size > 0);

    if (rawFiles.length === 0) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Validate and build content blocks for every file, with explicit
    // labels so Claude treats each as a separate document.
    const content: Anthropic.ContentBlockParam[] = [];

    if (rawFiles.length > 1) {
      content.push({
        type: "text",
        text: `You will be given ${rawFiles.length} transcript files below, each preceded by a "=== FILE N ===" label. They may be different pages/semesters/years of the same student's academic record. After viewing ALL of them, merge them into ONE unified JSON output following the schema. Deduplicate any course that appears in multiple files. Organize courses by grade level (9th → years[0], 10th → years[1], etc.).`,
      });
    }

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const mimeType = file.type;
      const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = mimeType.startsWith("image/");

      if (!isPdf && !isImage) {
        return NextResponse.json(
          { error: `Unsupported file: ${file.name}. Upload PDF or image files only.` },
          { status: 400 }
        );
      }

      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

      // Label each file explicitly
      if (rawFiles.length > 1) {
        content.push({
          type: "text",
          text: `=== FILE ${i + 1} of ${rawFiles.length}: ${file.name} ===`,
        });
      }

      if (isPdf) {
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        });
      } else {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        });
      }
    }

    // Final instruction after all files
    content.push({
      type: "text",
      text: rawFiles.length > 1
        ? `You have now seen all ${rawFiles.length} files. Produce ONE merged JSON output combining every course from every file. Return ONLY the JSON — no explanation.`
        : "Parse this transcript and return the JSON grade data.",
    });

    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      // 8K tokens to comfortably fit a 4-year merged transcript (~40+ courses)
      max_tokens: 8192,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "";
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      return NextResponse.json(parsed);
    } catch {
      console.error("Failed to parse transcript JSON:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Couldn't read the transcript. Try a clearer scan or a different file." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Transcript parse error:", err);
    return NextResponse.json(
      { error: "Something went wrong while reading the transcript." },
      { status: 500 }
    );
  }
}
