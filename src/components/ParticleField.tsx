"use client";

import { useEffect, useRef, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export function ParticleField() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const initial: Particle[] = Array.from({ length: 40 }, () => ({
      id: idRef.current++,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 20 + 15,
      opacity: Math.random() * 0.3 + 0.05,
    }));
    setParticles(initial);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `floatParticle ${p.speed}s linear infinite`,
            animationDelay: `${Math.random() * -20}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-30px) translateX(15px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-40px) translateX(5px); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}</style>
    </div>
  );
}
