# Concerns & Tech Debt

## Critical: Hardcoded Secrets in Source

- **Supabase credentials hardcoded** in `src/lib/supabase.ts` — URL and anon key are in plain text in the source code, not in environment variables. The anon key is a publishable key (client-side safe), but the URL should still be in `.env`.
- **Anthropic API key** is properly in `.env.local` — good.

**Recommendation:** Move Supabase URL and key to environment variables.

## Security

- **No input sanitization** on API routes — essay text, chat messages, EC conversations are passed directly to Anthropic without length limits or content filtering
- **No rate limiting** on any API endpoints — a user could spam the grading/chat APIs
- **No CSRF protection** on form submissions
- **localStorage stores all user data** — profile, GPA, essay scores, EC evaluations. No encryption.

## Performance

- **Multiple Three.js/WebGL instances** — `shader-animation.tsx`, `shader-lines.tsx`, `web-gl-shader.tsx` all exist and load Three.js. Some load via CDN script tags (shader-lines), others via npm. Inconsistent approach.
- **Large college data file** — `src/data/colleges.ts` has 80+ colleges hardcoded as a single array. Works fine now but doesn't scale.
- **GSAP + ScrollTrigger** loaded on landing page — heavy library for a single scroll animation
- **MapLibre GL** loaded for a single map on the chances page — consider lazy loading

## Architecture Gaps

- **No error boundaries** — React error boundaries are missing. A crash in any component takes down the whole page.
- **No loading states for profile sync** — `ProfileSync.tsx` polls localStorage every 5s and syncs to Supabase, but there's no user-visible indicator of sync status.
- **Duplicate GPA calculation logic** — the college-recalculated GPA formula is repeated in `useChanceCalculator.ts`, `useCollegeFilter.ts`, and `useProfile.ts`. Should be extracted to a shared utility.
- **No tests** — zero test files in the entire codebase.

## Dead/Unused Code

- `src/components/ui/shader-background.tsx` — MeshGradient shader, was replaced but file still exists
- `src/components/ui/gooey-text-morphing.tsx` — was used on landing page, now removed
- `src/components/ui/radial-orbital-timeline.tsx` — original landing page component, no longer imported
- `src/components/ui/hero-modern.tsx` — v2 landing page, replaced by cinematic version
- `src/components/ui/container-scroll-animation.tsx` — Aceternity scroll component, no longer used
- `src/components/Card3D.tsx` — unused 3D card component
- `src/components/ParticleField.tsx` — unused particle effect

## Missing Features

- **No password reset flow** — users can sign up and sign in but can't reset forgotten passwords
- **No email confirmation handling** — Supabase sends confirmation emails but the app doesn't handle the callback
- **Profile page not linked from nav** — `/profile` route exists but isn't in the main NavBar items
- **GPA calculator is a standalone HTML iframe** — `public/gpa-calculator.html` is a separate app embedded via iframe. Harder to maintain, can't share React state directly.

## Type Safety

- Several `any` types in hooks and API routes
- `canvas-confetti` types imported but confetti ref typing is loose
- Some components use inline `style` objects that could be typed

## Build Warnings

- `allowTransparency` prop was removed but may still exist in v2 copy
- Unused imports flagged by IDE but not blocking builds
