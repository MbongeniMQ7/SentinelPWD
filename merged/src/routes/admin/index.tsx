import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { User, ShieldCheck, ShieldUser, Mail, Lock, ArrowRight, Globe, Loader2 } from "lucide-react";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import type { AppRole } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "SentinelAI Admin — Login" },
      { name: "description", content: "Access your SentinelAI safety dashboard and workforce intelligence insights." },
      { property: "og:title", content: "SentinelAI Admin — Login" },
      { property: "og:description", content: "Access your safety dashboard and insights." },
    ],
  }),
  component: LoginPage,
});

type UIRole = "User" | "Admin" | "Owner";
const roleMap: Record<UIRole, AppRole> = { User: "user", Admin: "admin", Owner: "owner" };
const roleRedirects: Record<UIRole, string> = {
  User: "/user/home",
  Admin: "/admin/dashboard",
  Owner: "/owner/dashboard",
};

function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UIRole>("Admin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const roles: { key: UIRole; icon: typeof User }[] = [
    { key: "User", icon: User },
    { key: "Admin", icon: ShieldCheck },
    { key: "Owner", icon: ShieldUser },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password, roleMap[role]);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Welcome back!");
        navigate({ to: roleRedirects[role] });
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password, roleMap[role], fullName);
        if (error) {
          toast.error(error);
          return;
        }
        if (needsEmailConfirmation) {
          toast.success("Check your email to confirm your account.");
          setMode("login");
        } else {
          toast.success("Account created!");
          navigate({ to: roleRedirects[role] });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Password reset link sent to your email.");
    }
  }

  return (
    <div className="phone-shell !pb-0 flex flex-col" style={{ background: "linear-gradient(180deg, oklch(0.97 0.01 250), oklch(0.93 0.02 250))" }}>
      <main className="flex-1 px-5 pt-10">
        <div className="bg-surface rounded-[28px] shadow-sm p-6 pt-8">
          <h1 className="text-[30px] font-extrabold text-ink leading-tight">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            {mode === "login" ? "Access your safety dashboard and insights." : "Join SentinelAI to get started."}
          </p>

          {/* Mode toggle */}
          <div className="mt-5 flex rounded-xl overflow-hidden border border-border">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-[13px] font-bold transition ${
                  mode === m ? "bg-warning/20 text-ink" : "text-ink-soft"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <p className="mt-6 text-[13px] font-semibold text-ink">Select Access Role</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {roles.map(({ key, icon: Icon }) => {
              const active = role === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition ${
                    active
                      ? "border-warning bg-warning/5"
                      : "border-transparent bg-muted"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-ink" : "text-ink-soft"}`} />
                  <span className="text-[13px] font-bold text-ink">{key}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-[13px] font-semibold text-ink">Full Name</label>
                <div className="mt-2 relative">
                  <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft/70 outline-none focus:ring-2 focus:ring-warning/40"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[13px] font-semibold text-ink">Email Address</label>
              <div className="mt-2 relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft/70 outline-none focus:ring-2 focus:ring-warning/40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-ink">Security Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[12px] font-extrabold tracking-wider text-warning-foreground/80 hover:text-warning"
                  >
                    FORGOT?
                  </button>
                )}
              </div>
              <div className="mt-2 relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft/70 outline-none focus:ring-2 focus:ring-warning/40"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="text-[13px] font-semibold text-ink">Confirm Password</label>
                <div className="mt-2 relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft/70 outline-none focus:ring-2 focus:ring-warning/40"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 py-4 rounded-2xl bg-warning/30 hover:bg-warning/50 disabled:opacity-60 transition text-[15px] font-bold text-ink flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Login to Sentinel" : "Create Account"} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="mt-auto px-5 py-6 bg-info-soft/40">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-ink-soft">
          <span>© 2026<br />SENTINELAI<br />GLOBAL</span>
          <Link to="/" className="hover:text-ink">PRIVACY<br />POLICY</Link>
          <Link to="/" className="hover:text-ink">COMPLIANCE</Link>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-bold tracking-wider text-ink-soft">
          <Globe className="h-3 w-3" /> GLOBAL TERMINAL (EN-UK)
        </div>
      </footer>
    </div>
  );
}
