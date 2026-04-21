import type { Metadata } from "next";
import { Geist, Geist_Mono, Young_Serif } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { BackgroundPicker } from "@/components/BackgroundPicker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displaySerif = Young_Serif({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AdmitEdge — College Prep Suite",
    template: "%s | AdmitEdge",
  },
  description:
    "Grade essays, calculate GPA, evaluate extracurriculars, and estimate admission chances — all in one place.",
  openGraph: {
    title: "AdmitEdge — College Prep Suite",
    description:
      "Grade essays, calculate GPA, evaluate extracurriculars, and estimate admission chances.",
    siteName: "AdmitEdge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdmitEdge — College Prep Suite",
    description:
      "Grade essays, calculate GPA, evaluate extracurriculars, and estimate admission chances.",
  },
  metadataBase: new URL("https://admitedge.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Providers>
          <AppShell>{children}</AppShell>
          <BackgroundPicker />
        </Providers>
      </body>
    </html>
  );
}
