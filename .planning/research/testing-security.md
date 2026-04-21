# Testing & Security Research: AdmitEdge (essay-grader-app)

**Researched:** 2026-04-07
**Source confidence:** HIGH — all findings verified against Next.js 16 bundled docs in `node_modules/next/dist/docs/` and direct codebase inspection.

---

## Current State Audit

Before recommendations, here is what the codebase has and lacks:

| Area | Current State | Risk |
|------|--------------|------|
| Tests | Zero test files, no test runner installed | HIGH |
| Anthropic API key | In `.env.local` (correct) | OK |
| Supabase URL | Hardcoded string in `src/lib/supabase.ts` | MEDIUM |
| Supabase anon key | Hardcoded string in `src/lib/supabase.ts` | MEDIUM — see note below |
| API rate limiting | None on any of the 5 API routes | HIGH |
| CSP headers | Not set anywhere | MEDIUM |
| Supabase RLS | Policies exist in `supabase-setup.sql` | OK, needs verification |

**Note on the Supabase "publishable" key:** The key in `supabase.ts` is prefixed `sb_publishable_` — Supabase anon/publishable keys are intentionally safe to expose in client-side code because RLS enforces access. However, moving it to an env var is still correct practice: it lets you rotate keys without a deploy, and prevents accidental exposure of a service-role key if someone copy-pastes the wrong value.

---

## 1. Vitest Setup for Next.js App Router

**Confidence:** HIGH (sourced from `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`)

### What Vitest Can and Cannot Test in App Router

**Can test with Vitest:**
- Pure utility functions (`wordCount`, `computeAdjustedScore`, `compareGPA`, `compareTests`, `classifyCollege`, `scoreToBand`, `essayScoreAdjustment` in `src/lib/admissions.ts`)
- Synchronous Client Components
- Custom hooks (with `renderHook` from React Testing Library)
- GPA calculation logic (the GPA calculator is in a static HTML file — the pure math functions in `src/lib/` are testable)

**Cannot test with Vitest (use Playwright instead):**
- `async` Server Components — Vitest does not support them as of Next.js 16
- API route handlers — these are async server functions; mock the handler logic and test units instead, or use Playwright for integration

### Installation

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

### `vitest.config.mts` (project root)

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**'],
      thresholds: { lines: 80 },
    },
  },
})
```

### `vitest.setup.ts` (project root)

```ts
import '@testing-library/jest-dom'
// Load Next.js env vars for tests
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
```

Install `@next/env` (it ships with Next.js already but install explicitly): already available via `next` package.

### `package.json` script additions

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Testing the Scoring Logic (high-value targets)

The scoring functions in `src/lib/admissions.ts` are pure functions with no side effects — ideal for unit tests.

```ts
// __tests__/admissions.test.ts
import { describe, it, expect } from 'vitest'
import {
  compareGPA,
  compareTests,
  classifyCollege,
  computeAdjustedScore,  // import from route.ts or extract to lib
  scoreToBand,
  essayScoreAdjustment,
} from '@/lib/admissions'

describe('compareGPA', () => {
  it('returns positive delta when user UW GPA exceeds school average', () => {
    const result = compareGPA(3.9, null, 3.5, 3.8)
    expect(result.delta).toBeGreaterThan(0)
  })

  it('returns no signals when both GPAs are null', () => {
    const result = compareGPA(null, null, 3.5, 3.8)
    expect(result.signals).toHaveLength(0)
    expect(result.metrics).toBe(0)
  })
})

