# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Components: PascalCase (`ScoreOverview.tsx`, `ChatTab.tsx`, `EssayInput.tsx`)
- UI primitives: kebab-case (`container-scroll-animation.tsx`, `background-paths.tsx`, `shader-background.tsx`) in `src/components/ui/`
- Hooks: camelCase with `use` prefix (`useChat.ts`, `useGrading.ts`, `useScoreColor.ts`)
- Library/utility files: kebab-case (`parse-file.ts`, `profile-types.ts`, `suggestions-prompt.ts`)
- Data files: camelCase (`mockData.ts`, `colleges.ts`)
- API routes: kebab-case directories (`ec-evaluate/`, `ec-chat/`) containing `route.ts`

**Functions:**
- camelCase for all functions and handlers: `handleGrade`, `computeAdjustedScore`, `wordCount`
- Event handler props use `on` prefix: `onTextChange`, `onGrade`, `onClear`, `onSend`
- Hook return functions use verb-first: `send`, `reset`, `grade`, `clear`, `fetch`

**Variables:**
- camelCase: `essayText`, `gradingResult`, `chatEndRef`
- Booleans use `is`/`has` prefixes when standalone: `isHovered`, `isActive`, `hasFile`, `hasText`
- Booleans as props may omit prefix: `loading`, `dragging`, `guest`

**Types/Interfaces:**
- PascalCase with descriptive suffixes: `GradingResult`, `ChatMessage`, `SavedEssay`
- Props interfaces use `{ComponentName}Props`: `ChatTabProps`, `EssayInputProps`, `ScoreOverviewProps`
- Hook return types use `Use{Name}Return`: `UseChatReturn`, `UseGradingReturn`
- Type unions use PascalCase: `ActivityTier`, `ECBand`, `Classification`, `ChanceBand`

**Constants:**
- UPPER_SNAKE_CASE for module-level constants: `APP_CONFIG`, `CHAT_SUGGESTIONS`, `UPLOAD_ACCEPT`, `SCORE_THRESHOLDS`
- UPPER_SNAKE_CASE for storage keys: `PROFILE_STORAGE_KEY`, `EC_STORAGE_KEY`
- `as const` assertions on static arrays and objects for literal types

## Code Style

**Formatting:**
- No Prettier config detected; default ESLint formatting via `eslint-config-next`
- Semicolons: inconsistent (some files omit, most include)
- Quotes: double quotes predominate in JSX and strings
- Trailing commas: used in multi-line objects and arrays

