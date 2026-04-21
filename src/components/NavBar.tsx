"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "./AuthProvider";
import { AdmitEdgeLogo } from "./AdmitEdgeLogo";

const NAV_ITEMS = [
  { href: "/essay", label: "Essay" },
  { href: "/gpa", label: "GPA" },
  { href: "/extracurriculars", label: "ECs" },
  { href: "/resume", label: "Resume" },
  { href: "/colleges", label: "Colleges" },
  { href: "/chances", label: "Chances" },
  { href: "/compare", label: "Compare" },
  { href: "/strategy", label: "Strategy" },
] as const;

const SPRING = { type: "spring" as const, stiffness: 350, damping: 30 };
const EASE_EXPO = [0.32, 0.72, 0, 1] as const;

export const NavBar: React.FC = () => {
  const pathname = usePathname();
  const { user, guest, signOut } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Floating pill nav ─────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl rounded-full bg-[#0a0a14]/80 backdrop-blur-xl ring-1 ring-white/[0.08] shadow-[0_8px_32px_rgba(10,16,29,0.6)]">
          <div className="px-4 lg:px-5 flex items-center justify-between h-12">
            {/* Home button */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <AdmitEdgeLogo
                size={24}
                className="group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-[filter] duration-200 [transition-timing-function:var(--ease-out)]"
              />
              <span className="text-sm font-semibold text-zinc-300 hidden sm:block group-hover:text-white transition-[color] duration-200 [transition-timing-function:var(--ease-out)]">
                AdmitEdge
              </span>
            </Link>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3 lg:px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-[color] duration-200 ${
                      isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-white/[0.08] ring-1 ring-white/[0.1]"
                        transition={SPRING}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-[color,background-color] duration-200 ${
                  pathname === "/profile"
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </Link>

              {user ? (
                <>
                  <span className="text-[11px] text-zinc-600 hidden lg:block truncate max-w-[120px]">
                    {user.email}
                  </span>
                  <button
                    onClick={signOut}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-full hover:bg-white/[0.06] transition-[color,background-color] duration-200 hidden sm:block"
                  >
                    Sign out
                  </button>
                </>
              ) : guest ? (
                <>
                  <span className="text-[11px] text-zinc-600 hidden lg:block">Guest</span>
                  <Link
                    href="/"
                    onClick={signOut}
                    className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-1 rounded-full hover:bg-white/[0.06] transition-[color,background-color] duration-200 hidden sm:block"
                  >
                    Sign in
                  </Link>
                </>
              ) : null}

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
                aria-label="Toggle menu"
              >
                <motion.span
                  animate={{
                    transform: mobileOpen
                      ? "translateY(5px) rotate(45deg)"
                      : "translateY(0px) rotate(0deg)",
                  }}
                  transition={{ duration: 0.28, ease: EASE_EXPO }}
                  className="w-4.5 h-[1.5px] bg-zinc-400 block rounded-full origin-center"
                />
                <motion.span
                  animate={{
                    opacity: mobileOpen ? 0 : 1,
                    transform: mobileOpen ? "scaleX(0)" : "scaleX(1)",
                  }}
                  transition={{ duration: 0.18, ease: EASE_EXPO }}
                  className="w-4.5 h-[1.5px] bg-zinc-400 block rounded-full"
                />
                <motion.span
                  animate={{
                    transform: mobileOpen
                      ? "translateY(-5px) rotate(-45deg)"
                      : "translateY(0px) rotate(0deg)",
                  }}
                  transition={{ duration: 0.28, ease: EASE_EXPO }}
                  className="w-4.5 h-[1.5px] bg-zinc-400 block rounded-full origin-center"
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Fullscreen mobile overlay ──────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_EXPO }}
            className="fixed inset-0 z-40 bg-[#06060f]/95 backdrop-blur-2xl md:hidden flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              {NAV_ITEMS.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, transform: "translateY(20px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    exit={{ opacity: 0, transform: "translateY(10px)" }}
                    transition={{ delay: 0.04 + i * 0.04, duration: 0.32, ease: EASE_EXPO }}
                    className="w-full"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block w-full text-center px-6 py-3.5 rounded-2xl text-base font-medium transition-[color,background-color] duration-200 ${
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0, transform: "translateY(20px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                exit={{ opacity: 0, transform: "translateY(10px)" }}
                transition={{ delay: 0.04 + NAV_ITEMS.length * 0.04, duration: 0.32, ease: EASE_EXPO }}
                className="w-full"
              >
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`block w-full text-center px-6 py-3.5 rounded-2xl text-base font-medium transition-[color,background-color] duration-200 ${
                    pathname === "/profile"
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  Profile
                </Link>
              </motion.div>

              {user && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className="w-full pt-4 mt-4 border-t border-white/[0.06] text-center"
                >
                  <p className="text-[11px] text-zinc-600 truncate mb-2">{user.email}</p>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-[color] duration-200"
                  >
                    Sign out
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for floating nav */}
      <div className="h-20" />
    </>
  );
};
