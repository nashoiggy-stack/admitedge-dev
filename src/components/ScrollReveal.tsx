"use client";

import React, { ReactNode, useRef } from "react";
import { motion, useInView } from "motion/react";

interface ScrollRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly direction?: "up" | "down" | "left" | "right";
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const distance = 30; // Tighter distance feels more intentional
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value = direction === "right" || direction === "down" ? distance : -distance;
  const initialTransform = axis === "x"
    ? `translateX(${value}px)`
    : `translateY(${Math.abs(value)}px)`;

  const initial = { opacity: 0, transform: initialTransform, filter: "blur(6px)" };
  const animate = isInView
    ? { opacity: 1, transform: "translateX(0px) translateY(0px)", filter: "blur(0px)" }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ duration: 0.45, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
