"use client";

import React from "react";
import { AuthProvider } from "./AuthProvider";
import { AuthGate } from "./AuthGate";
import { NavBarWrapper } from "./NavBarWrapper";
import { ProfileSync } from "./ProfileSync";

interface AppShellProps {
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <AuthProvider>
      <AuthGate>
        <ProfileSync />
        <NavBarWrapper />
        <div id="main-content">{children}</div>
      </AuthGate>
    </AuthProvider>
  );
};
