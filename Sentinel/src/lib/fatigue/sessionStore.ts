/**
 * sessionStore — persists the last completed monitoring session snapshot
 * in sessionStorage (for immediate cross-navigation display) AND in
 * Supabase (for persistent history and trend charts on the dashboard).
 */

import { supabase } from "@/lib/supabase";
import type { RiskLevel } from "./riskScore";

const KEY = "sentinel_last_session";

export interface SessionSnapshot {
  score: number;
  level: RiskLevel;
  blinkRate: number;
  eyeClosure: number;
  focus: number;
  trend: number[];
  /** ISO string of when the session was terminated */
  terminatedAt: string;
  /** Session duration in seconds */
  durationSeconds: number;
}

export function saveSession(snap: Omit<SessionSnapshot, "terminatedAt">): void {
  try {
    const data: SessionSnapshot = {
      ...snap,
      terminatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable (private mode, storage full) — fail silently
  }
}

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// ── Supabase persistence ───────────────────────────────────────────────────────

export interface DbSession {
  id: string;
  score: number;
  level: RiskLevel;
  blink_rate: number;
  eye_closure: number;
  focus: number;
  duration_seconds: number;
  trend: number[];
  terminated_at: string;
}

/**
 * Resolves the current user's profile_id and company_id from Supabase.
 * Returns null if not authenticated or profile not found.
 */
async function resolveProfile(): Promise<{ profile_id: string; company_id: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("profile_id, company_id")
    .eq("auth_user_id", user.id)
    .single();
  if (!data?.profile_id || !data?.company_id) return null;
  return data as { profile_id: string; company_id: string };
}

/**
 * Creates a RUNNING camera_analysis_sessions record in the DB.
 * Call this when the user starts monitoring. Returns the session_id
 * so it can be passed to stopSessionInDb() on terminate.
 */
export async function startSessionInDb(): Promise<{ sessionId: string | null; error: string | null }> {
  const profile = await resolveProfile();
  if (!profile) return { sessionId: null, error: "Not authenticated or profile missing" };

  const { data, error } = await supabase
    .from("camera_analysis_sessions")
    .insert({
      employee_profile_id: profile.profile_id,
      company_id: profile.company_id,
      status: "RUNNING",
      model_version: "sentinelai-camera-v1",
    })
    .select("session_id")
    .single();

  if (error) return { sessionId: null, error: error.message };
  return { sessionId: data.session_id, error: null };
}

/**
 * Updates an existing RUNNING session to STOPPED and inserts a biometric summary reading.
 * Call this when the user terminates monitoring.
 */
export async function stopSessionInDb(
  sessionId: string,
  snap: Omit<SessionSnapshot, "terminatedAt"> & { terminatedAt?: string }
): Promise<{ error: string | null }> {
  const profile = await resolveProfile();
  if (!profile) return { error: "Not authenticated" };

  const terminatedAt = snap.terminatedAt ?? new Date().toISOString();
  const riskLevel = snap.level.toUpperCase() as "LOW" | "MODERATE" | "HIGH";

  // 1. Update the session record to STOPPED
  const { error: updateError } = await supabase
    .from("camera_analysis_sessions")
    .update({
      status: "STOPPED",
      stopped_at: terminatedAt,
    })
    .eq("session_id", sessionId);

  if (updateError) return { error: updateError.message };

  // 2. Insert summary biometric reading
  const { error: readingError } = await supabase.from("biometric_readings").insert({
    session_id: sessionId,
    employee_profile_id: profile.profile_id,
    captured_at: terminatedAt,
    blink_rate: snap.blinkRate,
    focus_score: snap.focus,
    fatigue_score: snap.score,
    overall_risk_score: snap.score,
    risk_level: riskLevel,
  });

  return { error: readingError ? readingError.message : null };
}

/**
 * Marks a RUNNING session as INTERRUPTED (e.g. page unload or camera error).
 */
export async function interruptSessionInDb(sessionId: string): Promise<void> {
  await supabase
    .from("camera_analysis_sessions")
    .update({ status: "INTERRUPTED", stopped_at: new Date().toISOString() })
    .eq("session_id", sessionId);
}

/**
 * @deprecated Use startSessionInDb + stopSessionInDb instead.
 * Kept for compatibility — creates a completed session in one shot.
 */
export async function saveSessionToDb(
  snap: Omit<SessionSnapshot, "terminatedAt"> & { terminatedAt?: string }
): Promise<{ error: string | null }> {
  const profile = await resolveProfile();
  if (!profile) return { error: "Not authenticated" };

  const terminatedAt = snap.terminatedAt ?? new Date().toISOString();
  const riskLevel = snap.level.toUpperCase() as "LOW" | "MODERATE" | "HIGH";

  const { data: session, error: sessionError } = await supabase
    .from("camera_analysis_sessions")
    .insert({
      employee_profile_id: profile.profile_id,
      company_id: profile.company_id,
      started_at: new Date(Date.now() - snap.durationSeconds * 1000).toISOString(),
      stopped_at: terminatedAt,
      status: "STOPPED",
      model_version: "sentinelai-camera-v1",
    })
    .select("session_id")
    .single();

  if (sessionError) return { error: sessionError.message };

  const { error: readingError } = await supabase.from("biometric_readings").insert({
    session_id: session.session_id,
    employee_profile_id: profile.profile_id,
    captured_at: terminatedAt,
    blink_rate: snap.blinkRate,
    focus_score: snap.focus,
    fatigue_score: snap.score,
    overall_risk_score: snap.score,
    risk_level: riskLevel,
  });

  return { error: readingError ? readingError.message : null };
}

/**
 * Load the most recent N biometric readings for the current user from Supabase.
 * Returns readings ordered newest-first.
 */
export async function loadSessionHistory(
  limit = 20
): Promise<{ sessions: DbSession[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sessions: [], error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile?.profile_id) return { sessions: [], error: null };

  const { data, error } = await supabase
    .from("biometric_readings")
    .select("reading_id, fatigue_score, risk_level, blink_rate, focus_score, overall_risk_score, captured_at")
    .eq("employee_profile_id", profile.profile_id)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) return { sessions: [], error: error.message };

  const sessions: DbSession[] = (data ?? []).map((row: any) => ({
    id: row.reading_id,
    score: row.fatigue_score ?? 0,
    level: (row.risk_level?.toLowerCase() ?? "low") as RiskLevel,
    blink_rate: row.blink_rate ?? 0,
    eye_closure: 0,
    focus: row.focus_score ?? 0,
    duration_seconds: 0,
    trend: [],
    terminated_at: row.captured_at,
  }));

  return { sessions, error: null };
}
