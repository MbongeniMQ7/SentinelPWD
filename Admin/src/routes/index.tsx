import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, ShieldCheck, ShieldUser, Mail, Lock, ArrowRight, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
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

type Role = "User" | "Admin" | "Owner";

function LoginPage() {
  const [role, setRole] = useState<Role>("Admin");
  const navigate = useNavigate();

  const roles: { key: Role; icon: typeof User }[] = [
    { key: "User", icon: User },
    { key: "Admin", icon: ShieldCheck },
    { key: "Owner", icon: ShieldUser },
  ];

  return (
    <div className="phone-shell !pb-0 flex flex-col" style={{ background: "linear-gradient(180deg, oklch(0.97 0.01 250), oklch(0.93 0.02 250))" }}>
      <main className="flex-1 px-5 pt-10">
        <div className="bg-surface rounded-[28px] shadow-sm p-6 pt-8">
          <h1 className="text-[30px] font-extrabold text-ink leading-tight">Welcome Back</h1>
          <p className="mt-2 text-[14px] text-ink-soft">Access your safety dashboard and insights.</p>

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

          <div className="mt-10 space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-ink">Email Address</label>
              <div className="mt-2 relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft/70 outline-none focus:ring-2 focus:ring-warning/40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-ink">Security Password</label>
                <button className="text-[12px] font-extrabold tracking-wider text-warning-foreground/80 hover:text-warning">
                  FORGOT?
                </button>
              </div>
              <div className="mt-2 relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft/70 outline-none focus:ring-2 focus:ring-warning/40"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-ink-soft">
              <input type="checkbox" className="h-4 w-4 rounded border-border accent-warning" />
              Keep me securely logged in
            </label>

            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="w-full h-13 py-4 rounded-2xl bg-warning/30 hover:bg-warning/50 transition text-[15px] font-bold text-ink flex items-center justify-center gap-2"
            >
              Login to Sentinel <ArrowRight className="h-4 w-4" />
            </button>
          </div>
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
