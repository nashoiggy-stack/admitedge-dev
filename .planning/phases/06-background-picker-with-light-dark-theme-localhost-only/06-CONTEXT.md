# Phase 6: Background picker with light/dark theme (localhost-only) — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** Direct conversation with user (brainstorming) + seed plan at `~/.claude/plans/continue-the-background-picker-mutable-harbor.md`

<domain>
## Phase Boundary

This phase delivers a runtime user-controllable background picker plus a real light/dark theme system, replacing the build-time env-var gating currently in use. All work is **localhost-only** — changes stay uncommitted as source-code experiments per the project's existing convention for env-gated local features. Only the `.planning/` artifacts and the additive Supabase column will reach version-controlled state.

**In scope:**
- Floating picker widget visible on every page
- Three picker options: WebGL Shader (default), Dark, Light
- Real `next-themes`-driven light/dark theme infrastructure (CSS variables, Tailwind dark mode)
- Surface refactor for major themed surfaces (root layout, AppShell, 9 feature pages, primary cards, primary buttons)
- localStorage persistence via existing `setItemAndNotify` pattern
- Supabase cloud sync via existing `CLOUD_SYNC_MAP` (additive column `bg_preference`)
- Removal of orbiting-icons experiment

**Out of scope (this phase):**
- Pushing source changes to main / Vercel deploy
- Adding gradient or dotted-surface as picker options (future v2)
- Theming low-traffic surfaces (about, settings detail panes)
- `prefers-color-scheme` system-theme detection

</domain>

<decisions>
## Implementation Decisions

### Picker UI
- **Location:** Floating widget on every page (mounted inside `src/app/layout.tsx` so it appears on every route).
- **Position:** Fixed `bottom-4 right-4 z-50`.
- **Trigger:** Single button with a `Palette` icon from `lucide-react` (already in dep tree).
- **Open state:** Popover with three labeled buttons. Active option visually highlighted. Respects `prefers-reduced-motion` (no popover transition when reduced motion is requested).

### Background Options (v1)
1. **WebGL Shader** (default) — uses existing `WebGLShader` from `src/components/ui/web-gl-shader.tsx`. Forces theme to `dark` (the shader is designed for dark surface).
2. **Dark** — solid dark surface, no shader, theme = `dark`.
3. **Light** — solid light surface, no shader, theme = `light`. Triggers full theme flip across UI.

### Theme System
- **Library:** `next-themes` (small, SSR-safe, hydration-clean).
- **Wiring:** `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>` in `src/app/layout.tsx`.
- **Tailwind:** `darkMode: "class"` in tailwind config. Theme tokens resolve to CSS variables.
- **CSS variables (in `src/app/globals.css`):**
  - `--bg-base`, `--bg-surface`, `--text-primary`, `--text-muted`, `--border`, `--accent`
  - Defined under `:root` (light) and `.dark`.
- **Refactor priority:** root layout, `AppShell`, all 9 feature page wrappers, primary cards, primary buttons. Less-visited surfaces deferred (acceptable for localhost v1).

### Runtime Background Context
- **Provider:** New `src/components/BackgroundProvider.tsx` (React context).
- **Source of truth:** localStorage key `admitedge-bg-preference` with values `'shader' | 'dark' | 'light'`. Default `'shader'`.
- **Subscription:** Listens for `profile-source-updated` window event (existing pattern in `src/lib/sync-event.ts:33-39`) so cloud-sync writes from another tab/device propagate.
- **Setter:** `setBackground(value)` calls `setItemAndNotify('admitedge-bg-preference', value)` AND `setTheme(...)` from `next-themes`.

### AuroraBackground Refactor
- Replace the `USE_DOTTED_SURFACE` env gate (`src/components/AuroraBackground.tsx:9`) with a runtime read from `BackgroundProvider`.
- For `'shader'` → render `<WebGLShader />`. For `'dark'` and `'light'` → render only the themed surface (no shader, no dotted surface).
- Keep `src/components/ui/dotted-surface.tsx` on disk for future picker options. Stop importing for now.

