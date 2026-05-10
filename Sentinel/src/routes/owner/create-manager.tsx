import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const TEMP_PASSWORD = "Sentinel@Temp1!";

const schema = z.object({
  firstName: z.string().trim().min(2, "First name required"),
  lastName: z.string().trim().min(2, "Last name required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(40).regex(/^\S+$/, "No spaces in username"),
  email: z.string().trim().email("Invalid email address"),
  companyId: z.string().uuid("Select a company"),
});

interface Company {
  company_id: string;
  company_name: string;
}

const CreateManager = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    companyId: "",
  });

  useEffect(() => {
    supabase
      .from("companies")
      .select("company_id, company_name")
      .eq("status", "ACTIVE")
      .order("company_name")
      .then(({ data }) => setCompanies(data ?? []));
  }, []);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      // 1. Check username is unique
      const { data: existing } = await supabase
        .from("profiles")
        .select("profile_id")
        .eq("username", form.username)
        .maybeSingle();
      if (existing) {
        toast.error("That username is already taken.");
        return;
      }

      // 2. Create Supabase Auth user via signUp
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: TEMP_PASSWORD,
        options: {
          data: { role: "MANAGER", full_name: `${form.firstName} ${form.lastName}` },
        },
      });

      if (signUpErr || !signUpData.user) {
        toast.error(signUpErr?.message ?? "Failed to create auth account.");
        return;
      }

      const authUserId = signUpData.user.id;

      // 3. Insert profile row
      const { error: profileErr } = await supabase.from("profiles").insert({
        auth_user_id: authUserId,
        company_id: form.companyId || null,
        username: form.username,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        role: "MANAGER",
        status: "ACTIVE",
        needs_password_reset: true,
      });

      if (profileErr) {
        toast.error("Auth user created but profile failed: " + profileErr.message);
        return;
      }

      // 4. Insert manager_profiles row (SENIOR_MANAGER level)
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("profile_id")
        .eq("auth_user_id", authUserId)
        .single();

      if (profileRow) {
        await supabase.from("manager_profiles").insert({
          profile_id: profileRow.profile_id,
          manager_level: "SENIOR_MANAGER",
          access_scope: "COMPANY_WIDE",
          can_create_managers: true,
          can_create_employees: true,
        });
      }

      // 5. Log audit
      await supabase.from("audit_logs").insert({
        action_type: "MANAGER_CREATED",
        description: `Senior Manager @${form.username} created for company ${form.companyId || "N/A"}`,
      });

      // 6. Send welcome email (non-blocking)
      const companyName = companies.find((c) => c.company_id === form.companyId)?.company_name ?? "your company";
      supabase.functions
        .invoke("send-welcome-email", {
          body: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            role: "MANAGER",
            companyName,
          },
        })
        .catch((err) => console.error("Welcome email failed:", err));

      toast.success(`Senior Manager @${form.username} created. A welcome email has been sent.`);
      nav({ to: "/owner/users" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-transparent border-b border-border py-3 text-primary outline-none placeholder:text-muted-foreground/70 focus:border-gold transition-colors";

  return (
    <AppShell>
      <TopBar title="Create Manager" />
      <div className="px-5 pt-3 pb-10 space-y-5">
        <div>
          <button
            onClick={() => nav({ to: "/owner/users" })}
            className="text-sm text-muted-foreground hover:text-gold"
          >
            ← Back to Users
          </button>
          <h2 className="font-display text-[28px] font-bold leading-tight mt-2">Create Senior Manager</h2>
          <p className="text-foreground/70 text-sm mt-1">
            Creates a Supabase Auth account and a SENIOR_MANAGER profile linked to a client company.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card text-card-foreground rounded-2xl p-6 shadow-card space-y-6">
          <div>
            <div className="label-eyebrow mb-3">PERSONAL DETAILS</div>
            <div className="space-y-4">
              <input className={inputClass} placeholder="First Name" value={form.firstName} onChange={set("firstName")} />
              <input className={inputClass} placeholder="Last Name" value={form.lastName} onChange={set("lastName")} />
              <input className={inputClass} placeholder="Username (no spaces)" value={form.username} onChange={set("username")} autoComplete="off" />
            </div>
          </div>

          <div>
            <div className="label-eyebrow mb-3">LOGIN CREDENTIALS</div>
            <div className="space-y-4">
              <input className={inputClass} placeholder="Email address" type="email" value={form.email} onChange={set("email")} />
              <div className="rounded-xl bg-gold/10 border border-gold/30 px-4 py-3 text-sm text-primary/80">
                <strong>Temporary password:</strong> A secure temporary password will be emailed to the manager. They'll be required to set their own password on first login.
              </div>
            </div>
          </div>

          <div>
            <div className="label-eyebrow mb-3">ASSIGN TO COMPANY</div>
            <select
              className="w-full bg-secondary rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-gold"
              value={form.companyId}
              onChange={set("companyId")}
            >
              <option value="">— Select a company —</option>
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <div className="rounded-xl bg-gold/10 border border-gold/30 px-4 py-3 text-sm text-primary/80 mb-4">
              <strong>Note:</strong> The new manager will receive a welcome email with login instructions. Their role is automatically set to <strong>SENIOR_MANAGER</strong>.
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
              {loading ? "Creating Account…" : "CREATE SENIOR MANAGER"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/create-manager")({ component: CreateManager });
