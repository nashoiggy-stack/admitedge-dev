// Quick probe: fetch each landing page and check if we can find a CDS PDF link
// in the raw HTML. Lists the ones that need manual URL swaps. No Claude calls.
//
// Run: node scripts/cds-probe.mjs

import { promises as fs } from "node:fs";
import * as path from "node:path";

const URLS_PATH = path.join(process.cwd(), "scripts", "cds-urls.json");
const urls = JSON.parse(await fs.readFile(URLS_PATH, "utf8"));
const entries = Object.entries(urls).filter(([k]) => !k.startsWith("_"));

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
};

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    return { res };
  } catch (e) {
    return { error: e.message };
  }
}

function extractPdfHrefs(html, baseUrl) {
  const hrefRe = /href\s*=\s*["']([^"']+?\.pdf(?:\?[^"']*)?)["']/gi;
  const pdfs = [];
  let m;
  while ((m = hrefRe.exec(html))) {
    try { pdfs.push(new URL(m[1], baseUrl).toString()); } catch {}
  }
  return pdfs;
}

function extractIframeSrcs(html, baseUrl) {
  const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
  const out = [];
  let m;
  while ((m = iframeRe.exec(html))) {
    try { out.push(new URL(m[1], baseUrl).toString()); } catch {}
  }
  return out;
}

function pickBest(pdfs) {
  const likelyCds = pdfs.filter((u) => /cds|common[-_]?data|commondata/i.test(u));
  const candidates = likelyCds.length ? likelyCds : pdfs;
  const scored = candidates.map((u) => {
    const mm = u.match(/(20\d{2})(?:[-_](?:20)?\d{2})?/);
    return { u, year: mm ? parseInt(mm[1], 10) : 0 };
  });
  scored.sort((a, b) => b.year - a.year);
  return scored[0];
}

async function probe(landing) {
  if (/\.pdf($|\?)/i.test(landing)) return { status: "direct-pdf", pdfUrl: landing };
  const { res, error } = await safeFetch(landing);
  if (error) return { status: "fetch-failed", detail: error };
  if (!res.ok) return { status: `http-${res.status}` };
  const html = await res.text();

  // Direct PDF hrefs in the landing HTML
  let pdfs = extractPdfHrefs(html, landing);
  if (pdfs.length > 0) {
    const best = pickBest(pdfs);
    return { status: "ok", via: "href", pdfUrl: best.u, year: best.year };
  }

  // Follow iframes (Box, Google Drive, internal PDF viewers frequently embed here)
  const iframes = extractIframeSrcs(html, landing);
  for (const iframe of iframes) {
    if (/\.pdf($|\?)/i.test(iframe)) {
      return { status: "ok", via: "iframe-direct", pdfUrl: iframe };
    }
    const { res: ires, error: ierr } = await safeFetch(iframe);
    if (ierr || !ires || !ires.ok) continue;
    const ct = ires.headers.get("content-type") || "";
    if (ct.includes("pdf")) {
      return { status: "ok", via: "iframe-redirect", pdfUrl: ires.url };
    }
    const ihtml = await ires.text();
    const ipdfs = extractPdfHrefs(ihtml, iframe);
    if (ipdfs.length > 0) {
      const best = pickBest(ipdfs);
      return { status: "ok", via: "iframe-inner", pdfUrl: best.u, year: best.year };
    }
  }

  return { status: "no-pdf-links", iframeCount: iframes.length };
}

const failed = [];
const ok = [];
let i = 0;
for (const [name, url] of entries) {
  i++;
  process.stdout.write(`[${i}/${entries.length}] ${name}… `);
  const r = await probe(url);
  if (r.status === "ok" || r.status === "direct-pdf") {
    ok.push({ name, ...r });
    console.log(r.status === "direct-pdf" ? "direct PDF" : `ok (${r.year || "?"})`);
  } else {
    failed.push({ name, url, ...r });
    console.log(`FAIL: ${r.status}${r.hasIframe ? " (iframe)" : ""}${r.detail ? " — " + r.detail : ""}`);
  }
}

console.log(`\n=== ${ok.length} ok, ${failed.length} failing ===\n`);
console.log("--- WORKING (will sync automatically) ---");
for (const r of ok) console.log(`  ✓ ${r.name}`);
console.log("\n--- FAILING (need manual URL swap or alt strategy) ---");
for (const f of failed) {
  console.log(`  • ${f.name}  [${f.status}]`);
}
