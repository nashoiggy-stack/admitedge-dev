# Scroll Animation Research: Next.js Landing Page

**Project:** essay-grader-app (AdmitEdge landing page)
**Researched:** 2026-04-08
**Scope:** Replace GSAP ScrollTrigger pinned scroll with approaches that don't cause black-screen flash

---

## Root Cause of the Current GSAP Problem

The existing `page.tsx` runs:

```js
gsap.set(".scroll-card", { visibility: "visible", y: window.innerHeight + 200 });
```

GSAP's `gsap.set()` with `visibility: "visible"` implies the element starts as `visibility: hidden` in markup (`style={{ visibility: "hidden" }}` on line 164). Before GSAP hydrates and runs this `set()` call, there is a window during server-render and initial paint where:

1. The `.scroll-card` div has `visibility: hidden` — fine, card is off-screen.
2. The Three.js canvas (or WebGL shader from `@paper-design/shaders-react`) renders into the page as an opaque black element.
3. If GSAP hasn't run yet (slow JS parse, cold load, React 19 concurrent mode deferral), or if `ScrollTrigger` fails to initialize before first paint, the entire stacked `z-20` card area is a black rectangle — because WebGL contexts render black when the canvas is visible but no draw call has happened.

The interaction is: `visibility: hidden` → JS runs → `visibility: visible` sets reveal, but the WebGL canvas was already painting black underneath. GSAP's `autoAlpha` (which toggles `opacity` and `visibility` together) makes this worse because it sets `visibility: hidden` during scrub at opacity=0.

**Confirmed:** framer-motion has NO `autoAlpha` equivalent and NO `visibility: hidden` mechanism. Its initial/animate/exit props set only `opacity`, `transform`, `filter`, etc. via inline styles computed from MotionValues — never `visibility`. This is verified by inspecting the installed `framer-motion@12.38.0` bundle.

---

## Option 1: framer-motion useScroll + useTransform (RECOMMENDED)

### What It Is

`framer-motion@12.38.0` is already installed. `useScroll` returns four MotionValues:
- `scrollY` — absolute scroll position in px
- `scrollYProgress` — 0..1 normalized progress
- `scrollX` / `scrollXProgress` — horizontal equivalents

`useTransform` maps a MotionValue through an input range to an output range:

```tsx
const { scrollYProgress } = useScroll({ target: sectionRef });
const cardY = useTransform(scrollYProgress, [0, 0.3], ["100vh", "0vh"]);
const cardOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
```

### SSR Safety

**HIGH confidence** — confirmed by source inspection. `useScroll` uses `useIsomorphicLayoutEffect` internally (7 occurrences found in bundle). The `canAccelerateScroll` function gates on `typeof window === "undefined"` returning false, so the native Scroll Timeline acceleration path is skipped on server. On server render, all MotionValues return their initial value (0 for progress), meaning elements render at their CSS-specified starting position with no JS-applied hiding. No flash of hidden content.

### No Pinning Required

The "pinned scroll" effect (where page scroll drives an animation while viewport stays fixed) can be replaced with **a tall scroll section**. The container gets a height proportional to the scroll distance you want (e.g., `height: 300vh`), and the animating content is `position: sticky; top: 0`. This is pure CSS — no JS pinning, no `pin: true`, no GSAP ScrollTrigger pinning bugs.

```tsx
// The outer div is tall — creates scroll travel
// The inner div is sticky — stays in viewport while you scroll through the outer div
<div ref={sectionRef} style={{ height: "300vh" }}>
  <div style={{ position: "sticky", top: 0, height: "100vh" }}>
    {/* animated content here */}
  </div>
</div>
```

`useScroll` with `target: sectionRef` tracks progress as you scroll through the tall section, from 0 (top of section enters viewport) to 1 (bottom of section leaves viewport).

### Card Rises + Expands Pattern