describe('scoreToBand', () => {
  it('maps 75+ to strong', () => expect(scoreToBand(75)).toBe('strong'))
  it('maps 60-74 to competitive', () => expect(scoreToBand(60)).toBe('competitive'))
  it('maps 40-59 to possible', () => expect(scoreToBand(40)).toBe('possible'))
  it('maps 20-39 to low', () => expect(scoreToBand(20)).toBe('low'))
  it('maps <20 to very-low', () => expect(scoreToBand(19)).toBe('very-low'))
})
```

**Extract `computeAdjustedScore` from the API route:** Currently it lives inside `src/app/api/grade/route.ts` as a module-level function. Move it to `src/lib/scoring.ts` so Vitest can import it without loading the Next.js server runtime.

### Testing Hooks

```ts
// __tests__/useScoreColor.test.ts
import { renderHook } from '@testing-library/react'
import { useScoreColor } from '@/hooks/useScoreColor'
// add assertions per hook's contract
```

**Note on `useAuth` hook testing:** `useAuth` calls `supabase.auth.*` directly. Mock the Supabase client with `vi.mock('@/lib/supabase')` to test the hook in isolation.

### Testing API Route Logic (unit approach, not integration)

Do NOT import API route files directly into Vitest — they depend on `next/server` internals. Instead:
1. Extract business logic out of route handlers into `src/lib/` pure functions.
2. Test those functions with Vitest.
3. Test the full HTTP behavior with Playwright.

---

## 2. Playwright E2E for Critical Flows

**Confidence:** HIGH (sourced from `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`)

### Installation

```bash
npm init playwright@latest
# Choose: TypeScript, tests/ directory, add GitHub Actions CI
npx playwright install
```

### `playwright.config.ts` (project root)

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Use `npm run build && npm start` (not `next dev`) in the webServer config.** Running against the production build catches issues that dev mode masks, and Anthropic API calls behave identically.

### Critical Flow: Sign In

```ts
// tests/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('signs in with valid credentials', async ({ page }) => {
    await page.goto('/essay')
    // AuthGate should appear for unauthenticated users
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()

    // After sign-in, essay page should be accessible
    await expect(page.getByRole('heading', { name: /essay/i })).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/essay')
    await page.getByLabel(/email/i).fill('bad@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid/i)).toBeVisible()
  })

  test('enters as guest', async ({ page }) => {
    await page.goto('/essay')
    await page.getByRole('button', { name: /guest/i }).click()
    // Guest mode should allow essay page access
    await expect(page.getByText(/paste your essay/i)).toBeVisible()
  })
})
```

### Critical Flow: Grade Essay

```ts
// tests/grade.spec.ts
import { test, expect } from '@playwright/test'

const SAMPLE_ESSAY = `Growing up between two cultures taught me to navigate worlds that did not always speak the same language. My grandmother's kitchen smelled of cardamom and cumin, while my school cafeteria smelled of pizza and french fries. For years I tried to keep these worlds separate, embarrassed by my packed lunches and the language my parents spoke at home. Then, in my junior year chemistry class, I learned about catalysts — substances that lower activation energy and enable reactions that would not otherwise occur. I realized that I had been that catalyst all along. When my English teacher asked about idioms and I translated three simultaneously from three languages, when my basketball teammates asked me to help them talk to our new Brazilian player, when I explained American college applications to my cousins abroad — I was not straddling two cultures. I was building a bridge. This realization changed how I approached everything. I started a cultural exchange lunch table where students brought dishes from home. What began as six students grew to forty by spring. More importantly, students who had eaten alone started talking. I did not solve cultural division at my school, but I proved that connection is possible when someone lowers the activation energy for it. I want to study international relations because I believe the skill I have practiced my whole life — translating not just words but contexts, fears, and hopes — is exactly what the world needs more of. I am still learning the grammar of belonging, but I have stopped being embarrassed by my cardamom-scented backpack. It is my greatest asset.`

test('grades a valid essay and shows score', async ({ page }) => {
  await page.goto('/essay')
  // Enter as guest to skip auth for this flow
  const guestBtn = page.getByRole('button', { name: /guest/i })
  if (await guestBtn.isVisible()) await guestBtn.click()

  await page.getByPlaceholder(/paste your essay/i).fill(SAMPLE_ESSAY)
  await page.getByRole('button', { name: /grade/i }).click()

  // Wait for API response (60s timeout matches route maxDuration)
  await expect(page.getByText(/score/i)).toBeVisible({ timeout: 70_000 })
  // Score should be a number
  await expect(page.getByText(/\d+\/100/)).toBeVisible({ timeout: 70_000 })
})

test('rejects essay under 50 words', async ({ page }) => {
  await page.goto('/essay')
  const guestBtn = page.getByRole('button', { name: /guest/i })
  if (await guestBtn.isVisible()) await guestBtn.click()

  await page.getByPlaceholder(/paste your essay/i).fill('Too short.')
  await page.getByRole('button', { name: /grade/i }).click()
  await expect(page.getByText(/too short/i)).toBeVisible({ timeout: 10_000 })
})
```

### Critical Flow: GPA Page Loads

```ts
// tests/gpa.spec.ts
import { test, expect } from '@playwright/test'