### Landing Page (`src/app/page.tsx`)
- Drop the `USE_GRADIENT` env constant (line 8) and the `OrbitingSkills` swap.
- Use the same `BackgroundProvider`-driven approach as feature pages so the landing background follows the user's choice.

### Cloud Sync
- Add `'admitedge-bg-preference': 'bg_preference'` to `CLOUD_SYNC_MAP` in `src/lib/profile-sync.ts:11-23`.
- Update `loadFromCloud`'s explicit column list at `src/lib/profile-sync.ts:73` to include `bg_preference`.
- New Supabase migration file:
  ```sql
  ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS bg_preference TEXT DEFAULT 'shader';
  ```
- The migration is additive and backward compatible. Main can ignore the column safely.

### Files Untouched
- `src/app/api/grade/route.ts` — unrelated grader work, leave as user has it.
- `src/lib/prompts.ts` — same as above.
- `src/components/ui/dotted-surface.tsx` — keep on disk for future, just stop importing.

### Claude's Discretion
- Exact CSS variable values for the light theme palette (warm vs cool, contrast ratios) — pick sensible defaults that pass WCAG AA.
- Picker widget visual styling (size, popover layout) — keep modest and consistent with existing `lucide-react` + zinc/blue aesthetic.
- Whether to use `useEffect` or `useSyncExternalStore` for the localStorage subscription in `BackgroundProvider` — pick whichever is cleaner with Next.js 16.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project root instructions
- `CLAUDE.md` / `AGENTS.md` — **CRITICAL:** Next.js 16 has breaking changes from training data. Read `node_modules/next/dist/docs/` before adopting new APIs (e.g., new layout patterns, server-component conventions).

### Existing patterns to reuse
- `src/lib/sync-event.ts` — `setItemAndNotify` (line 33-39) and the `profile-source-updated` event contract.
- `src/lib/profile-sync.ts` — `CLOUD_SYNC_MAP` (lines 11-23) and `loadFromCloud` column list (line 73).
- `src/components/AuroraBackground.tsx` — current env-gated background component to refactor.
- `src/components/ui/web-gl-shader.tsx` — the default shader; render directly, do not rewrite.
- `src/app/layout.tsx` — root layout where providers and the picker widget will be mounted.
- `src/app/page.tsx` — landing page currently env-gated for orbiting-skills swap.

### Schema infra
- `supabase-setup.sql` — original schema (for column-add reference style).
- `supabase-migration-cloud-sync.sql` — prior migration (the new one mirrors this style).

</canonical_refs>

<specifics>
## Specific Ideas

- Localhost run: `pnpm dev` (or `npm run dev`) → http://localhost:3000.
- Verification flow: shader visible by default → picker → switch to Dark → no shader, dark UI legible → switch to Light → light UI, no contrast disasters → hard refresh → preference persists → navigate to `/essay`, `/gpa`, `/colleges`, `/profile`, `/chances` → picker visible everywhere, choice carries.
- Cross-device sync test (optional): run the migration in Supabase dashboard, sign in on a second browser, verify `bg_preference` syncs.
- After implementation, `git status` should still show source files as uncommitted (matching the existing local-only experiments convention).

</specifics>

<deferred>
## Deferred Ideas

- **Gradient option** — user explicitly asked to expose later, not in v1.
- **Dotted-surface option** — kept on disk for future, not exposed in v1 picker.
- **`prefers-color-scheme` system theme** — `enableSystem={false}` for now; can flip later.
- **Settings page** — picker is a floating widget for v1; a `/settings` route is out of scope.
- **Theming polish for low-traffic surfaces** — 80% coverage acceptable for localhost; full sweep deferred.

</deferred>

---

*Phase: 06-background-picker-with-light-dark-theme-localhost-only*
*Context gathered: 2026-04-16 via direct conversation + seed plan*
