---
phase: 01-landing-page-fix-critical
plan: 01
subsystem: ui
tags: [framer-motion, useScroll, useTransform, scroll-animation, landing-page, sticky-container]

requires:
  - phase: none
    provides: n/a
provides:
  - Landing page with framer-motion scroll-driven animation (no GSAP)
  - SSR-safe hero text visible on first paint
  - Sticky container scroll pattern (700vh outer, 100vh sticky inner)
affects: [02-security-cleanup]

tech-stack:
  added: []
  patterns: [sticky-container-scroll, useScroll-useTransform-keyframe-maps, scale-not-width-height-animation]

key-files:
  created: []
  modified:
    - src/app/page.tsx

key-decisions:
  - "Used single multi-keyframe useTransform maps for card rise+exit instead of separate transforms"
  - "Extracted FeatureCard into a sub-component to keep useTransform hooks at component top level"
  - "Card is always 100vw x 100vh with scale transform for expansion, never animating width/height"

patterns-established:
  - "Sticky container pattern: 700vh outer div with 100vh sticky inner for scroll-driven animations"
  - "useSpring wrapping scrollYProgress for smooth scrubbing (stiffness: 100, damping: 30)"
  - "useTransform with derived string values for CSS filter properties like blur"

requirements-completed: [REQ-01, REQ-02, REQ-03, REQ-04]

duration: 3min
completed: 2026-04-08
---

# Phase 1 Plan 01: Landing Page Scroll Animation Summary

**Replaced GSAP ScrollTrigger with framer-motion useScroll + sticky container pattern, eliminating black-screen flash caused by visibility:hidden**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-08T05:27:10Z
- **Completed:** 2026-04-08T05:29:43Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed all GSAP/ScrollTrigger code and visibility:hidden patterns from landing page
- Implemented 6-phase scroll animation using framer-motion useScroll + useTransform + useSpring
- Hero text renders at opacity 1 on first paint -- no JavaScript required for initial visibility
- All 5 tool pages build and serve correctly (essay, gpa, extracurriculars, colleges, chances)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite page.tsx from GSAP to framer-motion scroll animation** - `d8ed094` (feat)
2. **Task 2: Verify tool pages still work and landing page renders correctly** - verification only, no code changes

## Files Created/Modified
- `src/app/page.tsx` - Complete rewrite: GSAP removed, framer-motion scroll animation with sticky container pattern

## Decisions Made
- Used single multi-keyframe useTransform maps for card Y position (rise at 0.05-0.3, exit at 0.85-1.0) instead of separate transforms
- Extracted FeatureCard as a sub-component so useTransform hooks inside the map are called at component top level (stable hook order)
- Card always sized at 100vw x 100vh with scale transform for "expansion" effect -- compositor-only, no layout reflow
- Used useSpring with stiffness:100/damping:30 wrapping scrollYProgress for smooth scrubbing equivalent to GSAP's scrub:1
- Derived CSS filter strings via useTransform callback (blur values) rather than separate style properties

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Landing page is stable with framer-motion scroll animation
- Ready for Phase 2 (Security + Cleanup) which can remove unused GSAP-related component files
- container-scroll-animation.tsx still exists but is not imported by page.tsx (cleanup candidate for Phase 2)

---
*Phase: 01-landing-page-fix-critical*
*Completed: 2026-04-08*

## Self-Check: PASSED