test('GPA page renders calculator', async ({ page }) => {
  await page.goto('/gpa')
  await expect(page.getByRole('heading', { name: /gpa calculator/i })).toBeVisible()
  // The iframe containing the static GPA calculator
  const frame = page.frameLocator('iframe[title="GPA Calculator"]')
  await expect(frame.locator('body')).toBeVisible({ timeout: 10_000 })
})
```

### `.env.test` for Playwright credentials

```bash
# .env.test — committed (no secrets — use a dedicated test account)
TEST_USER_EMAIL=test@admitedge.dev
TEST_USER_PASSWORD=TestPassword123!
```

Create this Supabase account manually in the dashboard. Never use a real student's account.

---

## 3. Rate Limiting for Anthropic API Calls

**Confidence:** HIGH (Next.js docs pattern) + MEDIUM (implementation approach based on codebase analysis)

### Current Problem

Five API routes call Anthropic with no rate limiting:
- `/api/grade` — most expensive (claude-sonnet-4-6, 3000 tokens)
- `/api/chat` — moderate (1024 tokens)
- `/api/suggestions` — expensive (4096 tokens)
- `/api/ec-evaluate` — expensive (4000 tokens)
- `/api/ec-chat` — moderate

Without limiting, a single user or bot can exhaust the Anthropic API budget in minutes.

### Recommended Approach: In-Memory LRU with Sliding Window

For a single-process deployment (Vercel Serverless/Edge, single Node instance), use an in-memory sliding window. For multi-instance deployments, swap the store for Redis (Upstash is the standard serverless choice).

**Install:**
```bash
npm install lru-cache
```

**`src/lib/rate-limit.ts`:**
```ts
import { LRUCache } from 'lru-cache'

interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

const tokenCache = new LRUCache<string, number[]>({
  max: 500,           // track up to 500 distinct users
  ttl: 60 * 1000,     // entries expire after 60 seconds
})

export function checkRateLimit(
  userId: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const windowStart = now - options.windowMs
  const timestamps = (tokenCache.get(userId) ?? []).filter(
    (t) => t > windowStart
  )

  if (timestamps.length >= options.maxRequests) {
    const oldestInWindow = timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + options.windowMs - now,
    }
  }

  timestamps.push(now)
  tokenCache.set(userId, timestamps)

  return {
    allowed: true,
    remaining: options.maxRequests - timestamps.length,
    resetMs: 0,
  }
}
```

### Per-Endpoint Limits

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| `/api/grade` | 5 requests | 10 minutes | Essay grading: expensive, naturally slow user pace |
| `/api/suggestions` | 5 requests | 10 minutes | Same cost class as grading |
| `/api/ec-evaluate` | 3 requests | 10 minutes | Most expensive (4000 tokens) |
| `/api/chat` | 20 requests | 10 minutes | Chat is interactive, needs headroom |
| `/api/ec-chat` | 20 requests | 10 minutes | Same as chat |

### Identifying the User for Rate Limiting

The API routes currently have no auth check. Two options:

**Option A — Use Supabase session (recommended for authenticated users):** Read the Authorization header that Supabase JS sends automatically and extract the user ID from the JWT.

**Option B — Fall back to IP for guest users:**
```ts
function getRateLimitKey(req: NextRequest): string {
  // Try Authorization JWT first
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    try {
      // Decode without verify (verification happens in Supabase)
      const payload = JSON.parse(
        Buffer.from(auth.split('.')[1], 'base64').toString()
      )
      if (payload.sub) return `user:${payload.sub}`
    } catch {}
  }
  // Fall back to IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  return `ip:${ip}`
}
```

### Applying Rate Limiting to a Route

```ts
// src/app/api/grade/route.ts — add near the top of POST handler
import { checkRateLimit } from '@/lib/rate-limit'
import { getRateLimitKey } from '@/lib/rate-limit-key'

export async function POST(req: NextRequest) {
  const key = getRateLimitKey(req)
  const { allowed, remaining, resetMs } = checkRateLimit(key, {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
  })

  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(resetMs / 1000)} seconds.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(resetMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }
  // ... rest of handler
}
```

### Proxy-Level Rate Limiting (Alternative)

Next.js 16 has a `proxy.ts` file (equivalent to middleware in earlier versions). Rate limiting can live there to intercept all API routes in one place before they run. This is cleaner for cross-cutting concerns:

```ts
// proxy.ts (project root)
export const config = {
  matcher: '/api/:path*',
}

