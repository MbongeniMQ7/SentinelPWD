import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { User, ShieldCheck, Shield, Mail, Lock, ArrowRight, Globe } from "lucide-react";

const roles = [
  { id: "user", label: "User", Icon: User },
  { id: "admin", label: "Admin", Icon: ShieldCheck },
  { id: "owner", label: "Owner", Icon: Shield },
];

const Login = () => {
  const nav = useNavigate();
  const [role, setRole] = useState("owner");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col">
      <main className="flex-1 flex items-start justify-center px-4 pt-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-7">
          <h1 className="font-display text-3xl font-bold text-primary">Welcome Back</h1>
          <p className="text-muted-foreground mt-2 text-[15px]">Access your safety dashboard and insights.</p>

          <p className="mt-7 text-sm font-medium text-primary">Select Access Role</p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {roles.map(({ id, label, Icon }) => {
              const active = role === id;
              return (
                <button
                  key={id}
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

          <div className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-primary">Email Address</label>
              <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-primary">Security Password</label>
                <button
                  type="button"
                  onClick={() => toast("Password reset link sent to your email")}
                  className="text-gold text-xs font-bold tracking-wider"
                >
                  FORGOT?
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  defaultValue="password"
                  className="bg-transparent flex-1 outline-none text-primary tracking-widest"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground accent-gold" />
              Keep me securely logged in
            </label>

            <button
              onClick={() => nav({ to: "/owner/dashboard" })}
              className="w-full mt-2 bg-gold/30 hover:bg-gold/50 transition-colors rounded-2xl py-4 flex items-center justify-center gap-2 font-display text-primary font-bold text-[17px]"
            >
              Login to Sentinel <ArrowRight className="h-5 w-5" />
            </button>
          </div>
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
