"use client";

interface LogoProps {
  size?: number;
  className?: string;
}

export function AdmitEdgeLogo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="url(#logo-bg)" />
      <path
        d="M32 14L18 50h6l2.5-7h11L40 50h6L32 14zm-3.5 23L32 27l3.5 10h-7z"
        fill="white"
      />
      <path
        d="M44 20l-4 12h3l1-3h5l1 3h3l-4-12h-5zm.5 7l1.5-4.5L47.5 27h-3z"
        fill="url(#logo-accent)"
        opacity="0.7"
      />
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="logo-accent" x1="42" y1="20" x2="52" y2="32">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  );
}
