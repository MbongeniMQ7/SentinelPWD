import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type AppRole } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    // Hydrate from the persisted session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        role: (session?.user?.user_metadata?.role as AppRole) ?? null,
        loading: false,
      });
    });

    // Keep state in sync with Supabase auth events (sign-in, sign-out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        role: (session?.user?.user_metadata?.role as AppRole) ?? null,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Access the current auth state (session, user, role, loading). */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
