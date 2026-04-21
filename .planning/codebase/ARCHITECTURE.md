# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Next.js App Router client-heavy SPA with API routes as AI proxy layer

**Key Characteristics:**
- All pages are `"use client"` — no server components used for page content
- Custom hooks encapsulate all feature logic (data fetching, state, side effects)
- API routes serve as thin proxies to the Anthropic Claude API
- localStorage is the primary client-side data store; Supabase provides optional cloud sync for authenticated users
- Cross-feature data sharing happens through localStorage keys (not global state)

## Layers

**Presentation Layer (Pages):**
- Purpose: Route-level page components that compose feature UIs
- Location: `src/app/*/page.tsx`
- Contains: Page layout, hook wiring, component composition
- Depends on: Components, Hooks
- Used by: Next.js App Router

**Component Layer:**
- Purpose: Reusable UI components (presentational and feature-specific)
- Location: `src/components/`
- Contains: React components receiving props from pages or hooks
- Depends on: `src/lib/` types, `src/components/ui/` primitives
- Used by: Pages

**Hook Layer (Business Logic):**
- Purpose: Encapsulates all feature state, data fetching, and side effects
- Location: `src/hooks/`
- Contains: Custom hooks that own `useState`/`useEffect` for each feature
- Depends on: API routes (via `fetch`), localStorage, `src/lib/` types
- Used by: Pages

**API Layer:**
- Purpose: Server-side proxy to Anthropic Claude API
- Location: `src/app/api/*/route.ts`
- Contains: POST handlers that construct prompts, call Claude, parse JSON responses
- Depends on: `@anthropic-ai/sdk`, `src/lib/prompts.ts`, `src/lib/ec-prompts.ts`
- Used by: Client hooks via `fetch()`

**Library Layer:**
- Purpose: Shared types, prompt templates, utility functions, business logic
- Location: `src/lib/`
- Contains: TypeScript types, AI prompt builders, admissions scoring algorithms, file parsing
- Depends on: External packages (`mammoth`, `pdf-parse`, `@supabase/supabase-js`)
- Used by: API routes, hooks, components

**Data Layer:**
- Purpose: Static data and configuration constants
- Location: `src/data/`
- Contains: College database, app configuration, UI labels
- Depends on: Nothing
- Used by: Hooks, components

## Data Flow

**Essay Grading Flow:**

1. User enters text or uploads file in `src/app/essay/page.tsx`
2. `useEssayInput` hook manages text state, file handling, word count
3. `useGrading` hook sends POST to `/api/grade` with essay text or FormData
4. `src/app/api/grade/route.ts` parses input, calls Claude with `GRADING_SYSTEM_PROMPT`, parses JSON response, computes adjusted scores
5. Result (`GradingResult`) stored in hook state and partial scores saved to `localStorage("essay-grader-result")`
6. UI renders via `ScoreOverview`, `CommonAppTab`, `VspiceTab`, `FeedbackTab`, `LineNotesTab`

**Chat Coaching Flow:**

1. User types question in `ChatTab` after grading completes
2. `useChat` hook sends POST to `/api/chat` with message, essay text, grading result, and conversation history
3. API route builds system prompt with essay context and calls Claude
4. Response appended to messages array in hook state

**Inline Suggestions Flow:**

1. User picks focus area (clarity, conciseness, etc.) in `InlineEditor`
2. `useSuggestions` hook sends POST to `/api/suggestions` with essay text and focus
3. API route calls Claude with focus-specific prompt, returns `InlineSuggestion[]`
4. Suggestions rendered as highlights; accept/dismiss modifies essay text

**Extracurricular Evaluation Flow:**

1. User creates activities in `src/app/extracurriculars/page.tsx` via `useECEvaluator`
2. Each activity is a conversation — messages sent to `/api/ec-chat`
3. When activities are marked done, `evaluate()` sends all conversations to `/api/ec-evaluate`
4. Result (`ProfileEvaluation`) stored in `localStorage("ec-evaluator-result")`

