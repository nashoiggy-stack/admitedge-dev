# Roadmap — AdmitEdge v1.1

## Milestone: v1.1 — Fix, Polish, Resume Builder

### Phase 1: Landing Page Fix ✦ CRITICAL
**Goal:** Reliable landing page with scroll animation that never shows a black screen.
**Requirements:** REQ-01, REQ-02, REQ-03, REQ-04
**Approach:** Replace GSAP ScrollTrigger with framer-motion useScroll + useTransform. Sticky container pattern (700vh outer, 100vh sticky inner). Card uses scale animation not width/height. No visibility:hidden anywhere.
**Success:** Hero text visible on first paint. Scroll animation plays smoothly. All 5 tools still work.
**Plans:** 1 plan
Plans:
- [x] 01-01-PLAN.md — Rewrite landing page from GSAP to framer-motion scroll animation
**Status:** Complete

### Phase 2: Security + Cleanup
**Goal:** Fix security issues and remove dead code.
**Requirements:** REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-15
**Approach:** Move Supabase creds to env vars. Add sliding-window rate limiter to API routes. Delete unused components. Extract shared GPA utility. Add Profile to NavBar. Fix RLS policies.
**Success:** No hardcoded credentials. API routes rate-limited. No dead component files. Profile accessible from nav.
**Status:** Not started

### Phase 3: Testing Foundation
**Goal:** Unit tests for scoring logic + E2E for critical flow.
**Requirements:** REQ-10, REQ-14
**Approach:** Add Vitest for unit tests on admissions.ts pure functions. Add Playwright for sign-in → grade essay E2E flow.
**Success:** 80%+ coverage on admissions.ts. E2E test passes in CI.
**Status:** Not started

### Phase 4: Resume/Activities Builder
**Goal:** Common App-format activities section builder with EC evaluator integration.
**Requirements:** REQ-11, REQ-12, REQ-13
**Approach:** New /resume route. 10 activity slots matching Common App fields (type, position, org, description 150-char, hours, weeks, grades). Pre-fill from EC evaluator. Print CSS + @react-pdf/renderer for PDF.
**Success:** User can build, edit, reorder 10 activities. PDF exports correctly. EC evaluator data pre-fills.
**Status:** Not started

### Phase 5: UX Polish
**Goal:** Production-quality UX across all tools.
**Requirements:** REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21
**Approach:** Error boundaries. Mobile bottom tab nav. Auto-save with debounce. CSP headers. Cross-tool handoff CTAs. Return-visit banner.
**Success:** No full-page crashes. Mobile nav works. Auto-save on essay/EC. CSP configured.
**Status:** Not started

## Phase Dependencies
```
Phase 1 (Landing) → no deps, do first
Phase 2 (Security) → can run parallel with Phase 1
Phase 3 (Testing) → after Phase 2 (needs clean code to test)
Phase 4 (Resume) → after Phase 1 (needs working landing page with link)
Phase 5 (Polish) → after Phase 3 (needs stable foundation)
```

### Phase 6: Background picker with light/dark theme (localhost-only)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 6 to break down)
