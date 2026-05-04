import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { User, ShieldCheck, Shield, Mail, Lock, ArrowRight, Globe, Loader2 } from "lucide-react";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import type { AppRole } from "@/lib/supabase";

type UIRole = "user" | "admin" | "owner";

const roles: { id: UIRole; label: string; Icon: typeof User }[] = [
  { id: "user", label: "User", Icon: User },
  { id: "admin", label: "Admin", Icon: ShieldCheck },
  { id: "owner", label: "Owner", Icon: Shield },
];

const roleRedirects: Record<UIRole, string> = {
  user: "/user/home",
  admin: "/admin/dashboard",
  owner: "/owner/dashboard",
};

const Login = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UIRole>("owner");
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
        nav({ to: roleRedirects[role] });
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
          nav({ to: roleRedirects[role] });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col">
      <main className="flex-1 flex items-start justify-center px-4 pt-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-7">
          <h1 className="font-display text-3xl font-bold text-primary">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground mt-2 text-[15px]">
            {mode === "login"
              ? "Access your safety dashboard and insights."
              : "Join SentinelAI to get started."}
          </p>

          {/* Mode toggle */}
          <div className="mt-5 flex rounded-xl overflow-hidden border border-border">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-[13px] font-bold transition ${
                  mode === m ? "bg-gold/10 text-primary" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <p className="mt-7 text-sm font-medium text-primary">Select Access Role</p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {roles.map(({ id, label, Icon }) => {
              const active = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRole(id)}
                  className={`rounded-2xl py-5 flex flex-col items-center gap-2 border-2 transition-all ${
                    active
                      ? "border-gold bg-gold/5 text-primary"
                      : "border-transparent bg-secondary text-primary/70"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                  <span className="text-[13px] font-semibold">{label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-primary">Full Name</label>
                <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-primary">Email Address</label>
              <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-primary">Security Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-gold text-xs font-bold tracking-wider"
                  >
                    FORGOT?
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent flex-1 outline-none text-primary"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-primary">Confirm Password</label>
                <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-transparent flex-1 outline-none text-primary"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gold/30 hover:bg-gold/50 disabled:opacity-60 transition-colors rounded-2xl py-4 flex items-center justify-center gap-2 font-display text-primary font-bold text-[17px]"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Login to Sentinel" : "Create Account"} <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 px-6 py-5 text-center text-xs">
        <div className="flex justify-center gap-6 items-center text-muted-foreground font-semibold tracking-wider">
          <span>© 2026<br />SENTINELAI<br />GLOBAL</span>
          <span>PRIVACY<br />POLICY</span>
          <span>COMPLIANCE</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-muted-foreground font-semibold tracking-wider">
          <Globe className="h-3.5 w-3.5" /> GLOBAL TERMINAL (EN-UK)
        </div>
      </footer>
    </div>
  );
};

export const Route = createFileRoute("/owner/login")({ component: Login });
