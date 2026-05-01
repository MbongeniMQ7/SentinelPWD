import { createFileRoute, Link } from "@tanstack/react-router";
import { User, ShieldAlert, ShieldCheck, Mail, Lock, ArrowRight, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/user/login")({
  component: Login,
});

const roles = [
  { id: "user", label: "User", Icon: User },
  { id: "admin", label: "Admin", Icon: ShieldAlert },
  { id: "owner", label: "Owner", Icon: ShieldCheck },
];

function Login() {
  const [role, setRole] = useState("user");
  const [keep, setKeep] = useState(false);

  return (
    <div className="app-shell px-5 py-6 flex flex-col">
      <div className="panel p-6 mt-4">
        <h1 className="text-3xl font-display font-bold">Welcome Back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access your safety dashboard and insights.
        </p>

        <div className="mt-6">
          <label className="text-sm font-semibold">Select Access Role</label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {roles.map(({ id, label, Icon }) => {
              const active = role === id;
              return (
                <button
                  key={id}
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

        <div className="mt-5">
          <label className="text-sm font-semibold">Email Address</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="name@company.com"
              className="bg-transparent outline-none w-full text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Security Password</label>
            <button
              type="button"
              onClick={() => toast("Password reset link sent to your email")}
              className="text-xs font-bold text-gold-foreground tracking-wide"
            >
              FORGOT?
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="••••••••"
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-gold"
          />
          Keep me securely logged in
        </label>

        <Link
          to="/user/home"
          className="mt-5 w-full rounded-2xl bg-gold-soft hover:bg-gold/80 py-4 flex items-center justify-center gap-2 text-gold-foreground font-bold"
        >
          Login to Sentinel <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Authorized personnel only.{" "}
          <button
            type="button"
            onClick={() => toast("Access request submitted to your administrator")}
            className="font-bold text-foreground hover:underline"
          >
            Request Access
          </button>
        </p>
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
