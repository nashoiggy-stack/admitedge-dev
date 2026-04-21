"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { PenLine, Calculator, ClipboardList, School, BarChart3 } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const INJECTED_STYLES = `
  .film-grain {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50; opacity: 0.04; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .bg-grid-theme {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .text-silver-matte {
    background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.4) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateZ(0);
    filter: drop-shadow(0px 10px 20px rgba(255,255,255,0.1)) drop-shadow(0px 2px 4px rgba(255,255,255,0.06));
  }

  .premium-depth-card {
    background: linear-gradient(145deg, #162C6D 0%, #0A101D 100%);
    box-shadow:
      0 40px 100px -20px rgba(0, 0, 0, 0.9),
      0 20px 40px -20px rgba(0, 0, 0, 0.8),
      inset 0 1px 2px rgba(255, 255, 255, 0.15),
      inset 0 -2px 4px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.04);
    position: relative;
  }

  .card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 40%);
    mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  .feature-card-depth {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow:
      0 15px 30px rgba(0,0,0,0.4),
      inset 0 1px 1px rgba(255,255,255,0.08),
      inset 0 -1px 1px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.06);
  }
`;

const FEATURES = [
  { href: "/essay", icon: PenLine, title: "Essay Grader", description: "Grade your Common App essay with 7 criteria + VSPICE rubric. Get inline suggestions and coaching chat.", stat: "7+V", statLabel: "Criteria" },
  { href: "/gpa", icon: Calculator, title: "GPA Calculator", description: "Calculate weighted and unweighted GPA across high school and college scales. Auto-fills into other tools.", stat: "4", statLabel: "Scales" },
  { href: "/extracurriculars", icon: ClipboardList, title: "EC Evaluator", description: "Describe your activities in conversation. Get tier ratings, profile analysis, and spike detection.", stat: "4", statLabel: "Tiers" },
  { href: "/colleges", icon: School, title: "College List", description: "Build a balanced list across 5 tiers — Safety, Likely, Target, Reach, Unlikely — filtered by your profile.", stat: "80+", statLabel: "Schools" },
  { href: "/chances", icon: BarChart3, title: "Chance Calculator", description: "Estimate your admission chances at any school. Pulls your GPA, essay, and EC scores automatically.", stat: "5", statLabel: "Bands" },
];

export function CinematicLandingHero({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  // Mouse sheen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect();
          mainCardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          mainCardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        }
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => { window.removeEventListener("mousemove", handleMouseMove); cancelAnimationFrame(requestRef.current); };
  }, []);

  // Cinematic pinned scroll timeline
  useEffect(() => {
    if (!containerRef.current) return;
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.set(".main-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set([".card-inner-content", ".feature-grid-item"], { autoAlpha: 0 });
      gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=8000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      scrollTl
        // Phase 1: Hero text fades out, card rises
        .to([".hero-text-wrapper", ".bg-grid-theme"], { scale: 1.15, filter: "blur(20px)", opacity: 0, ease: "power2.inOut", duration: 2 }, 0)
        .to(".main-card", { y: 0, ease: "power3.inOut", duration: 2 }, 0)
        // Phase 2: Card expands to full screen
        .to(".main-card", { width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 1.5 })
        // Phase 3: Feature cards animate in one by one
        .fromTo(".card-inner-content", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 1 })
        .fromTo(".feature-grid-item",
          { y: 60, autoAlpha: 0, scale: 0.9 },
          { y: 0, autoAlpha: 1, scale: 1, stagger: 0.3, ease: "back.out(1.2)", duration: 1.5 },
          "-=0.5"
        )
        // Phase 4: Hold for reading
        .to({}, { duration: 3 })
        // Phase 5: Everything exits, CTA appears
        .set(".hero-text-wrapper", { autoAlpha: 0 })
        .to([".card-inner-content", ".feature-grid-item"], {
          scale: 0.9, y: -40, autoAlpha: 0, ease: "power3.in", duration: 1.2, stagger: 0.05,
        })
        .to(".main-card", {
          width: isMobile ? "92vw" : "85vw",
          height: isMobile ? "92vh" : "85vh",
          borderRadius: isMobile ? "32px" : "40px",
          ease: "expo.inOut",
          duration: 1.8,
        }, "pullback")
        .set(".cta-wrapper", { autoAlpha: 1 })
        .to(".cta-wrapper", { scale: 1, filter: "blur(0px)", ease: "expo.inOut", duration: 1.8 }, "pullback")
        // Phase 6: Card exits upward
        .to(".main-card", { y: -window.innerHeight - 300, ease: "power3.in", duration: 1.5 });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-screen h-screen overflow-hidden flex items-center justify-center bg-zinc-950 text-white font-sans antialiased", className)}
      style={{ perspective: "1500px" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />

      {/* Hero Text */}
      <div className="hero-text-wrapper absolute z-10 flex flex-col items-center justify-center text-center w-screen px-4">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500 mb-6 font-semibold">College Prep Suite</p>
        <h1 className="text-white text-5xl md:text-7xl lg:text-[6rem] font-bold tracking-tight mb-2" style={{ textShadow: "0 10px 30px rgba(255,255,255,0.15)" }}>
          Your edge in
        </h1>
        <h1 className="text-white text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter" style={{ textShadow: "0 10px 30px rgba(255,255,255,0.15)" }}>
          college admissions.
        </h1>
      </div>

      {/* CTA — hidden initially via GSAP, appears after card exits */}
      <div
        className="cta-wrapper absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-auto"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-silver-matte">
          Start building your profile.
        </h2>
        <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
          Grade your essays, calculate your GPA, evaluate your extracurriculars, and find your best-fit schools — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/essay"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.98]"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My Profile
          </Link>
        </div>
      </div>

      {/* The Deep Blue Card — starts off-screen below */}
      <div className="absolute top-0 left-0 w-full h-full z-20 flex items-center justify-center pointer-events-none overflow-hidden" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card relative overflow-hidden flex items-center justify-center pointer-events-auto w-[92vw] md:w-[85vw] h-[92vh] md:h-[85vh] rounded-[32px] md:rounded-[40px]"
          style={{ visibility: "hidden" }}
        >
          <div className="card-sheen" aria-hidden="true" />

          <div className="card-inner-content relative w-full h-full max-w-6xl mx-auto px-6 lg:px-12 flex flex-col justify-center z-10">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.4em] text-blue-300/60 font-semibold mb-3">AdmitEdge</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Everything you need.
              </h2>
              <p className="text-blue-100/50 text-base md:text-lg max-w-2xl mx-auto">
                Five integrated tools that share data automatically. Your GPA fills into your college list.
                Your essay score adjusts your chances. Everything connects.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link
                    key={feature.href}
                    href={feature.href}
                    className="feature-grid-item feature-card-depth rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <Icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">{feature.stat}</p>
                        <p className="text-[9px] uppercase tracking-wider text-blue-200/40">{feature.statLabel}</p>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-blue-100/40 leading-relaxed">{feature.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
