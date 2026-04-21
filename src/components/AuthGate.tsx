"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "./AuthProvider";
import { AdmitEdgeLogo } from "./AdmitEdgeLogo";
import { cn } from "@/lib/utils";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, PartyPopper, Users } from "lucide-react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";
import confetti from "canvas-confetti";
import type { Options as ConfettiOptions, GlobalOptions as ConfettiGlobalOptions, CreateTypes as ConfettiInstance } from "canvas-confetti";

const PUBLIC_ROUTES = ["/gpa"];

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, guest } = useAuthContext();
  const pathname = usePathname();

  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060f]">
        <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && !guest) return <LoginScreen />;

  return <>{children}</>;
};

// ── Confetti ──────────────────────────────────────────────────────────────────

type ConfettiRef = { fire: (opts?: ConfettiOptions) => void } | null;

const ConfettiCanvas = forwardRef<ConfettiRef, React.ComponentPropsWithRef<"canvas"> & { options?: ConfettiOptions; globalOptions?: ConfettiGlobalOptions; manualstart?: boolean }>((props, ref) => {
  const { options, globalOptions = { resize: true, useWorker: true }, manualstart = false, ...rest } = props;
  const instanceRef = useRef<ConfettiInstance | null>(null);
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node !== null) {
      if (instanceRef.current) return;
      instanceRef.current = confetti.create(node, { ...globalOptions, resize: true });
    } else {
      instanceRef.current?.reset();
      instanceRef.current = null;
    }
  }, [globalOptions]);
  const fire = useCallback((opts: ConfettiOptions = {}) => instanceRef.current?.({ ...options, ...opts }), [options]);
  const api = useMemo(() => ({ fire }), [fire]);
  useImperativeHandle(ref, () => api, [api]);
  useEffect(() => { if (!manualstart) fire(); }, [manualstart, fire]);
  return <canvas ref={canvasRef} {...rest} />;
});
ConfettiCanvas.displayName = "ConfettiCanvas";

// ── BlurFade ──────────────────────────────────────────────────────────────────

function BlurFade({ children, className, delay = 0, duration = 0.4, yOffset = 6, blur = "6px" }: { children: React.ReactNode; className?: string; delay?: number; duration?: number; yOffset?: number; blur?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const variants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: "blur(0px)" },
  };
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} exit="hidden" variants={variants} transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}

// ── GradientBackground ────────────────────────────────────────────────────────

const GradientBackground = () => (
  <>
    <style>{`@keyframes float1{0%{transform:translate(0,0)}50%{transform:translate(-10px,10px)}100%{transform:translate(0,0)}}@keyframes float2{0%{transform:translate(0,0)}50%{transform:translate(10px,-10px)}100%{transform:translate(0,0)}}`}</style>
    <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="absolute top-0 left-0 w-full h-full">
      <defs>
        <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" /><stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" /></linearGradient>
        <linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.5" /><stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" /></linearGradient>
        <radialGradient id="rg3" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" /><stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.2" /></radialGradient>
        <filter id="rb1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="35" /></filter>
        <filter id="rb2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="25" /></filter>
        <filter id="rb3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45" /></filter>
      </defs>
      <g style={{ animation: "float1 20s ease-in-out infinite" }}>
        <ellipse cx="200" cy="500" rx="250" ry="180" fill="url(#rg1)" filter="url(#rb1)" transform="rotate(-30 200 500)" />
        <rect x="500" y="100" width="300" height="250" rx="80" fill="url(#rg2)" filter="url(#rb2)" transform="rotate(15 650 225)" />
      </g>
      <g style={{ animation: "float2 25s ease-in-out infinite" }}>
        <circle cx="650" cy="450" r="150" fill="url(#rg3)" filter="url(#rb3)" opacity="0.7" />
        <ellipse cx="50" cy="150" rx="180" ry="120" fill="#1e3a5f" filter="url(#rb2)" opacity="0.5" />
      </g>
    </svg>
  </>
);

