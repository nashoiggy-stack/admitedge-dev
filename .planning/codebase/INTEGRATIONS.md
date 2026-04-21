# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**AI / LLM:**
- Anthropic Claude API - Core AI backend for all intelligent features
  - SDK/Client: `@anthropic-ai/sdk` (v0.82.0)
  - Auth: `ANTHROPIC_API_KEY` env var (loaded in each API route)
  - Model: `claude-sonnet-4-6` (used across all routes)
  - Endpoints consuming this:
    - `src/app/api/grade/route.ts` - Essay grading (max_tokens: 3000, temperature: 0)
    - `src/app/api/chat/route.ts` - Conversational follow-up on grading (max_tokens: 1024)
    - `src/app/api/suggestions/route.ts` - Inline essay suggestions (max_tokens: 4096, temperature: 0)
    - `src/app/api/ec-evaluate/route.ts` - Extracurricular profile evaluation (max_tokens: 4000, temperature: 0)
    - `src/app/api/ec-chat/route.ts` - EC activity chat (max_tokens: 512)

**Maps:**
- CARTO Basemaps - Dark Matter style for college map tiles
  - Style URL: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
  - Client: MapLibre GL JS (`maplibre-gl`)
  - Auth: None (public basemap)
  - Used in: `src/components/ui/college-map.tsx`

## Data Storage

**Database:**
- Supabase (PostgreSQL)
  - Project URL: `https://qspnraniadsleifzyfxb.supabase.co`
  - Client: `@supabase/supabase-js` initialized in `src/lib/supabase.ts`
  - Auth: Publishable anon key hardcoded in client (appropriate for browser-side client)
  - Schema: Single `user_profiles` table with JSONB columns (`supabase-setup.sql`)
    - `profile_data` (JSONB) - User profile information
    - `gpa_data` (JSONB) - GPA calculator state
    - `essay_data` (JSONB) - Essay grading results
    - `ec_activities` (JSONB) - Extracurricular activities
    - `ec_result` (JSONB) - EC evaluation results
  - RLS: Enabled, users can only read/write their own rows (policy on `auth.uid()`)

**Client-Side Storage:**
- localStorage - Primary local persistence for all user data
  - `essay-grader-result` - Cached essay grading result
  - `gpa-calc-v1` - GPA calculator data
  - `ec-evaluator-activities` - EC activity conversations
  - `ec-evaluator-result` - EC evaluation result
  - Key from `PROFILE_STORAGE_KEY` constant (`src/lib/profile-types.ts`) - Profile data
  - Sync logic: `src/lib/profile-sync.ts` (debounced 2s sync to Supabase)

**File Storage:**
- None - No file storage service. Uploaded files (PDF/DOCX) are parsed in-memory on the server and discarded.

**Caching:**
- None - No server-side caching layer. localStorage serves as client-side cache.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Implementation: `src/hooks/useAuth.ts`
  - Methods: `signInWithPassword`, `signUp`, `signOut`
  - Session management: `supabase.auth.getSession()` + `onAuthStateChange` listener
  - Guest mode: Supported via local boolean state (no auth required, no cloud sync)
  - Auth gate UI: `src/components/AuthGate.tsx`
  - Provider wrapper: `src/components/AuthProvider.tsx`

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- `console.error` and `console.warn` in API routes and client sync code
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Vercel-compatible (Next.js App Router, `maxDuration = 60` on API routes, `runtime = "nodejs"`)

**CI Pipeline:**
- Not detected (no `.github/workflows/`, no CI config files found)

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude (used in all 5 API routes)

**Hardcoded config (client-side):**
- Supabase project URL and publishable anon key in `src/lib/supabase.ts`
- CARTO basemap style URL in `src/components/ui/college-map.tsx`

**Secrets location:**
- `.env.local` (gitignored)

## Fonts (External)

**Google Fonts:**
- Geist Sans and Geist Mono loaded via `next/font/google` in `src/app/layout.tsx`
- Optimized by Next.js font system (self-hosted at build time, no runtime external request)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Static Data

**College Database:**
- Hardcoded in `src/data/colleges.ts` - Array of `College` objects with admissions stats
- College coordinates hardcoded in `src/components/ui/college-map.tsx`
- Mock data in `src/data/mockData.ts`
- Admissions logic in `src/lib/admissions.ts`

---

*Integration audit: 2026-04-07*