**Cross-Feature Data Sharing (localStorage Bridge):**

1. Essay grader saves `{ rawScore, vspiceComposite }` to `localStorage("essay-grader-result")`
2. GPA calculator saves state to `localStorage("gpa-calc-v1")`
3. EC evaluator saves result to `localStorage("ec-evaluator-result")`
4. `useProfile` hook reads all three keys and merges into a unified `UserProfile`
5. `useChanceCalculator` and `useCollegeFilter` auto-fill from `localStorage("admitedge-profile")`
6. `ProfileSync` component watches localStorage changes and syncs to Supabase for authenticated users

**State Management:**
- No global state library (no Redux, Zustand, Jotai)
- Each page owns its state via custom hooks
- `AuthContext` is the only React Context (provided via `AuthProvider`)
- Cross-feature communication uses localStorage as a shared bus
- Cloud sync is optional, handled by `ProfileSync` component polling localStorage every 5 seconds

## Key Abstractions

**Custom Hooks as Feature Controllers:**
- Purpose: Each feature has a dedicated hook that owns all logic
- Examples: `src/hooks/useGrading.ts`, `src/hooks/useChat.ts`, `src/hooks/useECEvaluator.ts`, `src/hooks/useChanceCalculator.ts`, `src/hooks/useCollegeFilter.ts`, `src/hooks/useProfile.ts`
- Pattern: Hook returns readonly state + action functions; page wires them to components

**AI Prompt Builders:**
- Purpose: Construct structured prompts for Claude API calls
- Examples: `src/lib/prompts.ts` (essay grading + chat), `src/lib/ec-prompts.ts` (EC evaluation + chat), `src/lib/suggestions-prompt.ts` (inline suggestions)
- Pattern: Functions that take context data and return system prompt strings

**Admissions Scoring Engine:**
- Purpose: Client-side algorithms for college classification and chance calculation
- Examples: `src/lib/admissions.ts` (GPA comparison, test comparison, selectivity penalty, essay adjustment)
- Pattern: Pure functions that compute scores and signals from user inputs vs. college data

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Loads fonts, applies dark theme, wraps children in `AppShell`

**AppShell:**
- Location: `src/components/AppShell.tsx`
- Triggers: Wraps all pages
- Responsibilities: Provides `AuthProvider` > `AuthGate` > `ProfileSync` + `NavBarWrapper` + children

**Landing Page:**
- Location: `src/app/page.tsx` (root `/`)
- Triggers: Direct navigation
- Responsibilities: GSAP scroll animation, feature showcase, CTAs to other tools

**Feature Pages:**
- Location: `src/app/essay/page.tsx`, `src/app/gpa/page.tsx`, `src/app/extracurriculars/page.tsx`, `src/app/colleges/page.tsx`, `src/app/chances/page.tsx`, `src/app/profile/page.tsx`
- Triggers: Navigation via NavBar
- Responsibilities: Each page instantiates its hook and composes its UI

## Error Handling

**Strategy:** Try-catch at every async boundary with user-facing error messages

**Patterns:**
- API routes: try-catch wrapping Claude calls, return `{ error: string }` with appropriate HTTP status
- Hooks: `catch` blocks set an `error` state string displayed in UI
- localStorage reads: wrapped in try-catch with silent fallback (`catch { /* ignore */ }`)
- No centralized error boundary or error reporting service

## Cross-Cutting Concerns

**Logging:** `console.error` and `console.warn` in API routes and sync logic; no structured logging
**Validation:** Minimal — API routes check for empty input; no schema validation (no Zod)
**Authentication:** Supabase Auth via `useAuth` hook, exposed through `AuthContext`. `AuthGate` component blocks unauthenticated access except for `/gpa` (public route). Guest mode bypasses auth entirely.
**Animation:** Heavy use of Framer Motion (`motion/react`) for page transitions and GSAP for the landing page scroll animation

---

*Architecture analysis: 2026-04-07*
