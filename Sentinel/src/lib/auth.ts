import { supabase, type AppRole } from "@/lib/supabase";

export interface SignInResult {
  error: string | null;
}

export interface SignUpResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

/**
 * Sign in with email + password and verify the stored role matches `expectedRole`.
 */
export async function signIn(
  email: string,
  password: string,
  expectedRole: AppRole
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const storedRole: AppRole | undefined = data.user?.user_metadata?.role;

  if (storedRole && storedRole !== expectedRole) {
    await supabase.auth.signOut();
    return {
      error: `This account is registered as "${storedRole}". Please select the correct role.`,
    };
  }

  return { error: null };
}

/**
 * Create a new account with email, password, role, first name and last name.
 * The full_name is stored in user_metadata so the DB trigger can populate profiles.
 */
export async function signUp(
  email: string,
  password: string,
  role: AppRole,
  firstName?: string,
  lastName?: string
): Promise<SignUpResult> {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName ?? "" },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase returns a session immediately when email confirmations are disabled,
  // otherwise it returns only a user with no session.
  const needsEmailConfirmation = !data.session;
  return { error: null, needsEmailConfirmation };
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
