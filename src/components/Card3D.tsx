"use client";

import { ReactNode, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function Card3D({ children, className = "", glowColor = "rgba(99, 102, 241, 0.15)" }: Card3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4deg", "4deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  return (
    <div style={{ perspective: "1200px" }}>
      <motion.div
        className={`relative ${className}`}
        style={{
          rotateY,
          rotateX,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); x.set(0); y.set(0); }}
      >
        {children}

        {/* Glow border on hover */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ boxShadow: `0 0 30px ${glowColor}, inset 0 0 30px ${glowColor}` }}
          />
        )}
      </motion.div>
    </div>
  );
}
