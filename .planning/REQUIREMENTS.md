# Requirements — AdmitEdge v1.1

## v1.1 Scope: Fix, Polish, and Resume Builder

### MUST HAVE

| ID | Requirement | Area |
|----|-------------|------|
| REQ-01 | Landing page shows hero text on first paint — no black screen, no GSAP visibility tricks | Landing |
| REQ-02 | Landing page has scroll-driven animation using framer-motion (not GSAP ScrollTrigger) | Landing |
| REQ-03 | Scroll animation: hero text fades → card rises via scale → features animate in → card exits → CTA appears | Landing |
| REQ-04 | All 5 existing tools work correctly after landing page changes | Stability |
| REQ-05 | Move Supabase credentials from hardcoded strings to NEXT_PUBLIC_ env vars | Security |
| REQ-06 | Add rate limiting to all 5 Anthropic API routes (grade, chat, suggestions, ec-chat, ec-evaluate) | Security |
| REQ-07 | Remove dead/unused component files (shader-background, gooey-text, radial-orbital-timeline, hero-modern, container-scroll, Card3D, ParticleField) | Cleanup |
| REQ-08 | Extract duplicate GPA calculation logic into shared utility | Cleanup |
| REQ-09 | Add Profile link to NavBar | UX |
| REQ-10 | Unit tests for scoring logic in admissions.ts (compareGPA, compareTests, classifyCollege, essayScoreAdjustment) | Testing |
| REQ-11 | Resume/Activities section builder matching Common App format (10 activities, 150-char descriptions) | Feature |
| REQ-12 | Resume builder pre-fills from EC evaluator results when available | Feature |
| REQ-13 | Resume builder generates printable/PDF output | Feature |

### SHOULD HAVE

| ID | Requirement | Area |
|----|-------------|------|
| REQ-14 | Playwright E2E test for sign-in → grade essay flow | Testing |
| REQ-15 | Fix Supabase RLS: add DELETE policy and WITH CHECK on UPDATE | Security |
| REQ-16 | Add error boundaries to prevent full-page crashes | Stability |
| REQ-17 | Mobile bottom tab navigation for 5+ tools | UX |
| REQ-18 | Auto-save with debounce + "Saved" indicator on essay/EC tools | UX |
| REQ-19 | Content Security Policy headers in next.config.ts | Security |

### NICE TO HAVE

| ID | Requirement | Area |
|----|-------------|------|
| REQ-20 | Cross-tool handoff CTAs ("Use this essay for Stanford" → opens college matcher) | UX |
| REQ-21 | "Continue where you left off" banner on return visits | UX |
| REQ-22 | Password reset flow | Auth |
| REQ-23 | Lazy-load MapLibre GL on chances page | Performance |

### OUT OF SCOPE (v1.1)

- Scholarship finder
- Letter of recommendation helper
- Application deadline tracker
- Paid tier / monetization
- Mobile native app