**Linting:**
- ESLint 9 with flat config at `eslint.config.mjs`
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rules beyond Next.js defaults
- Run with: `npm run lint` (alias for `eslint`)

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`
- `readonly` modifier used consistently on interface properties for props and hook returns
- Type assertions used sparingly (e.g., `data as GradingResult`)
- `type` keyword used for imports: `import type { GradingResult } from "@/lib/types"`

## Component Patterns

**Component Declaration:**
- Named `const` exports with `React.FC<Props>` for most components:
  ```typescript
  export const ChatTab: React.FC<ChatTabProps> = ({ messages, input, ... }) => (
  ```
- Some components use plain function declarations (e.g., `Card3D`, page components):
  ```typescript
  export function Card3D({ children, className = "" }: Card3DProps) {
  ```
- Page components use `export default function`:
  ```typescript
  export default function Home() {
  ```

**Props:**
- All props interfaces mark properties as `readonly`
- Event callbacks named with `on` prefix in props, but use verb-first in hook returns
- `className` passed through as optional prop on wrapper components
- Refs typed as `React.RefObject<HTMLElement | null>`

**Client/Server Boundary:**
- All interactive components and hooks use `"use client"` directive at top of file
- API routes in `src/app/api/` are server-side (no directive needed)
- Layout (`src/app/layout.tsx`) is a server component; wraps children in `AppShell` client component

**State Management:**
- Custom hooks encapsulate all state logic; page components compose hooks
- No external state management library (no Zustand, Redux, etc.)
- localStorage used for cross-page data sharing (essay scores, profile data)
- Context used only for auth: `AuthProvider` + `useAuthContext()`
- Pattern: hooks return readonly objects with state + actions

**Animation:**
- `motion/react` (Framer Motion v12+) for all component animations
- `AnimatePresence` for enter/exit animations on conditional renders
- `motion.div`, `motion.button`, `motion.span` used extensively
- Spring physics for interactive elements: `useSpring`, `useMotionValue`
- `whileHover` and `whileTap` for micro-interactions on buttons
- GSAP imported but usage limited to specific visual components

## Import Organization

**Order:**
1. `"use client"` directive (when present)
2. React imports (`React`, `useState`, `useRef`, etc.)
3. Third-party libraries (`motion/react`, `next/link`, `next/navigation`)
4. Internal components (`@/components/...`)
5. Internal hooks (`@/hooks/...`)
6. Internal lib/data (`@/lib/...`, `@/data/...`)
7. Type-only imports (`import type { ... }`)

**Path Aliases:**
- `@/*` resolves to `./src/*` -- use this for all internal imports
- Relative imports (`./`) used only for sibling files within the same directory

## Styling Approach

**Primary:** Tailwind CSS v4 via `@tailwindcss/postcss`
- Utility-first inline classes on JSX elements
- `cn()` helper from `@/lib/utils` for conditional class merging (clsx + tailwind-merge)
- Class variance authority (`cva`) for component variants (see `src/components/ui/button.tsx`)

**Color Palette:**
- Dark theme only (hardcoded `dark` class on `<html>`)
- Background: `#06060f` (`bg-[#06060f]`)
- Surface: `#0c0c1a` with 90% opacity (`bg-[#0c0c1a]/90`)
- Text: zinc scale (`text-zinc-200`, `text-zinc-300`, `text-zinc-400`, `text-zinc-500`, `text-zinc-600`)
- Accent: blue scale (`blue-400`, `blue-500`, `blue-600`)
- Success: emerald scale (`emerald-400`, `emerald-500`)
- Warning: amber scale (`amber-400`, `amber-500`)
- Error: red scale (`red-400`, `red-500`)
- Borders: white with low alpha (`border-white/[0.06]`, `ring-white/[0.06]`)

**Custom CSS Classes (in `src/app/globals.css`):**
- `.glass` -- glassmorphism card surface (semi-transparent bg + border + backdrop-filter)
- `.text-gradient` -- blue gradient text effect for headings
- `.shimmer` -- loading animation for progress bars
- `.animate-pulse-glow` -- pulsing blue glow for loading states

**Spacing/Layout:**
- Max width container: `max-w-5xl` with `mx-auto px-4`
- Section spacing: `py-10 sm:py-20`, `mt-12`, `space-y-10`
- Card padding: `p-6 sm:p-8`
- Rounded corners: `rounded-xl` (default), `rounded-2xl` (cards), `rounded-full` (badges/pills)

## Error Handling

**Patterns:**
- API routes: try/catch wrapping entire handler, return `NextResponse.json({ error: ... }, { status: N })`
- Client hooks: try/catch in async functions, store error string in state, display in UI
- Empty catch blocks exist in non-critical paths (e.g., localStorage writes): `try { ... } catch {}`
- Catch clauses use bare `catch` (no parameter) for ignored errors

## Logging

**Framework:** `console.error` only
- Used in API routes for server-side error logging: `console.error("Grading error:", err)`
- No structured logging library

## Comments

**When Used:**
- Section dividers with Unicode box-drawing characters: `// -- Section Name ---`
- Inline explanations for non-obvious math: `// Penalty scales: up to ~15 points off...`
- TODO-style comments for known limitations

**JSDoc/TSDoc:**
- Not used; types serve as documentation

## Function Design

**Size:** Most functions are under 50 lines; page components can be longer (100-300 lines)

**Parameters:** Destructured props in components; positional params in utility functions

**Return Values:** Hooks return typed objects with readonly properties; API routes return `NextResponse.json()`

## Module Design

**Exports:**
- Named exports for components, hooks, types, and utilities
- Default exports only for Next.js page components (`export default function`)
- No barrel files (`index.ts`) -- import directly from the specific file

**Type Organization:**
- Domain types co-located in `src/lib/` by feature: `types.ts`, `profile-types.ts`, `college-types.ts`, `extracurricular-types.ts`
- Constants co-located with their types (e.g., `EMPTY_PROFILE` in `profile-types.ts`)
- Shared UI data in `src/data/mockData.ts`

---

*Convention analysis: 2026-04-07*