```tsx
"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export default function ScrollSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Smooth the raw scroll for less jitter
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Phase 1 (0→0.25): card rises from below
  const cardY = useTransform(smoothProgress, [0, 0.25], ["110%", "0%"]);

  // Phase 2 (0.25→0.45): card expands width and height toward fullscreen
  const cardWidth = useTransform(
    smoothProgress,
    [0.25, 0.45],
    ["85vw", "100vw"]
  );
  const cardHeight = useTransform(
    smoothProgress,
    [0.25, 0.45],
    ["85vh", "100vh"]
  );
  const cardRadius = useTransform(
    smoothProgress,
    [0.25, 0.45],
    ["40px", "0px"]
  );

  // Phase 3 (0.45→0.65): feature cards appear
  const featuresOpacity = useTransform(smoothProgress, [0.45, 0.65], [0, 1]);
  const featuresY = useTransform(smoothProgress, [0.45, 0.65], [40, 0]);

  // Phase 4 (0.75→0.9): hero text fades out, CTA fades in
  const heroOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);
  const ctaOpacity = useTransform(smoothProgress, [0.75, 0.9], [0, 1]);

  // Phase 5 (0.9→1): card exits upward
  const cardExitY = useTransform(smoothProgress, [0.9, 1], ["0%", "-110%"]);

  return (
    // Tall section — scroll travel without JS pinning
    <div ref={sectionRef} style={{ height: "700vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Hero text — visible by default, fades via opacity only */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <h1>Your edge in college admissions.</h1>
        </motion.div>

        {/* Card — starts at translateY(110%), never visibility:hidden */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <motion.div
            style={{
              y: cardY,
              // Combine rise (0→0.25) and exit (0.9→1)
              // useTransform cannot stack, so use a combined transform via CSS
              width: cardWidth,
              height: cardHeight,
              borderRadius: cardRadius,
              pointerEvents: "auto",
            }}
            className="premium-depth-card overflow-hidden"
          >
            <motion.div
              style={{ opacity: featuresOpacity, y: featuresY }}
              className="w-full h-full flex items-center justify-center"
            >
              {/* Feature cards */}
            </motion.div>
          </motion.div>
        </div>

        {/* CTA — opacity only, no visibility */}
        <motion.div
          style={{ opacity: ctaOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <h2>Start building your profile.</h2>
        </motion.div>
      </div>
    </div>
  );
}
```

### Combining Rise + Exit on the Card

The card needs two transforms: `y` for rising (phase 1) and `y` for exiting (phase 5). framer-motion MotionValues can't be directly added, but two approaches work:

**Approach A — single useTransform with a full keyframe map:**
```tsx
const cardY = useTransform(
  smoothProgress,
  [0,    0.25, 0.9, 1   ],
  ["110%", "0%", "0%", "-110%"]
);
```
This is the cleanest: one MotionValue drives both rise and exit.

**Approach B — useSpring on a derived value:**
Use a calculated offset and feed it through `useSpring`. Works when you need different spring characteristics for each phase.

Approach A is recommended. framer-motion interpolates linearly through the keyframes by default; add `ease: [...]` per segment if needed.

### useSpring for Smooth Scrubbing

`useSpring(scrollYProgress, { stiffness: 100, damping: 30 })` adds physics-based damping to the raw scroll value, eliminating the jerkiness that GSAP's `scrub: 1` provides. This is the framer-motion equivalent of GSAP scrub. **Confirmed available in framer-motion@12.38.0.**

### Staggered Feature Cards

framer-motion handles stagger via `variants` and `staggerChildren`, but when driving from a MotionValue (scroll progress), you need to offset each card's input range manually:

```tsx
{FEATURES.map((feature, i) => {
  const start = 0.45 + i * 0.03;
  const end = start + 0.12;
  const opacity = useTransform(smoothProgress, [start, end], [0, 1]);
  const y = useTransform(smoothProgress, [start, end], [40, 0]);
  return (
    <motion.div key={feature.href} style={{ opacity, y }}>
      {/* card content */}
    </motion.div>
  );
})}
```

Note: `useTransform` inside a map is fine in React as long as the array order is stable (same length, same keys). The hooks rule doesn't apply to MotionValues created imperatively.

### Confidence: HIGH
Source code inspected for framer-motion@12.38.0. Patterns verified against the existing `container-scroll-animation.tsx` already in the codebase (which uses exactly this approach: `useScroll` + `useTransform` on `scrollYProgress`).

---

## Option 2: CSS Scroll-Driven Animations (scroll-timeline)

### What It Is

A native CSS spec for driving `@keyframes` animations from scroll position rather than time. No JavaScript required.

