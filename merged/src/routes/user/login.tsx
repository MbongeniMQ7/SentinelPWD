import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { User, ShieldAlert, ShieldCheck, Mail, Lock, ArrowRight, Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import type { AppRole } from "@/lib/supabase";

export const Route = createFileRoute("/user/login")({
  component: Login,
});

type UIRole = "user" | "admin" | "owner";

const roles: { id: UIRole; label: string; Icon: typeof User }[] = [
  { id: "user", label: "User", Icon: User },
  { id: "admin", label: "Admin", Icon: ShieldAlert },
  { id: "owner", label: "Owner", Icon: ShieldCheck },
];

const roleRedirects: Record<UIRole, string> = {
  user: "/user/home",
  admin: "/admin/dashboard",
  owner: "/owner/dashboard",
};

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UIRole>("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password, role as AppRole);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Welcome back!");
        navigate({ to: roleRedirects[role] });
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password, role as AppRole, fullName);
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
    <div className="app-shell px-5 py-6 flex flex-col">
      <div className="panel p-6 mt-4">
        <h1 className="text-3xl font-display font-bold">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Access your safety dashboard and insights."
            : "Join SentinelAI to get started."}
        </p>

        {/* Mode toggle */}
        <div className="mt-4 flex rounded-xl overflow-hidden border border-border">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 text-sm font-bold transition ${
                mode === m ? "bg-gold-soft/40 text-gold-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold">Select Access Role</label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {roles.map(({ id, label, Icon }) => {
              const active = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRole(id)}
                  className={`flex flex-col items-center gap-2 rounded-xl py-4 border-2 transition ${
                    active
                      ? "border-gold bg-gold-soft/40"
                      : "border-transparent bg-secondary"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-gold-foreground" : "text-navy"}`} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-semibold">Full Name</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="bg-transparent outline-none w-full text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold">Email Address</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="bg-transparent outline-none w-full text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Security Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-gold-foreground tracking-wide"
                >
                  FORGOT?
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-sm font-semibold">Confirm Password</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent outline-none w-full text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-2xl bg-gold-soft hover:bg-gold/80 disabled:opacity-60 py-4 flex items-center justify-center gap-2 text-gold-foreground font-bold"
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

      <footer className="mt-6 panel px-5 py-4 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
        <span>© 2026 SENTINELAI GLOBAL</span>
        <span className="font-bold text-foreground tracking-wide">PRIVACY POLICY</span>
        <span className="font-bold text-foreground tracking-wide">COMPLIANCE</span>
        <span className="basis-full flex items-center gap-1.5 pt-2 border-t border-border font-semibold tracking-wider">
          <Globe className="h-3.5 w-3.5" /> GLOBAL TERMINAL (EN-UK)
        </span>
      </footer>
    </div>
  );
}