// ── Glass input styles ────────────────────────────────────────────────────────

const GLASS_STYLES = `
  @property --angle-1{syntax:"<angle>";inherits:false;initial-value:-75deg}@property --angle-2{syntax:"<angle>";inherits:false;initial-value:-45deg}
  .glass-input-wrap{position:relative;z-index:2;transform-style:preserve-3d;border-radius:9999px}.glass-input{display:flex;position:relative;width:100%;align-items:center;gap:.5rem;border-radius:9999px;padding:.25rem;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(clamp(1px,.125em,4px));transition:all 400ms cubic-bezier(.25,1,.5,1);background:linear-gradient(-75deg,oklch(from var(--background) l c h/5%),oklch(from var(--background) l c h/20%),oklch(from var(--background) l c h/5%));box-shadow:inset 0 .125em .125em oklch(from var(--foreground) l c h/5%),inset 0 -.125em .125em oklch(from var(--background) l c h/50%),0 .25em .125em -.125em oklch(from var(--foreground) l c h/20%),0 0 .1em .25em inset oklch(from var(--background) l c h/20%),0 0 0 0 oklch(from var(--background) l c h)}.glass-input-wrap:focus-within .glass-input{backdrop-filter:blur(.01em);box-shadow:inset 0 .125em .125em oklch(from var(--foreground) l c h/5%),inset 0 -.125em .125em oklch(from var(--background) l c h/50%),0 .15em .05em -.1em oklch(from var(--foreground) l c h/25%),0 0 .05em .1em inset oklch(from var(--background) l c h/50%),0 0 0 0 oklch(from var(--background) l c h)}.glass-input::after{content:"";position:absolute;z-index:1;inset:0;border-radius:9999px;width:calc(100% + clamp(1px,.0625em,4px));height:calc(100% + clamp(1px,.0625em,4px));top:calc(0% - clamp(1px,.0625em,4px)/2);left:calc(0% - clamp(1px,.0625em,4px)/2);padding:clamp(1px,.0625em,4px);box-sizing:border-box;background:conic-gradient(from var(--angle-1) at 50% 50%,oklch(from var(--foreground) l c h/50%) 0%,transparent 5% 40%,oklch(from var(--foreground) l c h/50%) 50%,transparent 60% 95%,oklch(from var(--foreground) l c h/50%) 100%),linear-gradient(180deg,oklch(from var(--background) l c h/50%),oklch(from var(--background) l c h/50%));mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:all 400ms cubic-bezier(.25,1,.5,1),--angle-1 500ms ease;box-shadow:inset 0 0 0 calc(clamp(1px,.0625em,4px)/2) oklch(from var(--background) l c h/50%);pointer-events:none}.glass-input-wrap:focus-within .glass-input::after{--angle-1:-125deg}.glass-input-text-area{position:absolute;inset:0;border-radius:9999px;pointer-events:none}.glass-input-text-area::after{content:"";display:block;position:absolute;width:calc(100% - clamp(1px,.0625em,4px));height:calc(100% - clamp(1px,.0625em,4px));top:calc(0% + clamp(1px,.0625em,4px)/2);left:calc(0% + clamp(1px,.0625em,4px)/2);box-sizing:border-box;border-radius:9999px;overflow:clip;background:linear-gradient(var(--angle-2),transparent 0%,oklch(from var(--background) l c h/50%) 40% 50%,transparent 55%);z-index:3;mix-blend-mode:screen;pointer-events:none;background-size:200% 200%;background-position:0% 50%;transition:background-position calc(400ms*1.25) cubic-bezier(.25,1,.5,1),--angle-2 calc(400ms*1.25) cubic-bezier(.25,1,.5,1)}.glass-input-wrap:focus-within .glass-input-text-area::after{background-position:25% 50%}
  .glass-btn-wrap{--anim-time:400ms;--anim-ease:cubic-bezier(.25,1,.5,1);--border-width:clamp(1px,.0625em,4px);position:relative;z-index:2;transform-style:preserve-3d;transition:transform var(--anim-time) var(--anim-ease)}.glass-btn{-webkit-tap-highlight-color:transparent;backdrop-filter:blur(clamp(1px,.125em,4px));transition:all var(--anim-time) var(--anim-ease);background:linear-gradient(-75deg,oklch(from var(--background) l c h/5%),oklch(from var(--background) l c h/20%),oklch(from var(--background) l c h/5%));box-shadow:inset 0 .125em .125em oklch(from var(--foreground) l c h/5%),inset 0 -.125em .125em oklch(from var(--background) l c h/50%),0 .25em .125em -.125em oklch(from var(--foreground) l c h/20%),0 0 .1em .25em inset oklch(from var(--background) l c h/20%),0 0 0 0 oklch(from var(--background) l c h);border-radius:9999px;cursor:pointer}.glass-btn:hover{transform:scale(.975);backdrop-filter:blur(.01em)}
  input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 30px transparent inset!important;-webkit-text-fill-color:var(--foreground)!important;background-color:transparent!important;transition:background-color 5000s ease-in-out 0s!important}
`;

