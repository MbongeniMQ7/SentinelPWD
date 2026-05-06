import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { ChevronRight, Wifi, Fingerprint, ShieldCheck, CheckCircle2, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { MonitoringType } from "@/lib/database.types";

export const Route = createFileRoute("/admin/onboarding")({
  head: () => ({
    meta: [
      { title: "Register New Personnel — SentinelAI Admin" },
      { name: "description", content: "Initialize a new sentinel entry and select the appropriate monitoring protocol." },
    ],
  }),
  component: OnboardingPage,
});

const inputCls =
  "w-full h-12 px-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft outline-none";

function OnboardingPage() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [monitoringType, setMonitoringType] = useState<MonitoringType>("CAMERA");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    department: "",
    jobTitle: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!profile?.company_id) { toast.error("No company linked to your account."); return; }
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error("First and last name are required."); return; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { toast.error("Valid email required."); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { role: "EMPLOYEE" } },
      });
      if (signUpErr || !signUp.user) {
        toast.error(signUpErr?.message ?? "Failed to create auth account.");
        return;
      }

      const username =
        `${form.firstName.toLowerCase().replace(/\s+/g, "")}.${form.lastName.toLowerCase().replace(/\s+/g, "")}`;

      const { data: newProfile, error: profErr } = await supabase
        .from("profiles")
        .insert({
          auth_user_id: signUp.user.id,
          company_id: profile.company_id,
          username,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          role: "EMPLOYEE",
          status: "ACTIVE",
          created_by: profile.profile_id,
        })
        .select("profile_id")
        .single();

      if (profErr || !newProfile) {
        toast.error("Profile creation failed: " + profErr?.message);
        return;
      }

      const { error: epErr } = await supabase.from("employee_profiles").insert({
        profile_id: newProfile.profile_id,
        monitoring_type: monitoringType,
        department: form.department.trim() || null,
        job_title: form.jobTitle.trim() || null,
        is_monitoring_enabled: true,
      });
      if (epErr) { toast.error("Employee profile failed: " + epErr.message); return; }

      await supabase.from("audit_logs").insert({
        action_type: "EMPLOYEE_CREATED",
        description: `Employee @${username} (${monitoringType}) created by @${profile.username}`,
      });

      toast.success(`@${username} registered successfully.`);
      nav({ to: "/admin/workforce" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4">
        <p className="flex items-center gap-1 text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
          Workforce <ChevronRight className="h-3 w-3" /> Register Employee
        </p>
        <h1 className="mt-1 text-[34px] leading-[1.05] font-extrabold text-ink">Register New Personnel</h1>
        <p className="mt-3 text-[13px] text-ink-soft leading-snug">
          Create an employee account and assign the appropriate monitoring protocol.
        </p>
      </div>

      <div className="px-5 mt-5 space-y-5 pb-10">
        <div className="bg-surface rounded-2xl p-5 shadow-sm space-y-5">
          {/* Identity */}
          <Field label="FIRST NAME">
            <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="e.g. Marcus" className={inputCls} />
          </Field>
          <Field label="SURNAME">
            <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="e.g. Thorne" className={inputCls} />
          </Field>
          <Field label="EMAIL ADDRESS">
            <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="employee@company.com" type="email" className={inputCls} />
          </Field>
          <Field label="PASSWORD">
            <div className="relative">
              <input
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                type={showPwd ? "text" : "password"}
                placeholder="Min. 8 characters"
                className={inputCls + " pr-10"}
              />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-label="Toggle password">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="DEPARTMENT (optional)">
            <input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Operations" className={inputCls} />
          </Field>
          <Field label="JOB TITLE (optional)">
            <input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. Site Supervisor" className={inputCls} />
          </Field>

          {/* Monitoring Protocol */}
          <div>
            <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Monitoring Protocol</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["CAMERA", "IOT_WRISTBAND", "BOTH"] as MonitoringType[]).map((m) => {
                const active = monitoringType === m;
                const label = m === "CAMERA" ? "Biometric" : m === "IOT_WRISTBAND" ? "IoT" : "Both";
                const Icon = m === "CAMERA" ? Fingerprint : Wifi;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonitoringType(m)}
                    className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 transition ${
                      active ? "bg-surface border-ink shadow" : "bg-muted border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-ink" />
                    <span className="text-[11px] font-extrabold tracking-wider text-ink uppercase text-center">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground text-[13px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 py-4 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? "Registering…" : "Register Employee"}
          </button>
        </div>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="h-10 w-10 rounded-xl bg-warning/30 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-warning-foreground" /></div>
          <h2 className="mt-3 text-[20px] font-extrabold text-ink">Enterprise Security Protocol</h2>
          <p className="mt-2 text-[13px] text-ink-soft/80 leading-snug">
            Registering personnel initiates a global unique identifier for 256-bit encrypted ledger logging.
          </p>
          <ul className="mt-4 space-y-2.5 text-[12px] font-extrabold tracking-wider text-ink uppercase">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning-foreground" /> Real-Time Monitoring Ready</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning-foreground" /> Instant Biometric Auth Support</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning-foreground" /> Fleet Management Integration</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase block mb-2">{label}</label>
      {children}
    </div>
  );
}
