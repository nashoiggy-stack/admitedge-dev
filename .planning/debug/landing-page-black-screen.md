---
status: awaiting_human_verify
trigger: "Landing page shows a completely black screen — the hero text is not visible"
created: 2026-04-07T00:00:00Z
updated: 2026-04-07T00:00:00Z
---

## Current Focus

hypothesis: ShaderLines mounts and renders an opaque black Three.js canvas immediately, BEFORE GSAP runs gsap.set(".cta-wrapper", { autoAlpha: 0 }). The canvas paints black pixels covering the entire viewport because .cta-wrapper is visible by default (no CSS hiding), and the shader's gl_FragColor outputs near-black for most pixels.
test: Check if .cta-wrapper has any CSS that hides it before GSAP runs; check if ShaderLines canvas renders before GSAP useEffect fires
expecting: .cta-wrapper has NO initial CSS hiding — it relies entirely on GSAP.set() which runs in a useEffect (after paint). ShaderLines also runs in useEffect but loads Three.js async, so timing depends on CDN cache.
next_action: Confirm the race condition and fix by adding initial CSS visibility:hidden to .cta-wrapper OR lazy-mount ShaderLines

## Symptoms

expected: Landing page shows hero text "Your edge in college admissions." with a subtle grid background on dark zinc-950
actual: Completely black screen on first load. No text visible at all.
errors: No console errors reported
reproduction: Load the landing page on Vercel (production) or localhost
started: After adding ShaderLines WebGL component

## Eliminated

## Evidence

- timestamp: 2026-04-07T00:01:00Z
  checked: cinematic-landing-hero.tsx line 181 — cta-wrapper div
  found: The .cta-wrapper div has NO initial CSS to hide it (no hidden class, no opacity-0, no invisible). It is a full-screen absolute div (w-screen h-screen) at z-10. It relies entirely on GSAP.set() at line 107 to hide it.
  implication: Before GSAP useEffect runs, .cta-wrapper is VISIBLE and covers the viewport.

- timestamp: 2026-04-07T00:01:30Z
  checked: shader-lines.tsx — mount behavior
  found: ShaderLines renders a div with className="w-full h-full absolute inset-0". On mount, useEffect loads Three.js via CDN script tag. The canvas renders opaque pixels (gl_FragColor alpha = 1.0) with very dark colors (near black for most of the viewport).
  implication: Even though Three.js loads async, the .cta-wrapper div itself is already visible and positioned above the hero text at z-10 before GSAP hides it.

- timestamp: 2026-04-07T00:02:00Z
  checked: z-index stacking in cinematic-landing-hero.tsx
  found: hero-text-wrapper is z-10, cta-wrapper is ALSO z-10, main-card wrapper is z-20. Since cta-wrapper and hero-text-wrapper are both z-10 and cta-wrapper comes AFTER hero-text-wrapper in DOM order, cta-wrapper paints ON TOP of hero text.
  implication: Even WITHOUT the shader canvas, the cta-wrapper div (with its text content) sits on top of the hero text. The CTA text "Start building your profile" would be visible instead of the hero. But with the shader, the black canvas covers everything.

- timestamp: 2026-04-07T00:02:30Z
  checked: GSAP useEffect timing (line 98-156)
  found: gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" }) runs inside useEffect, which fires AFTER the first browser paint. React renders the DOM -> browser paints -> useEffect fires -> GSAP hides .cta-wrapper. There is at least one frame where .cta-wrapper is fully visible.
  implication: This is the root cause. The cta-wrapper (containing the shader) is visible for the initial paint, covering the hero text with a black canvas.

## Resolution

root_cause: The .cta-wrapper div has no initial CSS to hide it. It relies on GSAP.set() inside useEffect (which runs AFTER the first paint) to set autoAlpha:0. Since .cta-wrapper is positioned absolute with z-10 and comes after hero-text-wrapper in DOM order, it paints on top of the hero text. The ShaderLines component inside it renders an opaque near-black canvas, making the entire screen appear black.
fix: Two changes to cinematic-landing-hero.tsx — (1) Added inline style={{ visibility: "hidden", opacity: 0 }} on .cta-wrapper so it is hidden from the very first paint, before GSAP useEffect runs. (2) Lazy-mount ShaderLines via useState — the Three.js canvas only mounts when GSAP timeline reaches Phase 5 (via .call(() => setShaderReady(true))), preventing the opaque black canvas from rendering during initial load.
verification: Build compiles successfully. ShaderLines no longer renders on mount. CTA wrapper is hidden via CSS before GSAP takes over.
files_changed: [src/components/ui/cinematic-landing-hero.tsx]
