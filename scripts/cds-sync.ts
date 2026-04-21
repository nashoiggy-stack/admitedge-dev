/**
 * cds-sync.ts
 *
 * Pulls authoritative stats from each college's Common Data Set (CDS) PDF and
 * writes them to src/data/cds-data.ts. The generated file is merged into the
 * College layer chain in src/data/colleges.ts, so CDS values OVERRIDE the
 * hand-curated estimates in colleges.ts and college-extended.ts at runtime
 * without rewriting those files — qualitative fields (vibeTags, knownFor,
 * qualitative, campusDetails, cultureDetails, locationDetails, topIndustries,
 * careerPipelines) are never touched.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npm run sync:cds
 *   npm run sync:cds -- --only "MIT"              # single college
 *   npm run sync:cds -- --only "MIT,Yale University"
 *   npm run sync:cds -- --force                    # bypass extraction cache
 *   npm run sync:cds -- --limit 5                  # first N colleges (smoke test)
 *
 * Cache: scripts/cds-cache/{pdfs,extractions}/  — safe to delete; git-ignored.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import * as XLSX from "xlsx";
import { promises as fs } from "node:fs";
import * as path from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const URLS_PATH = path.join(ROOT, "scripts", "cds-urls.json");
const CACHE_DIR = path.join(ROOT, "scripts", "cds-cache");
const PDF_DIR = path.join(CACHE_DIR, "pdfs");
const EXTRACT_DIR = path.join(CACHE_DIR, "extractions");
const OUTPUT_PATH = path.join(ROOT, "src", "data", "cds-data.ts");

// ── Schema ─────────────────────────────────────────────────────────────────
//
// Every numeric field is nullable so Claude can explicitly signal "not in this
// CDS" rather than hallucinate a value. The merge step drops nulls so the
// hand-curated fallback survives when a CDS omits a figure.

const DemographicsSchema = z
  .object({
    white: z.number().min(0).max(100).nullable(),
    asian: z.number().min(0).max(100).nullable(),
    hispanic: z.number().min(0).max(100).nullable(),
    black: z.number().min(0).max(100).nullable(),
    multiracial: z.number().min(0).max(100).nullable(),
    international: z.number().min(0).max(100).nullable(),
    other: z.number().min(0).max(100).nullable(),
  })
  .nullable();

const GenderSchema = z
  .object({
    male: z.number().min(0).max(100).nullable(),
    female: z.number().min(0).max(100).nullable(),
  })
  .nullable();

const CDSExtractionSchema = z.object({
  cdsYear: z
    .string()
    .describe("Academic year covered by this CDS, e.g. '2023-2024'. Empty string if unclear."),
  acceptanceRate: z.number().min(0).max(100).nullable(),
  yield: z.number().min(0).max(100).nullable(),
  regularDecisionAdmitRate: z.number().min(0).max(100).nullable(),
  edAdmitRate: z.number().min(0).max(100).nullable(),
  eaAdmitRate: z.number().min(0).max(100).nullable(),
  sat25: z.number().int().min(400).max(1600).nullable(),
  sat75: z.number().int().min(400).max(1600).nullable(),
  act25: z.number().int().min(1).max(36).nullable(),
  act75: z.number().int().min(1).max(36).nullable(),
  avgGPACDS: z.number().min(0).max(5).nullable(),
  top10HSPercent: z.number().min(0).max(100).nullable(),
  studentFacultyRatio: z.number().min(1).max(50).nullable(),
  fourYearGradRate: z.number().min(0).max(100).nullable(),
  undergradPopulation: z.number().int().min(100).max(200000).nullable(),
  inStatePercent: z.number().min(0).max(100).nullable(),
  percentInternational: z.number().min(0).max(100).nullable(),
  demographics: DemographicsSchema,
  genderBreakdown: GenderSchema,
  sourcePdfUrl: z.string(),
  notes: z.string().optional(),
});
type CDSExtraction = z.infer<typeof CDSExtractionSchema>;

// ── CLI args ───────────────────────────────────────────────────────────────

interface Args {
  only: string[] | null;
  force: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): Args {
  const only = flagValue(argv, "--only");
  const force = argv.includes("--force");
  const limitStr = flagValue(argv, "--limit");
  return {
    only: only ? only.split(",").map((s) => s.trim()).filter(Boolean) : null,
    force,
    limit: limitStr ? parseInt(limitStr, 10) : null,
  };
}

function flagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx === -1 || idx === argv.length - 1) return null;
  return argv[idx + 1] ?? null;
}

// ── PDF discovery ──────────────────────────────────────────────────────────

// Many .edu sites block default Node fetch UA — pose as Chrome.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function safeFetch(url: string, timeoutMs = 25000): Promise<Response | null> {
  try {
    return await fetch(url, {
      redirect: "follow",
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    console.warn(`   ! fetch failed: ${errMsg(err)}`);
    return null;
  }
}

function extractPdfHrefs(html: string, baseUrl: string): string[] {
  const hrefRe = /href\s*=\s*["']([^"']+?\.pdf(?:\?[^"']*)?)["']/gi;
  const pdfs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    try {
      pdfs.push(new URL(m[1], baseUrl).toString());
    } catch {
      // ignore malformed href
    }
  }
  return pdfs;
}

function extractIframeSrcs(html: string, baseUrl: string): string[] {
  const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = iframeRe.exec(html))) {
    try {
      out.push(new URL(m[1], baseUrl).toString());
    } catch {
      // ignore malformed src
    }
  }
  return out;
}

function pickBestCdsPdf(pdfs: string[]): string | null {
  if (pdfs.length === 0) return null;
  const likelyCds = pdfs.filter((u) =>
    /cds|common[-_]?data[-_]?set|commondata/i.test(u),
  );
  const candidates = likelyCds.length ? likelyCds : pdfs;
  const scored = candidates.map((u) => {
    const match = u.match(/(20\d{2})(?:[-_](?:20)?\d{2})?/);
    return { u, year: match ? parseInt(match[1], 10) : 0 };
  });
  scored.sort((a, b) => b.year - a.year);
  return scored[0].u;
}

async function findLatestCdsPdfUrl(landingUrl: string): Promise<string | null> {
  // Treat direct PDF or xlsx URLs as already-resolved.
  if (/\.(pdf|xlsx?)($|\?)/i.test(landingUrl)) return landingUrl;

  const res = await safeFetch(landingUrl);
  if (!res) return null;
  if (!res.ok) {
    console.warn(`   ! landing page returned ${res.status}`);
    return null;
  }
  // Some URLs (Google Drive `uc?export=download`, some CDN routes) return a
  // PDF directly even though the URL doesn't end in .pdf.
  const topCt = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (topCt.includes("application/pdf") || topCt.includes("application/octet-stream")) {
    return res.url;
  }
  const html = await res.text();

  // Direct PDF hrefs in the landing HTML
  const direct = pickBestCdsPdf(extractPdfHrefs(html, landingUrl));
  if (direct) return direct;

  // Follow iframes (Box, Google Drive, custom PDF viewers often live here)
  const iframes = extractIframeSrcs(html, landingUrl);
  for (const iframeUrl of iframes) {
    if (/\.pdf($|\?)/i.test(iframeUrl)) return iframeUrl;
    const iRes = await safeFetch(iframeUrl);
    if (!iRes || !iRes.ok) continue;
    const ct = iRes.headers.get("content-type") ?? "";
    if (ct.toLowerCase().includes("pdf")) return iRes.url;
    const iHtml = await iRes.text();
    const inner = pickBestCdsPdf(extractPdfHrefs(iHtml, iframeUrl));
    if (inner) return inner;
  }

  return null;
}

// ── PDF fetch + cache ──────────────────────────────────────────────────────

function slug(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

type DocKind = "pdf" | "xlsx";

interface DownloadedDoc {
  buf: Buffer;
  kind: DocKind;
}

function detectKind(buf: Buffer, url: string, contentType: string): DocKind | null {
  // Magic-byte sniff — most reliable.
  if (buf.subarray(0, 4).toString("latin1").startsWith("%PDF")) return "pdf";
  // xlsx is a zip archive starting with PK\x03\x04 (also .docx, but CDS is xlsx).
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // Disambiguate with URL / content-type hints.
    if (/\.xlsx($|\?)/i.test(url)) return "xlsx";
    if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "xlsx";
    return "xlsx";
  }
  // Fallbacks when magic bytes don't help.
  if (contentType.includes("pdf")) return "pdf";
  if (/\.pdf($|\?)/i.test(url)) return "pdf";
  if (contentType.includes("spreadsheet") || /\.xlsx?($|\?)/i.test(url)) return "xlsx";
  return null;
}

async function downloadDocument(docUrl: string, cachePath: string): Promise<DownloadedDoc> {
  const res = await safeFetch(docUrl, 60000);
  if (!res) throw new Error(`Download failed: network error for ${docUrl}`);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} for ${docUrl}`);
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  const kind = detectKind(buf, docUrl, ct);
  if (!kind) {
    throw new Error(
      `URL did not return a PDF or xlsx (content-type: ${ct || "unknown"}): ${docUrl}`,
    );
  }
  await fs.writeFile(cachePath, buf);
  return { buf, kind };
}

// ── Extraction via Anthropic PDF input ─────────────────────────────────────

const EXTRACTION_PROMPT = [
  "You are reading a college's Common Data Set (CDS) PDF. The CDS is a standard form",
  "produced by each U.S. college annually. Extract the exact figures listed in the",
  "report_cds tool schema, using these CDS section anchors as ground truth:",
  "",
  "• cdsYear           → header / title page (e.g. '2023-2024')",
  "• acceptanceRate    → Section C1 total admitted ÷ total applied × 100",
  "• yield             → Section C1 enrolled ÷ admitted × 100",
  "• regularDecisionAdmitRate → Section C21 (if split by plan) RD admits ÷ RD apps × 100",
  "• edAdmitRate       → Section C21 ED admits ÷ ED apps × 100 (if reported)",
  "• eaAdmitRate       → Section C21 EA admits ÷ EA apps × 100 (if reported)",
  "• sat25 / sat75     → Section C9 SAT Composite 25th / 75th percentile",
  "• act25 / act75     → Section C9 ACT Composite 25th / 75th percentile",
  "• avgGPACDS         → Section C12 average HS GPA of enrolled freshmen (4.0 scale)",
  "• top10HSPercent    → Section C11 % of freshmen from top 10% of HS class",
  "• studentFacultyRatio → Section I Student-to-Faculty ratio (the 'X' in X:1)",
  "• fourYearGradRate  → Section B Six-year grad rate's 4-year row, OR stated 4-year rate",
  "• undergradPopulation → Section B total full-time + part-time degree-seeking undergrads",
  "• inStatePercent    → Section B1 % of undergrads from the college's home state",
  "• percentInternational → Section B1 % nonresident aliens OR international",
  "• demographics      → Section B2 race/ethnicity breakdown (undergrad). Convert each",
  "                      count to a % of the total. 'international' = nonresident alien row.",
  "• genderBreakdown   → Section B1 male / female %",
  "",
  "Rules:",
  "1. Return null for any figure the CDS does not explicitly state. DO NOT guess or",
  "   interpolate from other sections.",
  "2. Percentages are 0-100 (not 0-1). Round to one decimal place.",
  "3. If the PDF covers multiple years (rare), use the most recent complete year.",
  "4. If the CDS groups 'international' into demographics AND has a separate nonresident",
  "   alien row, report international as the nonresident alien figure and leave other",
  "   demographic fields as reported.",
  "5. Report via the report_cds tool only — no narrative text.",
].join("\n");

const REPORT_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    cdsYear: { type: "string" },
    acceptanceRate: { type: ["number", "null"] },
    yield: { type: ["number", "null"] },
    regularDecisionAdmitRate: { type: ["number", "null"] },
    edAdmitRate: { type: ["number", "null"] },
    eaAdmitRate: { type: ["number", "null"] },
    sat25: { type: ["number", "null"] },
    sat75: { type: ["number", "null"] },
    act25: { type: ["number", "null"] },
    act75: { type: ["number", "null"] },
    avgGPACDS: { type: ["number", "null"] },
    top10HSPercent: { type: ["number", "null"] },
    studentFacultyRatio: { type: ["number", "null"] },
    fourYearGradRate: { type: ["number", "null"] },
    undergradPopulation: { type: ["number", "null"] },
    inStatePercent: { type: ["number", "null"] },
    percentInternational: { type: ["number", "null"] },
    demographics: {
      type: ["object", "null"],
      properties: {
        white: { type: ["number", "null"] },
        asian: { type: ["number", "null"] },
        hispanic: { type: ["number", "null"] },
        black: { type: ["number", "null"] },
        multiracial: { type: ["number", "null"] },
        international: { type: ["number", "null"] },
        other: { type: ["number", "null"] },
      },
    },
    genderBreakdown: {
      type: ["object", "null"],
      properties: {
        male: { type: ["number", "null"] },
        female: { type: ["number", "null"] },
      },
    },
    notes: { type: "string" },
  },
  required: [
    "cdsYear",
    "acceptanceRate",
    "yield",
    "regularDecisionAdmitRate",
    "edAdmitRate",
    "eaAdmitRate",
    "sat25",
    "sat75",
    "act25",
    "act75",
    "avgGPACDS",
    "top10HSPercent",
    "studentFacultyRatio",
    "fourYearGradRate",
    "undergradPopulation",
    "inStatePercent",
    "percentInternational",
    "demographics",
    "genderBreakdown",
  ],
};

// Retries transient Anthropic errors (429 rate limit, 529 overloaded,
// connection errors, 5xx) with exponential backoff. Everything else throws.
async function withAnthropicRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status = extractStatus(err);
      const retryable =
        status === 429 ||
        status === 529 ||
        (status !== undefined && status >= 500 && status < 600) ||
        err instanceof Anthropic.APIConnectionError ||
        err instanceof Anthropic.APIConnectionTimeoutError;
      if (!retryable || attempt === maxAttempts) throw err;
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30000);
      console.warn(
        `${label}  retry ${attempt}/${maxAttempts - 1} after ${backoffMs}ms (${errMsg(err)})`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

async function extractFromPdf(
  client: Anthropic,
  pdfBuf: Buffer,
  sourcePdfUrl: string,
  label: string,
): Promise<CDSExtraction> {
  const base64 = pdfBuf.toString("base64");

  const msg = await withAnthropicRetry(label, () =>
    client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      tools: [
        {
          name: "report_cds",
          description: "Report the extracted CDS figures. Call exactly once.",
          input_schema: REPORT_TOOL_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "report_cds" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  );

  const toolUse = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "report_cds",
  );
  if (!toolUse) {
    throw new Error("Model did not call report_cds tool");
  }

  const raw = toolUse.input as Record<string, unknown>;
  return CDSExtractionSchema.parse({ ...raw, sourcePdfUrl });
}

// Extract CDS from an xlsx workbook. Some colleges (Vanderbilt) publish CDS
// as an Excel file — parse it, dump each sheet as plain text, and send that
// instead of a PDF document block.
async function extractFromXlsx(
  client: Anthropic,
  xlsxBuf: Buffer,
  sourceUrl: string,
  label: string,
): Promise<CDSExtraction> {
  const wb = XLSX.read(xlsxBuf, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim().length === 0) continue;
    parts.push(`### Sheet: ${sheetName}\n${csv}`);
  }
  const workbookText = parts.join("\n\n");

  const prompt = [
    EXTRACTION_PROMPT,
    "",
    "This CDS was published as an Excel workbook, not a PDF. Each sheet is shown",
    "below as CSV with its section letter in the sheet name (e.g. 'A', 'B1', 'C9').",
    "Use the same CDS section anchors as above.",
    "",
    "--- WORKBOOK CONTENTS ---",
    workbookText,
  ].join("\n");

  const msg = await withAnthropicRetry(label, () =>
    client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      tools: [
        {
          name: "report_cds",
          description: "Report the extracted CDS figures. Call exactly once.",
          input_schema: REPORT_TOOL_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "report_cds" },
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    }),
  );

  const toolUse = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "report_cds",
  );
  if (!toolUse) throw new Error("Model did not call report_cds tool");

  const raw = toolUse.input as Record<string, unknown>;
  return CDSExtractionSchema.parse({ ...raw, sourcePdfUrl: sourceUrl });
}

// ── Merge into partial College ─────────────────────────────────────────────

interface CollegePartial {
  acceptanceRate?: number;
  sat25?: number;
  sat75?: number;
  act25?: number;
  act75?: number;
  yield?: number;
  edAdmitRate?: number;
  eaAdmitRate?: number;
  regularDecisionAdmitRate?: number;
  avgGPACDS?: number;
  top10HSPercent?: number;
  pctTopTenClass?: number;
  studentFacultyRatio?: number;
  fourYearGradRate?: number;
  undergradPopulation?: number;
  inStatePercent?: number;
  percentInternational?: number;
  demographics?: Record<string, number>;
  genderBreakdown?: Record<string, number>;
}

function toCollegePartial(ext: CDSExtraction): CollegePartial {
  const out: CollegePartial = {};
  const n = <K extends keyof CollegePartial>(k: K, v: number | null | undefined): void => {
    if (typeof v === "number" && Number.isFinite(v)) {
      (out as Record<string, unknown>)[k] = v;
    }
  };

  n("acceptanceRate", ext.acceptanceRate);
  n("sat25", ext.sat25);
  n("sat75", ext.sat75);
  n("act25", ext.act25);
  n("act75", ext.act75);
  n("yield", ext.yield);
  n("edAdmitRate", ext.edAdmitRate);
  n("eaAdmitRate", ext.eaAdmitRate);
  n("regularDecisionAdmitRate", ext.regularDecisionAdmitRate);
  n("avgGPACDS", ext.avgGPACDS);
  n("top10HSPercent", ext.top10HSPercent);
  // Also populate pctTopTenClass — the pre-existing field used by the comparison engine.
  if (typeof ext.top10HSPercent === "number") {
    out.pctTopTenClass = ext.top10HSPercent;
  }
  n("studentFacultyRatio", ext.studentFacultyRatio);
  n("fourYearGradRate", ext.fourYearGradRate);
  n("undergradPopulation", ext.undergradPopulation);
  n("inStatePercent", ext.inStatePercent);
  n("percentInternational", ext.percentInternational);

  if (ext.demographics) {
    const demo: Record<string, number> = {};
    for (const [k, v] of Object.entries(ext.demographics)) {
      if (typeof v === "number" && Number.isFinite(v)) demo[k] = v;
    }
    if (Object.keys(demo).length > 0) out.demographics = demo;
  }
  if (ext.genderBreakdown) {
    const g: Record<string, number> = {};
    for (const [k, v] of Object.entries(ext.genderBreakdown)) {
      if (typeof v === "number" && Number.isFinite(v)) g[k] = v;
    }
    if (Object.keys(g).length > 0) out.genderBreakdown = g;
  }

  return out;
}

// ── Generated file writer ──────────────────────────────────────────────────

interface CDSEntry {
  cdsYear: string;
  sourcePdfUrl: string;
  data: CollegePartial;
}

async function writeGeneratedFile(entries: Record<string, CDSEntry>): Promise<void> {
  const lines: string[] = [
    "// AUTO-GENERATED by scripts/cds-sync.ts — DO NOT EDIT BY HAND.",
    "// Re-run: npm run sync:cds",
    "//",
    "// Authoritative stats pulled from each college's Common Data Set PDF.",
    "// Merged into the College layer chain by src/data/colleges.ts so these",
    "// values OVERRIDE the hand-curated estimates in colleges.ts and",
    "// college-extended.ts at runtime, without modifying those files.",
    "",
    'import type { College } from "@/lib/college-types";',
    "",
    "export interface CDSEntry {",
    "  readonly cdsYear: string;",
    "  readonly sourcePdfUrl: string;",
    "  readonly data: Partial<College>;",
    "}",
    "",
    "export const CDS_DATA: Record<string, CDSEntry> = {",
  ];

  const keys = Object.keys(entries).sort();
  for (const name of keys) {
    const entry = entries[name];
    lines.push(`  ${JSON.stringify(name)}: {`);
    lines.push(`    cdsYear: ${JSON.stringify(entry.cdsYear)},`);
    lines.push(`    sourcePdfUrl: ${JSON.stringify(entry.sourcePdfUrl)},`);
    lines.push(`    data: ${JSON.stringify(entry.data)},`);
    lines.push("  },");
  }
  lines.push("};");
  lines.push("");

  await fs.writeFile(OUTPUT_PATH, lines.join("\n"), "utf8");
}

// ── Helpers ────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function readJson<T>(p: string): Promise<T> {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw) as T;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

interface UrlsFile {
  [name: string]: string;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set. Export it before running.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const client = new Anthropic({ apiKey });

  await ensureDir(PDF_DIR);
  await ensureDir(EXTRACT_DIR);

  const urls = await readJson<UrlsFile>(URLS_PATH);
  const allNames = Object.keys(urls).filter((k) => !k.startsWith("_"));

  let targets = allNames;
  if (args.only) {
    const want = new Set(args.only);
    targets = targets.filter((n) => want.has(n));
    const missing = [...want].filter((n) => !targets.includes(n));
    if (missing.length) {
      console.error(`Unknown --only names: ${missing.join(", ")}`);
      process.exit(1);
    }
  }
  if (args.limit != null) targets = targets.slice(0, args.limit);

  console.log(`Syncing ${targets.length} college(s)…\n`);

  const entries: Record<string, CDSEntry> = {};
  // Load any already-cached extractions so partial runs are cumulative.
  for (const name of allNames) {
    const p = path.join(EXTRACT_DIR, `${slug(name)}.json`);
    if (await pathExists(p)) {
      try {
        const cached = await readJson<CDSExtraction>(p);
        entries[name] = {
          cdsYear: cached.cdsYear,
          sourcePdfUrl: cached.sourcePdfUrl,
          data: toCollegePartial(cached),
        };
      } catch {
        // ignore corrupt cache entries
      }
    }
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < targets.length; i++) {
    const name = targets[i];
    const prefix = `[${i + 1}/${targets.length}] ${name}`;
    const extractPath = path.join(EXTRACT_DIR, `${slug(name)}.json`);

    if (!args.force && (await pathExists(extractPath))) {
      console.log(`${prefix}  ✓ cached`);
      ok++;
      continue;
    }

    const landing = urls[name];
    if (!landing) {
      console.warn(`${prefix}  ! no URL in cds-urls.json`);
      fail++;
      continue;
    }

    console.log(`${prefix}  → ${landing}`);
    try {
      const docUrl = await findLatestCdsPdfUrl(landing);
      if (!docUrl) {
        console.warn(`${prefix}  ! no PDF/xlsx link found on landing page`);
        fail++;
        continue;
      }
      console.log(`${prefix}    doc: ${docUrl}`);

      // Cache by slug + best-guess extension. If an existing cache file
      // exists under either extension, reuse it; otherwise download fresh.
      const pdfPath = path.join(PDF_DIR, `${slug(name)}.pdf`);
      const xlsxPath = path.join(PDF_DIR, `${slug(name)}.xlsx`);
      let doc: DownloadedDoc;
      if (!args.force && (await pathExists(pdfPath))) {
        const buf = await fs.readFile(pdfPath);
        doc = { buf, kind: "pdf" };
      } else if (!args.force && (await pathExists(xlsxPath))) {
        const buf = await fs.readFile(xlsxPath);
        doc = { buf, kind: "xlsx" };
      } else {
        // Download to a temp path, then rename once we know the kind.
        const tmpPath = path.join(PDF_DIR, `${slug(name)}.tmp`);
        doc = await downloadDocument(docUrl, tmpPath);
        const finalPath = doc.kind === "pdf" ? pdfPath : xlsxPath;
        await fs.rename(tmpPath, finalPath);
      }
      console.log(
        `${prefix}    ${doc.kind.toUpperCase()} size: ${(doc.buf.length / 1024).toFixed(0)} KB`,
      );

      const extraction =
        doc.kind === "pdf"
          ? await extractFromPdf(client, doc.buf, docUrl, prefix)
          : await extractFromXlsx(client, doc.buf, docUrl, prefix);
      await fs.writeFile(extractPath, JSON.stringify(extraction, null, 2), "utf8");
      entries[name] = {
        cdsYear: extraction.cdsYear,
        sourcePdfUrl: extraction.sourcePdfUrl,
        data: toCollegePartial(extraction),
      };
      console.log(`${prefix}  ✓ ${extraction.cdsYear || "(year unknown)"}`);
      ok++;
      // Tiny spacing between successful API calls to avoid tripping
      // per-minute token rate limits on back-to-back large-PDF requests.
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: unknown) {
      console.error(`${prefix}  ✗ ${errMsg(err)}`);
      fail++;
    }
  }

  console.log(`\nWriting ${OUTPUT_PATH}`);
  await writeGeneratedFile(entries);

  console.log(
    `\nDone. ${ok} succeeded, ${fail} failed. Total entries in output: ${Object.keys(entries).length}.`,
  );
  if (fail > 0) {
    console.log(
      "Failures are usually pages that hide the PDF behind a JS-rendered viewer",
      "(e.g. box.com, tableau). Resolve by replacing those landing URLs in",
      "scripts/cds-urls.json with direct .pdf links, then re-running.",
    );
  }
}

main().catch((err: unknown) => {
  console.error(errMsg(err));
  process.exit(1);
});