export function proxy(request: NextRequest) {
  // Apply global rate limit here
  // Per-endpoint limits still apply inside each route
}
```

**Use `proxy.ts` for a global 100 req/min IP-based guard, and per-route limits inside handlers for the per-user quotas.**

---

## 4. Supabase Row Level Security Patterns

**Confidence:** HIGH (existing SQL in `supabase-setup.sql` is correct) + MEDIUM (gap analysis based on codebase)

### What Is Already Correct

The `supabase-setup.sql` has the right pattern:
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

This is correct. `auth.uid()` is resolved server-side by Supabase using the JWT, so a client cannot spoof it.

### What Is Missing: DELETE Policy

There is no `DELETE` policy. If a user can insert a row (via `WITH CHECK`), they should also be able to delete their own row. Add:

```sql
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = user_id);
```

Without this, `DELETE` operations fail silently (RLS blocks them) or require the service role key.

### What Is Missing: The `USING` Clause on UPDATE

The current UPDATE policy only has `USING (auth.uid() = user_id)`. This controls which rows can be targeted. Best practice also adds `WITH CHECK (auth.uid() = user_id)` to prevent a user from updating a row to point to a different `user_id`:

```sql
-- Drop and recreate:
DROP POLICY "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Verify RLS Is Applied to All Tables

The project currently only has `user_profiles`. If you add more tables (e.g., `essay_history`, `ec_activities`), every new table must explicitly run `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. Supabase does not enable RLS by default on new tables.

### Server-Side vs Client-Side Supabase Calls

The current `src/lib/supabase.ts` creates a single client using the anon key. For API routes (server-side), this works because the anon key respects RLS. However, **the API routes never pass a user JWT to the Supabase client**, meaning Supabase sees them as unauthenticated — `auth.uid()` returns null. RLS then blocks all access.

This means `src/lib/profile-sync.ts` (called from the client-side `ProfileSync` component) works correctly because it sends the session JWT from the browser. But if you ever call Supabase from an API route on behalf of a user, you must pass the session:

```ts
// For server-side Supabase calls with user context:
import { createClient } from '@supabase/supabase-js'

function createSupabaseWithAuth(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  )
}
```

---

## 5. Environment Variable Management

**Confidence:** HIGH (sourced from Next.js 16 bundled docs `environment-variables.md` + direct codebase inspection)

### Current Issues

**Issue 1: Supabase credentials hardcoded in source**

`src/lib/supabase.ts` line 3-4:
```ts
const supabaseUrl = "https://qspnraniadsleifzyfxb.supabase.co"  // HARDCODED
const supabaseKey = "sb_publishable_IBioQr1MCp8OhlNPC2b-Yg_FFG5rODt"  // HARDCODED
```

**Issue 2: ANTHROPIC_API_KEY is in `.env.local` (correct) but not validated at startup.**

### Fix: Move Supabase Credentials to `.env.local`

Add to `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...  # already here
NEXT_PUBLIC_SUPABASE_URL=https://qspnraniadsleifzyfxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_IBioQr1MCp8OhlNPC2b-Yg_FFG5rODt
```

**Use `NEXT_PUBLIC_` prefix for Supabase values.** The Supabase client is instantiated in `src/lib/supabase.ts` which is imported by client components (`useAuth`, `ProfileSync`). Next.js only exposes `NEXT_PUBLIC_` prefixed vars to the browser bundle. Without the prefix, these values are `undefined` in client components.

The Anthropic key should NOT have `NEXT_PUBLIC_` — it is only used in server-side API routes.

### Updated `src/lib/supabase.ts`

```ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Validate the Anthropic Key at Startup

In each API route, the current code is:
```ts
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

The SDK silently uses `undefined` if the key is missing, producing a confusing 401 from Anthropic. Add an explicit check:

```ts
const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")
const anthropic = new Anthropic({ apiKey })
```

### `.env.example` File (commit this, not `.env.local`)

Create `/.env.example` at project root:
```bash
# Anthropic (server-only — never use NEXT_PUBLIC_ prefix)
ANTHROPIC_API_KEY=

# Supabase (safe to expose — RLS enforces access control)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Test accounts for Playwright E2E (use a dedicated test Supabase account)
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```

### Environment Variable Load Order (Next.js 16)

Next.js checks in this order, first match wins:
1. `process.env` (runtime)
2. `.env.$(NODE_ENV).local`
3. `.env.local` (not loaded when `NODE_ENV=test`)
4. `.env.$(NODE_ENV)`
5. `.env`

For Vitest, use `@next/env`'s `loadEnvConfig()` in the setup file (shown above) — `.env.local` is not automatically loaded for tests.

---

## 6. Content Security Policy

**Confidence:** HIGH (sourced from `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)

### This App's CSP Complexity

