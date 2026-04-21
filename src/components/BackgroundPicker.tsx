"use client";

import React, { useEffect, useRef, useState } from "react";
import { Palette, Sparkles, Moon, Sun, Grid3x3, Check } from "lucide-react";
import { useBackground, type BackgroundChoice } from "./BackgroundProvider";

interface Option {
  value: BackgroundChoice;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const OPTIONS: readonly Option[] = [
  { value: "shader", label: "WebGL Shader", description: "Animated dark surface", icon: Sparkles },
  { value: "dark", label: "Dark", description: "Cosmic gradient mesh", icon: Moon },
  { value: "light", label: "Light", description: "Editorial luxury", icon: Sun },
  { value: "monochrome", label: "Monochrome", description: "HERO3 dot mesh", icon: Grid3x3 },
];

export function BackgroundPicker() {
  const { background, setBackground } = useBackground();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = (value: BackgroundChoice) => {
    setBackground(value);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-50 print:hidden"
      data-bg-picker
    >
      {open && (
        <div
          role="dialog"
          aria-label="Background options"
          className="mb-2 w-56 rounded-2xl border bg-[var(--bg-surface)] p-2 shadow-2xl"
          style={{
            borderColor: "var(--border-token)",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.4), 0 8px 16px -8px rgba(0,0,0,0.25)",
          }}
        >
          <div className="px-2 pt-1 pb-2">
            <p
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Background
            </p>
          </div>
          <ul className="flex flex-col gap-0.5">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = opt.value === background;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handlePick(opt.value)}
                    aria-pressed={active}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors"
                    style={{
                      background: active ? "var(--border-token)" : "transparent",
                      color: "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "var(--border-token)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }
                    }}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{
                        background: active ? "var(--accent)" : "var(--border-token)",
                        color: active ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold">{opt.label}</span>
                      <span
                        className="block text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {opt.description}
                      </span>
                    </span>
                    {active && (
                      <Check
                        className="h-4 w-4"
                        style={{ color: "var(--accent)" }}
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close background picker" : "Open background picker"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-token)",
          color: "var(--text-primary)",
          boxShadow: "0 12px 24px -8px rgba(0,0,0,0.35), 0 4px 8px -4px rgba(0,0,0,0.2)",
        }}
      >
        <Palette className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
