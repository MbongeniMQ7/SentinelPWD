import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/set-password")({
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Redirect away if no active session
  if (!authLoading && !profile) {
    navigate({ to: "/choose-role" });
    return null;
  }

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains a special character", met: /[^a-zA-Z0-9]/.test(password) },
    { label: "Passwords match", met: password.length > 0 && password === confirm },
  ];

  const allMet = rules.every((r) => r.met);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allMet) return;
    if (!profile) return;

    setLoading(true);
    try {
      // 1. Update auth password
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) {
        toast.error(pwErr.message ?? "Failed to update password.");
        return;
      }

      // 2. Clear needs_password_reset flag on the profile
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ needs_password_reset: false })
        .eq("profile_id", profile.profile_id);

      if (profErr) {
        console.error("Could not clear password reset flag:", profErr.message);
      }

      setDone(true);
      toast.success("Password set successfully! Welcome to SentinelAI.");

      // Redirect after brief pause
      setTimeout(() => {
        const dest =
          profile.role === "OWNER"
            ? "/owner/dashboard"
            : profile.role === "MANAGER"
            ? "/admin/dashboard"
            : "/user/home";
        navigate({ to: dest as "/" });
      }, 2000);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-2xl font-extrabold text-ink">You're all set!</h2>
          <p className="mt-2 text-[13px] text-ink-soft">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 py-10">

      {/* Card */}
      <div className="w-full max-w-sm animate-slide-up">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
               style={{ background: "linear-gradient(135deg,#1a2240,#252f55)" }}>
            <ShieldCheck className="h-8 w-8 text-gold" />
          </div>
          <h1 className="text-[28px] font-black text-ink leading-tight tracking-tight">
            Set Your Password
          </h1>
          <p className="mt-2 text-[13px] text-ink-soft leading-relaxed max-w-65">
            Welcome to <strong className="text-ink">SentinelAI</strong>. Please create a secure password
            to continue.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">

          {/* Greeting chip */}
          {profile && (
            <div className="mb-5 rounded-xl bg-gold-soft px-4 py-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-[13px] font-black text-gold-foreground">
                {profile.first_name?.[0]?.toUpperCase() ?? "?"}
                {profile.last_name?.[0]?.toUpperCase() ?? ""}
              </div>
              <div>
                <p className="text-[13px] font-bold text-ink leading-tight">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-[11px] text-ink-soft leading-tight mt-0.5">
                  {profile.email ?? ""}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  className="w-full h-12 pl-10 pr-10 rounded-xl bg-muted text-[14px] text-ink
                             placeholder:text-ink-soft outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full h-12 pl-10 pr-10 rounded-xl bg-muted text-[14px] text-ink
                             placeholder:text-ink-soft outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  aria-label="Toggle confirm visibility"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Strength rules */}
            {password.length > 0 && (
              <div className="rounded-xl bg-muted px-4 py-3 space-y-2">
                {rules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0
                                    transition-colors duration-200
                                    ${rule.met ? "bg-success/15" : "bg-danger/10"}`}>
                      <div className={`h-2 w-2 rounded-full ${rule.met ? "bg-success" : "bg-danger/40"}`} />
                    </div>
                    <span className={`text-[12px] ${rule.met ? "text-ink" : "text-ink-soft"}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!allMet || loading}
              className="w-full h-12 rounded-xl font-bold text-[15px] text-white transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: allMet
                  ? "linear-gradient(135deg,#1a2240,#252f55)"
                  : undefined,
                backgroundColor: !allMet ? "var(--muted)" : undefined,
                color: !allMet ? "var(--ink-soft)" : undefined,
              }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Set Password & Enter
                </>
              )}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-soft">
          SentinelAI &mdash; Smart Workforce Intelligence
        </p>
      </div>
    </div>
  );
}
