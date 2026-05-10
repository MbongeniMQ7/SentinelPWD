import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck, Activity, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/user/BrandLogo";
import logo from "@/assets/logo.png";
import { signInAny } from "@/lib/auth";
import { supabase, type AppRole } from "@/lib/supabase";

export const Route = createFileRoute("/choose-role")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    const role = profile?.role;
    if (role === "MANAGER") throw redirect({ to: "/admin/dashboard" });
    if (role === "OWNER") throw redirect({ to: "/owner/dashboard" });
    if (role === "EMPLOYEE") throw redirect({ to: "/user/home" });
  },
  component: LoginPage,
});

const roleRedirects: Record<AppRole, string> = {
  EMPLOYEE: "/user/home",
  MANAGER: "/admin/dashboard",
  OWNER: "/owner/dashboard",
};

function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error, role, needsPasswordReset } = await signInAny(emailOrUsername, password);
      if (error) {
        setErrorMsg(error);
        toast.error(error);
        return;
      }
      if (needsPasswordReset) {
        await navigate({ to: "/auth/set-password" });
        return;
      }
      toast.success("Welcome back!");
      await navigate({ to: role ? roleRedirects[role] : "/user/home" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
      console.error("[Login]", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Top nav bar */}
      <header className="w-full border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <BrandLogo size="md" />
          <Link
            to="/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Main two-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — branding (desktop only) */}
        <div
          className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-16 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.42 0.04 235) 0%, oklch(0.36 0.04 245) 100%)",
          }}
        >
          {/* Logo as large watermark background */}
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto w-[70%] object-contain select-none"
            style={{ opacity: 0.14, filter: "blur(0.5px) grayscale(0.2)" }}
          />

          {/* Colour blobs */}
          <div
            className="pointer-events-none absolute top-0 right-0 h-96 w-96 opacity-15"
            style={{
              background: "radial-gradient(circle, oklch(0.65 0.15 220), transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 opacity-10"
            style={{
              background: "radial-gradient(circle, oklch(0.75 0.12 80), transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md">
            <h2 className="text-4xl font-display font-bold text-white leading-tight">
              Every shift.<br />Every worker.<br />Every risk — detected.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/55">
              SentinelAI continuously reads biometric signals from wearable devices, flags fatigue before it becomes dangerous, and puts the right information in front of the right people — instantly.
            </p>

            <div className="mt-10 space-y-4">
              {[
                {
                  icon: <Activity className="h-5 w-5 text-cyan-300" />,
                  label: "Wearable heart-rate & movement tracked every second",
                },
                {
                  icon: <ShieldCheck className="h-5 w-5 text-emerald-300" />,
                  label: "Supervisors alerted before incidents happen, not after",
                },
                {
                  icon: <Sparkles className="h-5 w-5 text-amber-300" />,
                  label: "AI risk scores built from your site's own patterns",
                },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <span className="text-sm text-white/70">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/30">
            © {new Date().getFullYear()} SentinelAI. All rights reserved.
          </p>
        </div>

        {/* Right panel — login form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16 bg-background relative overflow-hidden">
          {/* Subtle blob */}
          <div
            className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 opacity-10"
            style={{
              background: "radial-gradient(circle, oklch(0.65 0.14 240), transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          <div className="relative z-10 w-full max-w-md">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your username or email and password to access your dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Username or email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="SentinelAI or you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Inline error */}
              {errorMsg && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {errorMsg}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:opacity-60 shadow-lg shadow-navy/20"
                style={{ background: "linear-gradient(135deg, oklch(0.28 0.07 250), oklch(0.22 0.06 260))" }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground text-center">
              By signing in you agree to the{" "}
              <span className="font-semibold text-foreground">SentinelAI Safety &amp; Data Protocols</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

