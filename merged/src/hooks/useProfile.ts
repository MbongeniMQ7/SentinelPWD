import { useEffect, useState } from "react";
import { getProfile, updateProfile, type Profile, type ProfileUpdate } from "@/lib/profile";
import { useAuth } from "@/context/AuthContext";

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  update: (updates: ProfileUpdate) => Promise<{ error: string | null }>;
  refetch: () => void;
}

export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfile().then(({ data, error: err }) => {
      setProfile(data);
      setError(err);
      setLoading(false);
    });
  }, [user, tick]);

  async function update(updates: ProfileUpdate) {
    const result = await updateProfile(updates);
    if (!result.error) {
      // Optimistically merge locally so the UI refreshes instantly
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    }
    return result;
  }

  return {
    profile,
    loading,
    error,
    update,
    refetch: () => setTick((t) => t + 1),
  };
}
