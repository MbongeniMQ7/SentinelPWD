import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type AppRole } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", userId)
    .single();
  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    role: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount — no need for a
    // separate getSession() call, which would trigger fetchProfile twice.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      setState({
        session,
        user: session?.user ?? null,
        role: (profile?.role as AppRole) ?? null,
        profile,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Access the current auth state (session, user, role, profile, loading). */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
