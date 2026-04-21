"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { AuroraBackground } from "@/components/AuroraBackground";
import { TranscriptUpload } from "@/components/TranscriptUpload";
import { useBackground } from "@/components/BackgroundProvider";

export default function GPAPage() {
  const [iframeKey, setIframeKey] = useState(0);
  const { background } = useBackground();
  // Iframe is a separate document — its viewport canvas color comes from
  // its own `color-scheme`, NOT inherited from the parent's CSS. Match the
  // active picker theme so the iframe canvas (which is what shows when the
  // iframe content body is transparent) doesn't default to white.
  const iframeColorScheme: "light" | "dark" =
    background === "light" ? "light" : "dark";

  const reloadIframe = () => {
    // Force the iframe to remount so it re-reads localStorage
    setIframeKey((k) => k + 1);
  };

  return (
    <AuroraBackground>
      <ContainerScroll
        titleComponent={
          <div className="mb-4">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-5">
              <span className="text-gradient">GPA Calculator</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed">
              Calculate your weighted and unweighted GPA across high school and college scales.
            </p>
          </div>
        }
      >
        {/* How weighting works inside the 3D card */}
        <div className="h-full w-full bg-[#0a0a14] p-5 flex flex-col gap-4 overflow-hidden">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">How GPA Weighting Works</h3>

          <div>
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">High School Scale</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: "College Prep", bonus: "+0.0", color: "text-zinc-400" },
                { level: "Honors", bonus: "+1.0", color: "text-blue-400" },
                { level: "AP", bonus: "+2.0", color: "text-blue-400" },
              ].map((l) => (
                <div key={l.level} className="rounded-lg bg-[#0c0c1a]/90 border border-white/[0.05] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-500">{l.level}</p>
                  <p className={`text-lg font-bold font-mono ${l.color}`}>{l.bonus}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">College Recalculated Scale</h4>
            <div className="grid grid-cols-4 gap-2">
              {[
                { level: "CP", bonus: "+0.0", color: "text-zinc-400" },
                { level: "Honors", bonus: "+0.5", color: "text-blue-400" },
                { level: "Dual Enroll", bonus: "+1.0", color: "text-cyan-400" },
                { level: "AP", bonus: "+1.0", color: "text-blue-400" },
              ].map((l) => (
                <div key={l.level} className="rounded-lg bg-[#0c0c1a]/90 border border-white/[0.05] p-2 text-center">
                  <p className="text-[9px] text-zinc-500">{l.level}</p>
                  <p className={`text-base font-bold font-mono ${l.color}`}>{l.bonus}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Example: A in AP Class</h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Base grade (A)</span>
                <span className="text-zinc-300 font-mono">4.00</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">+ HS AP bonus</span>
                <span className="text-blue-400 font-mono">+2.00 = 6.00</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">+ College AP bonus</span>
                <span className="text-blue-400 font-mono">+1.00 = 5.00</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-zinc-600 mt-auto">
            Unweighted GPA uses base grades only (4.0 max). Weighted adds course-level bonuses.
          </p>
        </div>
      </ContainerScroll>

      {/* Transcript upload — AI-powered grade extraction */}
      <motion.div
        className="-mt-28 relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
      >
        <TranscriptUpload onSuccess={reloadIframe} />
      </motion.div>

      {/* Actual GPA calculator iframe — transparent so the active theme's
          html-canvas bg shows through naturally. */}
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <iframe
          key={`${iframeKey}-${iframeColorScheme}`}
          src={`/gpa-calculator.html?theme=${iframeColorScheme}`}
          className="w-full border-0 bg-transparent"
          style={{
            height: "2400px",
            minHeight: "100vh",
            colorScheme: iframeColorScheme,
          }}
          title="GPA Calculator"
        />
      </motion.div>
    </AuroraBackground>
  );
}
