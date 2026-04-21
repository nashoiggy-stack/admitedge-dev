"use client";

import React, { ReactNode } from "react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { useBackground } from "@/components/BackgroundProvider";

interface AuroraBackgroundProps {
  readonly children: ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ children }) => {
  const { background } = useBackground();

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {background === "shader" && (
        <div className="fixed inset-0 pointer-events-none">
          <WebGLShader />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
