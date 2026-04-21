import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[80dvh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500 font-semibold mb-6">
        Page not found
      </p>
      <h1
        className="font-[family-name:var(--font-display)] tracking-tight text-white leading-[1] mb-4"
        style={{ fontSize: "clamp(3rem, 10vw, 8rem)" }}
      >
        404
      </h1>
      <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto mb-10 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Head back to a familiar place.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.97]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>
    </main>
  );
}
