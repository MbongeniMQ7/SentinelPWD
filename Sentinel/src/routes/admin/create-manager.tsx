import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import type { ManagerLevel, AccessScope } from "@/lib/database.types";

const TEMP_PASSWORD = "Sentinel@Temp1!";

export const Route = createFileRoute("/admin/create-manager")({
  component: CreateManagerPage,
});

const inputCls =
  "w-full h-11 px-3 rounded-xl bg-muted text-[13px] text-ink placeholder:text-ink-soft outline-none focus:ring-2 focus:ring-primary/30";

function CreateManagerPage() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    level: "MANAGER" as ManagerLevel,
    scope: "COMPANY_WIDE" as AccessScope,
    canCreateManagers: false,
    canCreateEmployees: true,
  });

  useEffect(() => {
    if (!profile) return;
    // OWNER can always create managers; MANAGER checks the flag
    if (profile.role === "OWNER") { setCanCreate(true); return; }
    supabase
      .from("manager_profiles")
      .select("can_create_managers")
      .eq("profile_id", profile.profile_id)
      .single()
      .then(({ data }) => setCanCreate(data?.can_create_managers ?? false));
  }, [profile]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!profile?.company_id) { toast.error("No company linked to your account."); return; }
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error("First and last name are required."); return; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { toast.error("Valid email is required."); return; }

    setLoading(true);
    try {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: TEMP_PASSWORD,
        options: { data: { role: "MANAGER" } },
      });
      if (signUpErr || !signUp.user) {
        toast.error(signUpErr?.message ?? "Failed to create auth account.");
        return;
      }

      const username =
        `${form.firstName.toLowerCase().replace(/\s+/g, "")}.${form.lastName.toLowerCase().replace(/\s+/g, "")}-mgr`;

      const { data: newProfile, error: profErr } = await supabase
        .from("profiles")
        .insert({
          auth_user_id: signUp.user.id,
          company_id: profile.company_id,
          username,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          role: "MANAGER",
          status: "ACTIVE",
          created_by: profile.profile_id,
          needs_password_reset: true,
        })
        .select("profile_id")
        .single();

      if (profErr || !newProfile) {
        toast.error("Profile creation failed: " + profErr?.message);
        return;
      }

      const { error: mgErr } = await supabase.from("manager_profiles").insert({
        profile_id: newProfile.profile_id,
        manager_level: form.level,
        access_scope: form.scope,
        reports_to_manager_id: profile.profile_id,
        can_create_managers: form.canCreateManagers,
        can_create_employees: form.canCreateEmployees,
      });
      if (mgErr) { toast.error("Manager profile failed: " + mgErr.message); return; }

      await supabase.from("audit_logs").insert({
        action_type: "MANAGER_CREATED",
        description: `Manager @${username} (${form.level}) created by @${profile.username}`,
      });

      // Fetch company name for email
      const { data: company } = await supabase
        .from("companies")
        .select("company_name")
        .eq("company_id", profile.company_id)
        .single();

      // Send welcome email via edge function (non-blocking)
      supabase.functions
        .invoke("send-welcome-email", {
          body: {
            email: form.email.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            role: "MANAGER",
            companyName: company?.company_name ?? "your company",
          },
        })
        .catch((err) => console.error("Welcome email failed:", err));

      toast.success(`Manager @${username} created. A welcome email has been sent.`);
      nav({ to: "/admin/hierarchy" });
    } finally {
      setLoading(false);
    }
  };

  if (canCreate === false) {
    return (
      <AppShell>
        <TopBar />
        <div className="px-5 pt-20 flex flex-col items-center text-center">
          <ShieldCheck className="h-12 w-12 text-ink-soft mb-4" />
          <h2 className="text-[22px] font-extrabold text-ink">Access Restricted</h2>
          <p className="mt-2 text-[13px] text-ink-soft max-w-xs">
            You do not have permission to create manager accounts. Contact your senior manager.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4 pb-10">
        <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
          Management › Create Manager
        </p>
        <h1 className="mt-1 text-[34px] leading-[1.05] font-extrabold text-ink">New Manager</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Provision a new manager account under your company.
        </p>

        <div className="mt-5 bg-surface rounded-2xl p-5 shadow-sm space-y-6">

          {/* Identity */}
          <Section label="IDENTITY">
            <Row label="First Name">
              <input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="e.g. Sarah"
                className={inputCls}
              />
            </Row>
            <Row label="Last Name">
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="e.g. Kim"
                className={inputCls}
              />
            </Row>
            <Row label="Email Address">
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="manager@company.com"
                type="email"
                className={inputCls}
              />
            </Row>
            <div className="rounded-xl bg-gold-soft border border-gold/30 px-4 py-3">
              <p className="text-[11px] font-bold text-gold-foreground uppercase tracking-wider mb-0.5">Temporary password</p>
              <p className="text-[12px] text-ink-soft">
                A secure temporary password will be emailed to the manager. They'll set their own on first login.
              </p>
            </div>
          </Section>

          {/* Manager Level */}
          <Section label="MANAGER LEVEL">
            <div className="grid grid-cols-3 gap-2">
              {(["SENIOR_MANAGER", "MANAGER", "JUNIOR_MANAGER"] as ManagerLevel[]).map((lvl) => {
                const active = form.level === lvl;
                const label = lvl === "SENIOR_MANAGER" ? "Senior" : lvl === "MANAGER" ? "Manager" : "Junior";
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => set("level", lvl)}
                    className={`py-3 rounded-xl border-2 text-[11px] font-extrabold tracking-wider uppercase text-center transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-ink-soft"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Access Scope */}
          <Section label="ACCESS SCOPE">
            <div className="grid grid-cols-2 gap-3">
              {(["COMPANY_WIDE", "ASSIGNED_ONLY"] as AccessScope[]).map((sc) => {
                const active = form.scope === sc;
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => set("scope", sc)}
                    className={`py-3 px-2 rounded-xl border-2 text-[11px] font-extrabold tracking-wider uppercase text-center transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-ink-soft"
                    }`}
                  >
                    {sc === "COMPANY_WIDE" ? "Company-Wide" : "Assigned Only"}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-soft mt-2">
              {form.scope === "COMPANY_WIDE"
                ? "Can view all employees, alerts, and reports in the company."
                : "Can only view employees explicitly assigned to them."}
            </p>
          </Section>

          {/* Permissions */}
          <Section label="PERMISSIONS">
            <Toggle
              label="Can Create Employees"
              value={form.canCreateEmployees}
              onChange={(v) => set("canCreateEmployees", v)}
            />
            <Toggle
              label="Can Create Managers"
              value={form.canCreateManagers}
              onChange={(v) => set("canCreateManagers", v)}
            />
          </Section>

          <button
            onClick={submit}
            disabled={loading || canCreate === null}
            className="w-full bg-primary text-primary-foreground font-extrabold tracking-wider text-[13px] uppercase rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 py-4"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating…" : "Create Manager Account"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold tracking-[0.18em] text-ink-soft uppercase mb-3">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-soft mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`h-6 w-11 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-muted border border-border"}`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
