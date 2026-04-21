"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface UseAuthReturn {
  readonly user: User | null;
  readonly guest: boolean;
  readonly loading: boolean;
  readonly error: string;
  readonly signIn: (email: string, password: string) => Promise<boolean>;
  readonly signUp: (email: string, password: string) => Promise<string | null>;
  readonly signOut: () => Promise<void>;
  readonly enterAsGuest: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  };

  const signUp = async (email: string, password: string): Promise<string | null> => {
    setError("");
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      return null;
    }
    return "Account created! Check your email for a confirmation link, then sign in.";
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setGuest(false);
  };

  const enterAsGuest = () => {
    setGuest(true);
  };

  return { user, guest, loading, error, signIn, signUp, signOut, enterAsGuest };
}
