import { supabase } from "@/lib/supabase";
import type { Profile as DbProfile, UserRole } from "@/lib/database.types";

// Re-export the canonical DB type as Profile for backward compat
export type { DbProfile as Profile };

export type ProfileUpdate = Partial<
  Pick<DbProfile, "first_name" | "last_name" | "phone" | "username">
>;

/** Fetch the current user's full profile row from the profiles table. */
export async function getProfile(): Promise<{ data: DbProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*, employee_profiles(*), manager_profiles(*)")
    .eq("auth_user_id", user.id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as DbProfile, error: null };
}

/** Update the current user's profile row. */
export async function updateProfile(updates: ProfileUpdate): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("auth_user_id", user.id);

  return { error: error ? error.message : null };
}

/**
 * Upload a profile avatar to Supabase Storage (bucket: "avatars").
 * Returns the public URL on success.
 */
export async function uploadAvatar(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not authenticated" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { url: null, error: updateError.message };

  return { url: publicUrl, error: null };
}
