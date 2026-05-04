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

/** Fetch the current user's profile row. */
export async function getProfile(): Promise<{ data: Profile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data: data ?? null, error: error ? error.message : null };
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
