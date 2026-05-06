import { supabase, type AppRole } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

export interface SignInResult {
  error: string | null;
}

export interface SignUpResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

/**
 * Fetch the profile row for the currently authenticated user.
 * Returns null if no session or no profile found.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .single();

  return (data as Profile) ?? null;
}

/**
 * Resolve the AppRole for a given auth user id by querying the profiles table.
 */
async function fetchRoleForUser(authUserId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", authUserId)
    .single();
  return (data?.role as AppRole) ?? null;
}

/**
 * Sign in without requiring a known role upfront.
 * Reads role from the profiles table after authentication.
 */
export async function signInAny(
  email: string,
  password: string
): Promise<{ error: string | null; role: AppRole | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message, role: null };

  const role = await fetchRoleForUser(data.user.id);
  if (!role) {
    await supabase.auth.signOut();
    return { error: "Account not set up yet. Contact your administrator.", role: null };
  }

  return { error: null, role };
}

/**
 * Send a password-reset email.
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error ? error.message : null };
}

/**
 * Sign the current user out.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