// ── Glass Input Component ─────────────────────────────────────────────────────

function GlassInput({ icon, type, placeholder, value, onChange, onKeyDown, inputRef, rightElement }: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="glass-input-wrap w-full">
      <div className="glass-input">
        <span className="glass-input-text-area" />
        <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-2">
          {icon}
        </div>
        <input
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="relative z-10 h-full w-0 flex-grow bg-transparent text-white placeholder:text-white/50 focus:outline-none py-3"
        />
        {rightElement && (
          <div className="relative z-10 flex-shrink-0 pr-1">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Glass Button ──────────────────────────────────────────────────────────────

function GlassButton({ children, onClick, type = "button", disabled, className }: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("glass-btn-wrap rounded-full", className)}>
      <button type={type} onClick={onClick} disabled={disabled} className="glass-btn relative z-10 px-6 py-3 text-sm font-medium text-white/90 disabled:opacity-40 disabled:cursor-not-allowed w-full">
        {children}
      </button>
    </div>
  );
}

// ── Icon Button ───────────────────────────────────────────────────────────────

function IconBtn({ onClick, children, type = "button" }: { onClick?: () => void; children: React.ReactNode; type?: "button" | "submit" }) {
  return (
    <div className="glass-btn-wrap rounded-full">
      <button type={type} onClick={onClick} className="glass-btn relative z-10 p-2.5 text-white/80 hover:text-white">
        {children}
      </button>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen() {
  const { signIn, signUp, error, enterAsGuest } = useAuthContext();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "password">("email");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const confettiRef = useRef<ConfettiRef>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;

  useEffect(() => {
    if (step === "password") setTimeout(() => passwordRef.current?.focus(), 400);
  }, [step]);

  const fireCelebration = () => {
    const fire = confettiRef.current?.fire;
    if (!fire) return;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    fire({ ...defaults, particleCount: 50, origin: { x: 0, y: 1 }, angle: 60 });
    fire({ ...defaults, particleCount: 50, origin: { x: 1, y: 1 }, angle: 120 });
  };

  const handleEmailContinue = () => {
    if (isEmailValid) setStep("password");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || !isPasswordValid || submitting) return;

    setSubmitting(true);
    setSuccessMsg("");

    if (mode === "signin") {
      const ok = await signIn(email, password);
      if (ok) {
        fireCelebration();
        setShowSuccess(true);
        setTimeout(() => router.push("/"), 1500);
      }
      // On failure, useAuth sets `error` which is already shown in the UI.
      // Clear the password so the user can retype without ghosting the field.
      else {
        setPassword("");
      }
    } else {
      const msg = await signUp(email, password);
      if (msg) {
        setSuccessMsg(msg);
        setMode("signin");
        setStep("email");
      }
    }
    setSubmitting(false);
  };

  const handleGuest = () => {
    enterAsGuest();
    router.push("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === "email") handleEmailContinue();
    }
  };

  return (
    <div className="bg-[#06060f] min-h-screen w-screen flex flex-col text-white">
      <style dangerouslySetInnerHTML={{ __html: GLASS_STYLES }} />
      <ConfettiCanvas ref={confettiRef} manualstart className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]" />

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#06060f]/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 p-8">
              <PartyPopper className="w-12 h-12 text-green-400" />
              <p className="text-xl font-semibold">Welcome back!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo */}
      <div className="fixed top-4 left-4 z-20 flex items-center gap-2 md:left-1/2 md:-translate-x-1/2">
        <AdmitEdgeLogo size={28} />
        <h1 className="text-base font-bold">AdmitEdge</h1>
      </div>

      {/* Main content */}
      <div className="flex w-full flex-1 h-full items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0"><GradientBackground /></div>

        <fieldset disabled={submitting} className="relative z-10 flex flex-col items-center gap-8 w-[300px] mx-auto p-4">
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div key="email-header" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center gap-4">
                <BlurFade delay={0.1} className="w-full">
                  <div className="text-center">
                    <p className="font-light text-4xl sm:text-5xl tracking-tight text-white">
                      {mode === "signin" ? "Welcome back" : "Get started"}
                    </p>
                  </div>
                </BlurFade>
                <BlurFade delay={0.2}>
                  <p className="text-sm text-zinc-400">
                    {mode === "signin" ? "Sign in to continue" : "Create your account"}
                  </p>
                </BlurFade>
              </motion.div>
            )}
            {step === "password" && (
              <motion.div key="password-header" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center gap-4">
                <BlurFade delay={0} className="w-full">
                  <div className="text-center">
                    <p className="font-light text-4xl sm:text-5xl tracking-tight text-white">
                      {mode === "signin" ? "Enter password" : "Create password"}
                    </p>
                  </div>
                </BlurFade>
                <BlurFade delay={0.1}>
                  <p className="text-sm text-zinc-400">{email}</p>
                </BlurFade>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-sm text-emerald-400">{successMsg}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.div key="email-form" exit={{ opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.3 }} className="space-y-4">
                  <BlurFade delay={0.3} className="w-full">
                    <GlassInput
                      icon={<Mail className="h-5 w-5 text-white/70" />}
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={setEmail}
                      onKeyDown={handleKeyDown}
                      rightElement={isEmailValid ? <IconBtn onClick={handleEmailContinue}><ArrowRight className="w-5 h-5" /></IconBtn> : undefined}
                    />
                  </BlurFade>
                </motion.div>
              )}

              {step === "password" && (
                <motion.div key="password-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-4">
                  <BlurFade delay={0} className="w-full">
                    <GlassInput
                      icon={
                        isPasswordValid
                          ? <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/70 hover:text-white">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                          : <Lock className="h-5 w-5 text-white/70" />
                      }
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={setPassword}
                      inputRef={passwordRef}
                      rightElement={isPasswordValid ? <IconBtn type="submit"><ArrowRight className="w-5 h-5" /></IconBtn> : undefined}
                    />
                  </BlurFade>
                  <BlurFade delay={0.15}>
                    <button type="button" onClick={() => setStep("email")} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Go back
                    </button>
                  </BlurFade>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Guest + toggle — only on email step */}
          {step === "email" && (
            <>
              <BlurFade delay={0.4} className="w-full">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-zinc-600">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </BlurFade>

              <BlurFade delay={0.5} className="w-full">
                <GlassButton onClick={handleGuest} className="w-full">
                  <span className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    Continue as Guest
                  </span>
                </GlassButton>
              </BlurFade>

              <BlurFade delay={0.6}>
                <p className="text-sm text-zinc-500 text-center">
                  {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setSuccessMsg(""); }}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    {mode === "signin" ? "Create one" : "Sign in"}
                  </button>
                </p>
              </BlurFade>
            </>
          )}
        </fieldset>
      </div>
    </div>
  );
}
