"use client";

import React, { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  readonly user: User | null;
  readonly guest: boolean;
  readonly loading: boolean;
  readonly error: string;
  readonly signIn: (email: string, password: string) => Promise<boolean>;
  readonly signUp: (email: string, password: string) => Promise<string | null>;
  readonly signOut: () => Promise<void>;
  readonly enterAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

interface AuthProviderProps {
  readonly children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
