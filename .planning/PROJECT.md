# AdmitEdge

## Vision
All-in-one college prep platform that replaces scattered tools with a unified suite — GPA calculator, essay grading, extracurricular evaluation, college list building, and chance estimation. Everything connects: your GPA auto-fills into your college list, your essay score adjusts your chances.

## Target Users
Broad college-bound students — from freshman to senior year. The tools should be useful whether you're just starting to think about college or actively submitting applications.

## Current State (Brownfield)
The app is live on Vercel with 5 integrated features:
1. **Essay Grader** — AI-powered Common App essay grading with 7 criteria + VSPICE rubric, inline suggestions, coaching chat
2. **GPA Calculator** — Standalone HTML calculator embedded via iframe, calculates weighted/unweighted across HS and college scales
3. **EC Evaluator** — Conversational extracurricular activity evaluator with tier ratings and profile analysis
4. **College List Builder** — Filters 80+ colleges into 5 tiers (Safety → Unlikely) based on academic profile
5. **Chance Calculator** — Estimates admission chances with interactive college location map

Supporting infrastructure:
- **Profile page** — Central hub showing auto-filled data from all tools
- **Supabase auth** — Email/password + guest mode
- **Cloud sync** — Profile, GPA, essay, and EC data synced to Supabase for cross-device access
- **GSAP scroll animation** — Landing page with cinematic scroll effects

## Tech Stack
- Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- Anthropic Claude API (Sonnet 4.6) for essay grading, chat, EC evaluation
- Supabase (auth + database)
- GSAP + ScrollTrigger for landing page animations
- MapLibre GL for college location maps
- Deployed on Vercel via GitHub

## Known Issues
- Landing page GSAP scroll animation is fragile — text visibility issues with z-index and timing
- Hardcoded Supabase credentials in source (should be env vars)
- No tests
- Dead/unused component files from previous iterations
- Duplicate GPA calculation logic across hooks

## Current Priority
1. Fix landing page scroll animation reliably
2. Polish existing 5 tools (UX, bugs, consistency)
3. Add Resume/Activities section builder feature
4. Production hardening (tests, security, cleanup)
