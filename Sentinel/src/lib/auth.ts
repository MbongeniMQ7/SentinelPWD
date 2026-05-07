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
  console.log("[fetchRoleForUser] querying profiles for auth_user_id:", authUserId);
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  console.log("[fetchRoleForUser] result — data:", data, "error:", error);
  if (error) console.warn("[fetchRoleForUser] error:", error.message);
  return (data?.role as AppRole) ?? null;
}

/**
 * Sign in without requiring a known role upfront.
 * Accepts either an email address or a username (looked up in profiles table).
 * Reads role from the profiles table after authentication.
 */
const SIGN_IN_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function signInAny(
  emailOrUsername: string,
  password: string
): Promise<{ error: string | null; role: AppRole | null }> {
  try {
    return await withTimeout(_signInAny(emailOrUsername, password), SIGN_IN_TIMEOUT_MS, "Sign in");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sign in failed. Please try again.";
    return { error: msg, role: null };
  }
}

async function _signInAny(
  emailOrUsername: string,
  password: string
): Promise<{ error: string | null; role: AppRole | null }> {
  // Clear any stale/expired session from localStorage before attempting a fresh
  // sign-in. This prevents the Supabase client from trying to silently refresh
  // an old token (which can hang indefinitely) before processing the new login.
  await supabase.auth.signOut({ scope: "local" });

  let email = emailOrUsername.trim();
  const isEmail = email.includes("@");

  console.log("[signIn] 1. start — isEmail:", isEmail, "input:", emailOrUsername.trim());

  if (!isEmail) {
    console.log("[signIn] 2. username lookup start");
    const { data: profileRow, error: lookupErr } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", email)
      .maybeSingle();
    console.log("[signIn] 3. username lookup done — data:", profileRow, "error:", lookupErr);

    if (lookupErr || !profileRow?.email) {
      return { error: "No account found with that username.", role: null };
    }
    email = profileRow.email;
  }

  console.log("[signIn] 4. calling signInWithPassword for:", email);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log("[signIn] 5. signInWithPassword done — user:", data?.user?.id ?? null, "error:", error?.message ?? null);

  if (error) return { error: error.message, role: null };

  console.log("[signIn] 6. fetching role for user:", data.user.id);

  const role = await fetchRoleForUser(data.user.id);

  console.log("[signIn] 7. role result:", role);

  if (!role) {
    supabase.auth.signOut({ scope: "local" });
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
