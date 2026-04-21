# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- TypeScript 5.x - All application code (`.ts` and `.tsx`)

**Secondary:**
- SQL - Database schema (`supabase-setup.sql`)
- CSS - Tailwind CSS v4 utility classes plus global styles

## Runtime

**Environment:**
- Node.js (server runtime for API routes, configured via `export const runtime = "nodejs"` in each route)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.2.2 - Full-stack React framework with App Router (`next.config.ts`)
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering

**Build/Dev:**
- Turbopack - Dev server bundler (configured in `next.config.ts` via `turbopack.root`)
- PostCSS with `@tailwindcss/postcss` plugin (`postcss.config.mjs`)
- TypeScript compiler - Target ES2017, bundler module resolution (`tsconfig.json`)

**Styling:**
- Tailwind CSS v4 - Utility-first CSS framework
- `tailwind-merge` 3.5.0 - Class merging utility
- `clsx` 2.1.1 - Conditional class composition
- `class-variance-authority` 0.7.1 - Component variant management

**Linting:**
- ESLint 9.x with flat config (`eslint.config.mjs`)
- `eslint-config-next` 16.2.2 - Next.js core-web-vitals + TypeScript rules

## Key Dependencies

**Critical (AI/LLM):**
- `@anthropic-ai/sdk` 0.82.0 - Claude API client for all AI features (grading, chat, suggestions, EC evaluation). Model used: `claude-sonnet-4-6`

**Critical (Backend-as-a-Service):**
- `@supabase/supabase-js` 2.101.1 - Supabase client for auth and database (`src/lib/supabase.ts`)

**File Parsing:**
- `pdf-parse` 2.4.5 - PDF text extraction (`src/lib/parse-file.ts`)
- `mammoth` 1.12.0 - Word document (.doc/.docx) text extraction (`src/lib/parse-file.ts`)

**Animation & Visual:**
- `framer-motion` 12.38.0 / `motion` 12.38.0 - React animation library
- `gsap` 3.14.2 - GreenSock animation platform
- `three` 0.183.2 - 3D graphics / WebGL
- `@paper-design/shaders-react` 0.0.72 - Shader-based visual effects (`src/components/ui/shader-*.tsx`)
- `canvas-confetti` 1.9.4 - Confetti effects

**Maps:**
- `maplibre-gl` 5.22.0 - Open-source map rendering (`src/components/ui/college-map.tsx`)

**UI Components:**
- `@radix-ui/react-slot` 1.2.4 - Primitive slot component for composition
- `lucide-react` 1.7.0 - Icon library
- `next-themes` 0.4.6 - Theme management (dark mode)
- `react-use-measure` 2.1.7 - Element measurement hook

## Typography

**Fonts (via `next/font/google`):**
- Geist Sans (`--font-geist-sans`) - Primary sans-serif
- Geist Mono (`--font-geist-mono`) - Monospace

Configured in `src/app/layout.tsx`.

## Configuration

**TypeScript:**
- `tsconfig.json`: Strict mode enabled, ES2017 target, bundler module resolution
- Path alias: `@/*` maps to `./src/*`

**Build:**
- `next.config.ts`: Minimal config, Turbopack root set to `__dirname`
- `postcss.config.mjs`: Tailwind CSS v4 PostCSS plugin
- `eslint.config.mjs`: Next.js core-web-vitals + TypeScript flat config

**Environment:**
- `.env.local` present - Contains `ANTHROPIC_API_KEY` (used in all API routes)
- Supabase URL and anon key are hardcoded in `src/lib/supabase.ts` (publishable key, not secret)

## Platform Requirements

**Development:**
- Node.js with npm
- `ANTHROPIC_API_KEY` environment variable required for AI features

**Production:**
- Vercel-compatible (Next.js App Router with `maxDuration = 60` on API routes)
- API routes use `export const runtime = "nodejs"` and `export const maxDuration = 60`

## Scripts

```bash
npm run dev        # Start dev server (next dev with Turbopack)
npm run build      # Production build (next build)
npm run start      # Start production server (next start)
npm run lint       # Run ESLint
```

---

*Stack analysis: 2026-04-07*
