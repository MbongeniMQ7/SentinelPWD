import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  company: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<Profile, "full_name" | "phone" | "job_title" | "department" | "company" | "avatar_url">
>;

/**
 * Resolve an avatar_url value to a displayable URL:
 * - If it already starts with http(s), return as-is
 * - If it looks like a storage path (e.g. "uuid/avatar.jpg"), get the public URL
 * - If null/empty, return null
 */
function resolveAvatarUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // Treat as a storage path inside the "avatars" bucket
  const { data } = supabase.storage.from("avatars").getPublicUrl(raw);
  return data.publicUrl ?? null;
}

/** Fetch the current user's profile row. */
export async function getProfile(): Promise<{ data: Profile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return { data: null, error: error.message };

  const profile = data as Profile;

  // Resolve the avatar URL — prefer the stored value, fall back to OAuth metadata
  const rawAvatar =
    profile.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null;

  return {
    data: { ...profile, avatar_url: resolveAvatarUrl(rawAvatar) },
    error: null,
  };
}

/** Update the current user's profile row. */
export async function updateProfile(updates: ProfileUpdate): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  return { error: error ? error.message : null };
}

/**
 * Upload a profile avatar to Supabase Storage (bucket: "avatars").
 * Overwrites any existing avatar for the user and saves the URL to the profile row.
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

  // Add a cache-busting timestamp so the browser always loads the new image
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  // Persist the URL back to the profile row
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { url: null, error: updateError.message };

  return { url: publicUrl, error: null };
}
