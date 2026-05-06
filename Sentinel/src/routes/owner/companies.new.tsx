import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Watch, HeartPulse, Eye, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });

  const submit = async () => {
    const result = schema.safeParse({ ...form, mode });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      // 1. Insert company
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .insert({
          company_name: form.org,
          status: "ACTIVE",
        })
        .select("company_id")
        .single();
      if (compErr || !company) {
        toast.error(compErr?.message ?? "Failed to create company.");
        return;
      }

      // 2. Create auth user
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { role: "MANAGER", full_name: form.name } },
      });
      if (signUpErr || !signUpData.user) {
        toast.error(signUpErr?.message ?? "Failed to create admin auth account.");
        return;
      }

      // 3. Build username from org name
      const nameParts = form.name.trim().split(" ");
      const firstName = nameParts[0] ?? form.name;
      const lastName = nameParts.slice(1).join(" ") || "";
      const baseUsername = form.org.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const username = `${baseUsername}-admin`;

      // 4. Insert profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        auth_user_id: signUpData.user.id,
        company_id: company.company_id,
        username,
        first_name: firstName,
        last_name: lastName,
        email: form.email,
        role: "MANAGER",
        status: "ACTIVE",
      });
      if (profileErr) {
        toast.error("Company created, but profile failed: " + profileErr.message);
        return;
      }

      // 5. Insert manager_profiles
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("profile_id")
        .eq("auth_user_id", signUpData.user.id)
        .single();
      if (profileRow) {
        await supabase.from("manager_profiles").insert({
          profile_id: profileRow.profile_id,
          manager_level: "MANAGER",
          access_scope: "COMPANY_WIDE",
          can_create_employees: true,
          can_create_managers: false,
        });
      }

      // 6. Audit log
      await supabase.from("audit_logs").insert({
        action_type: "COMPANY_CREATED",
        description: `Company "${form.org}" created with admin @${username}`,
      });

      toast.success(`"${form.org}" created — admin account provisioned.`);
      nav({ to: "/owner/companies" });
    } finally {
      setLoading(false);
    }
  };

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
            <div className="mt-4">
              <input
                value={form.org}
                onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))}
                placeholder="e.g. Cyberdyne Systems"
                maxLength={100}
                className="w-full bg-transparent border-b border-border py-3 text-primary outline-none placeholder:text-muted-foreground/70 focus:border-gold transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 label-eyebrow"><span className="h-0.5 w-4 bg-gold" />ADMIN IDENTIFICATION</div>
            <div className="mt-4 space-y-4">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Johnathan Doe"
                maxLength={80}
                className="w-full bg-transparent border-b border-border py-3 text-primary outline-none placeholder:text-muted-foreground/70 focus:border-gold transition-colors"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="j.doe@company.com"
                type="email"
                maxLength={255}
                className="w-full bg-transparent border-b border-border py-3 text-primary outline-none placeholder:text-muted-foreground/70 focus:border-gold transition-colors"
              />
              <div className="relative">
                <input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••••••"
                  type={showPwd ? "text" : "password"}
                  maxLength={128}
                  className="w-full bg-transparent border-b border-border py-3 text-primary outline-none placeholder:text-muted-foreground/70 focus:border-gold transition-colors"
                />
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
            <button
              onClick={submit}
              disabled={loading}
              className="w-full mt-4 bg-card-muted text-primary font-bold tracking-wider py-4 rounded-xl shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Creating…" : "CREATE ACCOUNT"}
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
