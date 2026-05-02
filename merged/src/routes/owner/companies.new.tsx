import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Watch, HeartPulse, Eye, ShieldCheck, Zap } from "lucide-react";

import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  org: z.string().trim().min(2, "Organization name is required").max(100),
  name: z.string().trim().min(2, "Admin name is required").max(80),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  mode: z.enum(["iot", "biometric"]),
});

const AddCompany = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"iot" | "biometric">("iot");
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });

  const submit = () => {
    const result = schema.safeParse({ ...form, mode });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    toast.success("Admin account created — invitation sent.");
    nav({ to: "/owner/companies" });
  };

  const Field = ({ k, placeholder, type = "text" }: { k: keyof typeof form; placeholder: string; type?: string }) => (
    <input
      value={form[k]}
      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      placeholder={placeholder}
      type={type}
      maxLength={k === "password" ? 128 : 255}
      className="w-full bg-transparent border-b border-border py-3 text-primary outline-none placeholder:text-muted-foreground/70 focus:border-gold transition-colors"
    />
  );

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-3 pb-6 space-y-5">
        <div>
          <p className="text-sm text-foreground/70">
            <button onClick={() => nav({ to: "/owner/companies" })} className="hover:text-gold">Companies</button> ›{" "}
            <span className="font-bold text-foreground">Add New Admin</span>
          </p>
          <h2 className="font-display text-[34px] leading-tight font-bold mt-2">Create Admin Account</h2>
          <p className="text-foreground/70 mt-2 text-[15px]">
            Provision a new company administrative profile and select monitoring protocols.
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-card space-y-6">
          <div>
            <div className="flex items-center gap-2 label-eyebrow"><span className="h-0.5 w-4 bg-gold" />ORGANIZATION DETAILS</div>
            <div className="mt-4"><Field k="org" placeholder="e.g. Cyberdyne Systems" /></div>
          </div>

          <div>
            <div className="flex items-center gap-2 label-eyebrow"><span className="h-0.5 w-4 bg-gold" />ADMIN IDENTIFICATION</div>
            <div className="mt-4 space-y-4">
              <Field k="name" placeholder="Johnathan Doe" />
              <Field k="email" placeholder="j.doe@company.com" type="email" />
              <div className="relative">
                <Field k="password" placeholder="••••••••••••" type={showPwd ? "text" : "password"} />
                <button onClick={() => setShowPwd((s) => !s)} className="absolute right-0 top-3 text-muted-foreground" aria-label="Toggle password visibility">
                  <Eye className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 label-eyebrow"><span className="h-0.5 w-4 bg-gold" />ASSIGN MONITORING MODE</div>
            <div className="mt-4 space-y-3">
              {[
                { id: "iot" as const, Icon: Watch, title: "IoT Wristband", desc: "Real-time GPS, environment telemetry, and physical activity tracking." },
                { id: "biometric" as const, Icon: HeartPulse, title: "Biometric", desc: "Heart rate variability, oxygen saturation, and stress-level analytics." },
              ].map(({ id, Icon, title, desc }) => {
                const active = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
                      active ? "border-gold bg-gold/5" : "border-transparent bg-card-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-display font-bold text-primary">
                        <Icon className="h-5 w-5 text-gold" />{title}
                      </div>
                      <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${active ? "border-gold" : "border-muted-foreground/40"}`}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm text-muted-foreground text-center">By creating this account, the admin will receive a secure invitation link via email.</p>
            <button onClick={submit} className="w-full mt-4 bg-card-muted text-primary font-bold tracking-wider py-4 rounded-xl shadow-soft">
              CREATE ACCOUNT
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-slate-400/30 relative overflow-hidden">
          <ShieldCheck className="absolute -right-4 -bottom-4 h-28 w-28 text-white/10" strokeWidth={1.5} />
          <h3 className="font-display font-bold text-foreground text-xl">Enterprise Security Grade</h3>
          <p className="text-foreground/70 text-sm mt-2">All accounts are protected by multi-factor authentication and AES-256 encryption at rest.</p>
        </div>

        <div className="rounded-2xl p-6 bg-slate-400/30 text-center">
          <ShieldCheck className="h-7 w-7 text-gold mx-auto" />
          <h3 className="font-display font-bold text-foreground text-xl mt-2">Instantly Provisioned</h3>
          <p className="text-foreground/70 text-sm mt-2">Accounts are live within seconds across all data nodes.</p>
        </div>
      </div>
    </AppShell>
  );
};


export const Route = createFileRoute("/owner/companies/new")({ component: AddCompany });
