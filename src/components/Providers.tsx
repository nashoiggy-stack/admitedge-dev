"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { BackgroundProvider } from "./BackgroundProvider";

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
      themes={["light", "dark", "monochrome"]}
    >
      <BackgroundProvider>{children}</BackgroundProvider>
    </ThemeProvider>
  );
}
