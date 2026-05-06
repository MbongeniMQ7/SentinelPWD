import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { User, ShieldCheck, Shield, Mail, Lock, ArrowRight, Globe, Loader2, Camera } from "lucide-react";
import { signInAny, resetPassword } from "@/lib/auth";
import { uploadAvatar, updateProfile } from "@/lib/profile";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error, role: detectedRole } = await signInAny(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Welcome back!");
        const dest = detectedRole === "OWNER" ? "/owner/dashboard"
          : detectedRole === "MANAGER" ? "/admin/dashboard"
          : "/user/home";
        nav({ to: dest });
      } else {
        toast.info("New accounts are created by your administrator. Please contact them to get access.");
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
              <>
                {/* Avatar picker */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-20 w-20 rounded-full bg-secondary border-2 border-dashed border-border overflow-hidden flex items-center justify-center hover:border-gold transition"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-7 w-7 text-muted-foreground" />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[9px] font-bold text-white text-center py-1">
                      PHOTO
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-[11px] text-muted-foreground">Tap to upload your photo</p>
                </div>

                {/* First + Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-primary">First Name</label>
                    <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                        className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-primary">Last Name</label>
                    <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                        className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              </>
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