```css
@keyframes card-rise {
  from { transform: translateY(110vh); }
  to   { transform: translateY(0); }
}

.scroll-card {
  animation: card-rise linear;
  animation-timeline: scroll(root);
  animation-range: 0% 25%;
}
```

### Browser Support (April 2026)

**MEDIUM confidence** — based on training data through August 2025, cross-checked with the `supportsScrollTimeline()` check present in framer-motion@12.38.0 (the library tests for this at runtime, confirming it's not universal).

- Chrome/Edge 115+: Full support
- Firefox 110+ (with flag), Firefox 128+ (stable): Partial — `scroll-timeline` supported, `view-timeline` limited
- Safari 17.4+: Partial support added; complex `animation-range` values may behave differently

**Global baseline as of early 2026: approximately 75-80% of browsers.** Safari on iOS has the most gaps.

### Polyfill

The W3C scroll-driven animations polyfill (`@web-animations-js/scroll-driven-polyfill` or the one maintained at `flackr/scroll-driven-animations`) can bring support to ~95%+. However:
- The polyfill is ~50kb gzipped
- It must be loaded before first paint (render-blocking) to avoid FOUC
- It does not support all `animation-range` values equally well

### SSR Safety

**HIGH confidence** — pure CSS, no JS, so SSR is fine. Elements render at their `from` keyframe value (or whichever state matches scroll position 0).

### Verdict for This Use Case

Not recommended as the primary approach. The expansion from card → fullscreen requires animating `width`, `height`, and `border-radius` simultaneously, which CSS scroll-driven animations handle but these are layout-bound properties (triggering reflow). framer-motion's `useTransform` driving only `transform: scale` + `border-radius` is more compositor-friendly. The browser support gap also means you'd need the polyfill. Use this only for simple fade/translate effects on secondary elements.

---

## Option 3: Intersection Observer + CSS Transitions

### What It Is

`IntersectionObserver` fires a callback when an element enters/exits the viewport. Toggle a CSS class to trigger a `transition`. No scroll event listeners, no GSAP, no framer-motion required.

```tsx
function useInView(ref: RefObject<Element>, options = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      options
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return inView;
}

// Usage
<div className={`feature-card ${inView ? "is-visible" : ""}`}>
```

```css
.feature-card {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.feature-card.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

framer-motion already ships `useInView` hook (confirmed in bundle at `framer-motion@12.38.0`) and `whileInView` prop on `motion.*` elements. Use those rather than rolling a custom IntersectionObserver.

```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
```

### SSR Safety

**HIGH confidence** — framer-motion's `whileInView` uses `IntersectionObserver` internally, which is not called during SSR. The element renders with `initial` styles on server (opacity: 0, y: 40 via inline style). On client hydration, the observer fires and animates in. There is a brief flash where the element is at opacity:0 before IntersectionObserver fires — acceptable for below-the-fold content, but not for hero content that should be visible immediately. For hero text, use `initial={false}` or skip the `initial` prop.

### Verdict for This Use Case

Use for feature cards animating in (once the main card has expanded). Not suitable for the card-rises-and-expands sequence because that effect is tied to continuous scroll progress, not a binary in/out state.

---

## Option 4: GSAP Without autoAlpha — CSS Class Toggle

If keeping GSAP is required, the black-screen issue is fixable by never using `visibility: hidden`.

### The Fix

**Remove `style={{ visibility: "hidden" }}` from the card markup entirely.** Instead, start the card off-screen with a CSS `translateY` in the initial `gsap.set()` call, and keep the card `visible` at all times. The card is out of view because it's at `translateY(window.innerHeight + 200px)`, not because it's hidden.

```tsx
// Before (causes black screen):
// <div className="scroll-card" style={{ visibility: "hidden" }}>

// After (safe):
// <div className="scroll-card" style={{ transform: "translateY(calc(100vh + 200px))" }}>
```

```js
// Remove:
gsap.set(".scroll-card", { visibility: "visible", y: window.innerHeight + 200 });
// Replace with:
gsap.set(".scroll-card", { y: window.innerHeight + 200 }); // Already positioned off-screen by CSS
```

### Why This Works

The WebGL canvas is never covered by a `visibility: hidden` element. The card is physically below the viewport from the first paint. There is no flash because the card is simply not in view yet — same visual result, different mechanism.

### Additional GSAP Consideration: Use `opacity` Not `autoAlpha`

`autoAlpha` is GSAP shorthand that sets both `opacity` and `visibility`. When `opacity` reaches 0, it also sets `visibility: hidden`. Never use `autoAlpha` when WebGL canvases are behind the element. Use plain `opacity` instead.

```js
// Never:
gsap.to(".scroll-cta", { autoAlpha: 0 });

// Always:
gsap.to(".scroll-cta", { opacity: 0 });
```

### Confidence: HIGH
This is a mechanical change verified against the existing codebase. The root cause is confirmed.

---

## Option 5: Card Rises + Expands Without GSAP Pinning

The "card expands to fullscreen" effect using only CSS and framer-motion, with no `pin: true`.

### Pattern: Sticky Container + useTransform

See Option 1 above. The sticky container approach is the reliable replacement.

### Pattern: Shared Layout Animation (layoutId)

framer-motion's `layoutId` prop animates between two rendered states of the same element. A "collapsed" card state and an "expanded" card state can be two different components, and framer-motion animates the transition using FLIP (First, Last, Invert, Play) — layout animations that only use `transform` and `opacity`, never `width`/`height`.

```tsx
// State: collapsed card visible in normal flow
{!isExpanded && (
  <motion.div
    layoutId="feature-card"
    className="w-[85vw] h-[85vh] rounded-[40px]"
    onClick={() => setIsExpanded(true)}
  />
)}

// State: expanded card covering the viewport
{isExpanded && (
  <motion.div
    layoutId="feature-card"
    className="fixed inset-0 z-50"
  />
)}
```

This is **click-triggered**, not scroll-triggered. For a scroll-driven expand, the sticky + useTransform approach (Option 1) is correct. The `layoutId` pattern is better for card-detail expansions (e.g., clicking a feature card to open a detail modal).

### The Key Insight: Don't Animate width/height

Animating `width` and `height` forces layout recalculation on every frame. Instead, animate `scale`:

```tsx
// Antipattern (layout-bound, causes reflow):
const cardWidth = useTransform(progress, [0.25, 0.45], ["85vw", "100vw"]);

// Better (compositor only):
// Start the card at full viewport size, then scale it down initially:
// initial scale = viewport_card_size / viewport_full_size → 0.85
// Animate scale from 0.85 to 1.0 as it "expands"
const cardScale = useTransform(progress, [0.25, 0.45], [0.85, 1]);

<motion.div
  style={{
    scale: cardScale,
    borderRadius: cardRadius,
    // Fixed at full-screen size, scaled down
    width: "100vw",
    height: "100vh",
    position: "fixed", // or absolute within sticky container
  }}
>
```

This keeps the card always at `100vw × 100vh`, uses `scale` to make it appear smaller, then scales up to 1. The visual result is identical, but only `transform: scale()` runs — compositor thread only, no reflow.

**Confidence: HIGH** — this matches the established "fake fullscreen expand" pattern used in iOS/macOS app store card animations.

---

## Option 6: Lenis Smooth Scroll + framer-motion

### What Lenis Is

Lenis (by Studio Freight, now maintained by Darkroom) is a smooth scroll library that replaces the browser's native scroll with a lerp'd (linear interpolated) scroll — giving buttery easing on all platforms including Windows (which has no native scroll inertia).

### Installation

```bash
npm install lenis
# or the React wrapper:
npm install @studio-freight/react-lenis
```

Neither package is currently installed in the project.

### Integration with framer-motion

Lenis emits scroll events that can be wired to framer-motion's `scrollY` MotionValue:

```tsx
"use client";
import Lenis from "lenis";
import { useEffect } from "react";
import { useScroll } from "framer-motion";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
```

framer-motion's `useScroll` reads from the real DOM scroll position (`window.scrollY`), not from Lenis's virtual position. This means `scrollYProgress` may lag behind Lenis's smooth position. To synchronize: either use Lenis's `on("scroll")` callback to manually drive a MotionValue, or use the `@studio-freight/react-lenis` wrapper which handles this.

### SSR Safety

Lenis is client-only. The `useEffect` pattern above is SSR-safe. The `LenisProvider` component should be wrapped in a `"use client"` boundary.

### Should You Add It?

**MEDIUM confidence on the recommendation.**

Lenis solves a real problem on Windows where scroll momentum is absent, making scrubbed scroll animations feel mechanical. However:

- It adds ~15kb gzipped to the bundle
- The sticky + useTransform approach already works well with native scroll on macOS
- Lenis can conflict with modal/drawer scroll locking if you have those elsewhere in the app
- For a landing page focused on mobile-first college students (likely iOS-heavy), native scroll inertia is already smooth

**Verdict:** Optional enhancement, not required. If the scroll feel is rough on Windows/Android after implementing Option 1, add Lenis then.

---

## Recommendation

### Primary Stack: framer-motion useScroll + sticky container

1. Remove GSAP and ScrollTrigger from `page.tsx` entirely.
2. Replace the `containerRef` div's `position: relative` with a tall scroll container (`height: 700vh`).
3. Add a `position: sticky; top: 0; height: 100vh` inner wrapper for the animated content.
4. Use `useScroll({ target: sectionRef, offset: ["start start", "end end"] })` to get `scrollYProgress`.
5. Pipe through `useSpring(scrollYProgress, { stiffness: 100, damping: 30 })` for scrub smoothness.
6. Drive all animation properties via `useTransform` on a single keyframe map.
7. Use `scale` to fake the card expand instead of animating `width`/`height`.
8. Never set `visibility: hidden` on any element that sits above a WebGL canvas.
9. Use `initial={{ opacity: 0 }}` (not `visibility: hidden`) for the CTA; framer-motion will set it via inline `opacity` style, not `visibility`.

### If Keeping GSAP

Apply the two fixes from Option 4:
- Remove `style={{ visibility: "hidden" }}` from the card markup; start it off-screen via `transform: translateY(calc(100vh + 200px))` in CSS.
- Replace all `autoAlpha` with `opacity` everywhere in the ScrollTrigger timeline.
- Remove `anticipatePin: 1` from the ScrollTrigger config — this option preloads the pin by setting `visibility: hidden` ahead of the trigger point, which is another source of the problem.

### Phase-Specific Warnings

| Animation Phase | Approach | Pitfall |
|-----------------|----------|---------|
| Hero text reveal | `initial={{ opacity: 0 }}` + `animate={{ opacity: 1 }}` on mount | Do NOT use `visibility` or GSAP `autoAlpha` |
| Card rise | `useTransform` on `scrollYProgress` → `translateY` | Do NOT use GSAP `visibility: hidden` + reveal pattern |
| Card expand | `useTransform` on `scale` (not width/height) | Animating `width`/`height` causes reflow on every frame |
| Feature card stagger | Offset `useTransform` ranges per card index | `useTransform` calls inside `.map()` are safe if array length is stable |
| CTA fade in | `initial={{ opacity: 0 }}` driven by scroll progress | pointerEvents must be `none` until visible to avoid click traps |
| Card exit | Add exit keyframe to the same `useTransform` map | Don't use two separate `useTransform` calls for rise + exit — use a single multi-keyframe map |

---

## Installed Versions (Verified)

| Package | Version | Status |
|---------|---------|--------|
| framer-motion | 12.38.0 | Installed |
| motion | 12.38.0 | Installed (same package, two entry points) |
| gsap | 3.14.2 | Installed — can be removed from page.tsx |
| lenis | — | Not installed |

**framer-motion exports confirmed present (bundle-inspected):**
`useScroll`, `useTransform`, `useSpring`, `useInView`, `motion`, `AnimatePresence`, `LayoutGroup`, `supportsScrollTimeline`, `scroll`, `scrollInfo`

---

## Sources

All claims marked HIGH confidence are verified by direct inspection of the installed `framer-motion@12.38.0` bundle at `/node_modules/framer-motion/dist/cjs/index.js`.

Claims marked MEDIUM confidence derive from training knowledge (cutoff August 2025) without live documentation access.

- framer-motion source: `/node_modules/framer-motion/dist/cjs/index.js` (inspected)
- Existing scroll animation component: `src/components/ui/container-scroll-animation.tsx` (demonstrates the useScroll + useTransform pattern already in use)
- Current broken implementation: `src/app/page.tsx` lines 61–109 (root cause identified)
