"use client";

import { motion } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ChanceForm } from "@/components/ChanceForm";
import { ChanceResultDisplay } from "@/components/ChanceResult";
import { CollegeMap } from "@/components/ui/college-map";
import { useChanceCalculator } from "@/hooks/useChanceCalculator";

export default function ChancesPage() {
  const { inputs, updateInput, resetInputs, college, result, colleges } = useChanceCalculator();

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Chance Calculator</span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Estimate your admission chances at any school in our database.
            Enter your profile and select a college.
          </p>
        </motion.div>

        {/* Form */}
        <ScrollReveal delay={0.1}>
          <ChanceForm inputs={inputs} colleges={colleges} onUpdate={updateInput} onReset={resetInputs} />
        </ScrollReveal>

        {/* Map + Result */}
        {college && (
          <div className="mt-8 space-y-6">
            <ScrollReveal delay={0.12}>
              <CollegeMap college={college} className="h-[280px] sm:h-[320px]" />
            </ScrollReveal>

            {result && (
              <ScrollReveal delay={0.15}>
                <ChanceResultDisplay result={result} collegeName={college.name} />
              </ScrollReveal>
            )}
          </div>
        )}

        {!college && (
          <div className="mt-8 glass rounded-2xl p-12 ring-1 ring-white/[0.06] text-center">
            <p className="text-zinc-500">Select a college above to see your estimated chances</p>
          </div>
        )}
      </main>
    </AuroraBackground>
  );
}