The app uses several external origins:
- **Three.js** (`three` npm package — bundled, not CDN) — no CSP impact
- **MapLibre GL** (`maplibre-gl` npm package — bundled) — no CSP impact, but loads map tiles and fonts from external URLs at runtime
- **Geist font** — loaded via `next/font/google`, which self-hosts the font files after the first build. CSP can allow `font-src 'self'`.
- **Paper Design Shaders** — npm package, bundled
- **WebGL** — used by Three.js and MapLibre: needs `'unsafe-eval'` only in dev (React dev tools use `eval`)

The actual CSP complexity comes from **MapLibre map tiles** (external raster/vector tile sources) and **Supabase API calls** (connect-src).

### Recommended Approach: `next.config.ts` Headers (No Nonce)

**Do not use nonces for this app.** Nonces require dynamic rendering on every page — meaning no static caching, higher server load, and PPR incompatibility. This app has no compliance requirement that prohibits `'unsafe-inline'` for styles.

Instead, use `next.config.ts` `headers()` with allowlisted external origins. This is the correct tradeoff for a college prep app.

```ts
// next.config.ts
import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

const cspHeader = [
  "default-src 'self'",
  // Scripts: self + dynamic imports. 'unsafe-eval' only in dev for React debugging.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Styles: Tailwind and CSS-in-JS need unsafe-inline
  "style-src 'self' 'unsafe-inline'",
  // Images: self, data URIs (canvas/Three.js snapshots), blob (MapLibre canvas export)
  "img-src 'self' data: blob:",
  // Fonts: Geist is self-hosted by next/font after first build
  "font-src 'self'",
  // Connect: Supabase auth + storage, Anthropic is server-side only (not connect-src)
  // MapLibre tile sources depend on which tile provider you configure
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.maptiler.com https://*.basemaps.cartocdn.com`,
  // Workers: MapLibre uses Web Workers for tile decoding
  "worker-src 'self' blob:",
  // WebGL canvas (used by Three.js and MapLibre)
  "child-src blob:",
  // Block everything else
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ")

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

### CSP Validation Steps

1. Deploy with CSP headers enabled.
2. Open browser DevTools → Console. CSP violations appear as red errors.
3. For MapLibre specifically: the tile source URLs in `src/components/ui/college-map.tsx` determine what goes in `connect-src`. Inspect network requests to find all external origins.
4. Check the `college-map.tsx` component — MapLibre's default style loads fonts from `https://fonts.gstatic.com` or `https://api.maptiler.com`. Add those to `font-src` and `connect-src` as needed.

### Why Not Nonces?

The Next.js 16 docs are explicit: nonce-based CSP forces dynamic rendering on all pages, disables CDN caching, and is incompatible with Partial Prerendering. Unless this app processes healthcare data or financial transactions, the cost is not worth it. `'unsafe-inline'` for styles combined with allowlisted script origins is the right tradeoff.

---

## Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 1 (CRITICAL) | Move Supabase credentials to env vars | 15 min |
| 2 (CRITICAL) | Add rate limiting to all 5 API routes | 2-3 hours |
| 3 (HIGH) | Install Vitest + write scoring logic tests | 2-3 hours |
| 4 (HIGH) | Add DELETE + UPDATE WITH CHECK to Supabase RLS | 10 min SQL |
| 5 (MEDIUM) | Install Playwright + write 3 critical flow tests | 3-4 hours |
| 6 (MEDIUM) | Add CSP headers to next.config.ts | 1-2 hours |
| 7 (LOW) | Add `.env.example`, validate keys at startup | 30 min |

---

## Open Questions Requiring Validation

1. **MapLibre tile source URLs**: The CSP `connect-src` needs exact tile provider origins. Inspect the `college-map.tsx` component's MapLibre style URL to enumerate all external resources.

2. **Vercel vs single-process deployment**: The in-memory LRU rate limiter works for single-process (local dev, traditional server). Vercel serverless functions are stateless — LRU state resets per cold start. For production on Vercel, replace `LRUCache` with Upstash Redis using the `@upstash/ratelimit` library. This is a straightforward swap since the interface is identical.

3. **Supabase RLS verification**: The policies in `supabase-setup.sql` need to be confirmed as applied in the live Supabase project. Run `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';` in the Supabase SQL editor to verify.

4. **Guest user essay grading + rate limiting**: Guest users have no `user_id`. The rate limiter falls back to IP. On shared networks (school WiFi, college library), IP-based limiting unfairly blocks multiple students. Consider a lightweight fingerprint (IP + User-Agent hash) or a guest session token stored in a cookie.
