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
 * Persist the snapshot to Supabase fatigue_sessions table.
 * Call this after saveSession() when the monitoring session ends.
 */
export async function saveSessionToDb(
  snap: Omit<SessionSnapshot, "terminatedAt"> & { terminatedAt?: string }
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const terminatedAt = snap.terminatedAt ?? new Date().toISOString();

  const { error } = await supabase.from("fatigue_sessions").insert({
    user_id: user.id,
    score: snap.score,
    level: snap.level,
    blink_rate: snap.blinkRate,
    eye_closure: snap.eyeClosure,
    focus: snap.focus,
    duration_seconds: snap.durationSeconds,
    trend: snap.trend,
    terminated_at: terminatedAt,
  });

  return { error: error ? error.message : null };
}

/**
 * Load the most recent N sessions for the current user from Supabase.
 * Returns sessions ordered newest-first.
 */
export async function loadSessionHistory(
  limit = 20
): Promise<{ sessions: DbSession[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sessions: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("fatigue_sessions")
    .select("id, score, level, blink_rate, eye_closure, focus, duration_seconds, trend, terminated_at")
    .eq("user_id", user.id)
    .order("terminated_at", { ascending: false })
    .limit(limit);

  if (error) return { sessions: [], error: error.message };
  return { sessions: (data ?? []) as DbSession[], error: null };
}
