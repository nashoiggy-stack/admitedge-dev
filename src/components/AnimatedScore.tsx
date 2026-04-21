"use client";

import { useEffect, useState } from "react";
import { useSpring, useMotionValue, motion } from "motion/react";

interface AnimatedScoreProps {
  value: number;
  max: number;
  label: string;
  sub: string;
  delay?: number;
}

export function AnimatedScore({ value, max, label, sub, delay = 0 }: AnimatedScoreProps) {
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 30 });

  const pct = value / max;
  const color =
    pct >= 0.8 ? "#10b981" : pct >= 0.6 ? "#3b82f6" : pct >= 0.4 ? "#f59e0b" : "#ef4444";

  useEffect(() => {
    const timeout = setTimeout(() => mv.set(value), delay);
    return () => clearTimeout(timeout);
  }, [mv, value, delay]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(display / max) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r={radius}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"
          />
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono text-white">{display}</span>
          <span className="text-[11px] text-zinc-500 tabular-nums">/{max}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-zinc-300">{label}</p>
      <p className="text-[11px] text-zinc-500">{sub}</p>
    </div>
  );
}
