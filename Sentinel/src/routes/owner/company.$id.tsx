import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { MapPin, Award, Users, Briefcase, Loader2, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CompanyData {
  company_id: string;
  company_name: string;
  industry: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: string;
  created_at: string;
}

interface AdminProfile {
  first_name: string;
  last_name: string;
  email: string;
}

interface SubscriptionInfo {
  plan_name: string;
  status: string;
}

const inputCls =
  "w-full h-12 px-4 rounded-xl bg-secondary text-sm text-primary placeholder:text-muted-foreground outline-none border border-transparent focus:border-gold/50 transition-colors";

const Company = () => {
  const { id } = Route.useParams();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [managerCount, setManagerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: "",
    contact_email: "",
    contact_phone: "",
    industry: "",
    address: "",
  });

  async function loadCompany() {
    const [
      { data: co },
      { data: adminProfile },
      { count: empCount },
      { count: mgrCount },
      { data: sub },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("company_id", id)
        .single(),
      supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("company_id", id)
        .eq("role", "OWNER")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("role", "EMPLOYEE"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("role", "MANAGER"),
      supabase
        .from("company_subscriptions")
        .select("status, subscription_plans(plan_name)")
        .eq("company_id", id)
        .eq("status", "ACTIVE")
        .maybeSingle(),
    ]);

    if (co) {
      setCompany(co as CompanyData);
      setEditForm({
        company_name: co.company_name ?? "",
        contact_email: co.contact_email ?? "",
        contact_phone: co.contact_phone ?? "",
        industry: co.industry ?? "",
        address: co.address ?? "",
      });
    }
    setAdmin(adminProfile as AdminProfile | null);
    setEmployeeCount(empCount ?? 0);
    setManagerCount(mgrCount ?? 0);

    if (sub) {
      const plan = (sub as any).subscription_plans;
      setSubscription({
        plan_name: plan?.plan_name ?? "Unknown Plan",
        status: sub.status,
      });
    }
    setLoading(false);
  }

  useEffect(() => { loadCompany(); }, [id]);

  async function handleSave() {
    if (!editForm.company_name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        company_name: editForm.company_name.trim(),
        contact_email: editForm.contact_email.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
        industry: editForm.industry.trim() || null,
        address: editForm.address.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", id);
    setSaving(false);

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("Company profile updated.");
    setEditing(false);
    loadCompany();
  }

  const statusColor =
    company?.status === "ACTIVE"
      ? "bg-success/20 text-success"
      : company?.status === "SUSPENDED"
      ? "bg-destructive/20 text-destructive"
      : "bg-secondary text-muted-foreground";

  const dateJoined = company?.created_at
    ? new Date(company.created_at).toLocaleDateString("en-ZA", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  const adminInitials = admin
    ? `${admin.first_name[0] ?? ""}${admin.last_name[0] ?? ""}`.toUpperCase()
    : "—";

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Company Profile" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <TopBar title="Company Profile" />
        <div className="px-5 pt-8 text-center text-muted-foreground">
          Company not found.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Company Profile" showBell />
      <div className="px-5 pt-3 pb-6 space-y-5">

        {/* Header */}
        <div>
          <div className="flex gap-2 flex-wrap">
            <span className={`pill ${statusColor}`}>{company.status}</span>
            <span className="pill bg-secondary text-primary/70 font-mono text-[10px]">
              {company.company_id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <h2 className="font-display text-[28px] leading-tight font-bold mt-3">
            {company.company_name}
          </h2>
          {company.address && (
            <p className="text-foreground/70 text-sm flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4 text-gold" />
              {company.address}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button className="flex-1 bg-gold/30 text-primary font-bold tracking-wider text-xs py-3 rounded-xl">
              GENERATE REPORT
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 border border-gold/40 text-foreground font-bold tracking-wider text-xs py-3 rounded-xl"
            >
              EDIT PROFILE
            </button>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card space-y-4">
          <div className="label-eyebrow">COMPANY INFORMATION</div>

          {admin ? (
            <div>
              <div className="label-eyebrow">LEAD ADMINISTRATOR</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-8 w-8 rounded-full bg-gold/20 text-gold-foreground flex items-center justify-center text-xs font-bold">
                  {adminInitials}
                </div>
                <span className="font-display font-bold text-primary">
                  {admin.first_name} {admin.last_name}
                </span>
              </div>
            </div>
          ) : null}

          <div>
            <div className="label-eyebrow">CONTACT EMAIL</div>
            <div className="font-semibold text-primary mt-1">
              {company.contact_email ?? <span className="text-muted-foreground italic">Not set</span>}
            </div>
          </div>

          {company.contact_phone && (
            <div>
              <div className="label-eyebrow">CONTACT PHONE</div>
              <div className="font-semibold text-primary mt-1">{company.contact_phone}</div>
            </div>
          )}

          {company.industry && (
            <div>
              <div className="label-eyebrow">INDUSTRY</div>
              <div className="font-semibold text-primary mt-1">{company.industry}</div>
            </div>
          )}

          <div>
            <div className="label-eyebrow">DATE JOINED</div>
            <div className="font-semibold text-primary mt-1">{dateJoined}</div>
          </div>

          {subscription && (
            <div className="border-t border-border pt-4 bg-card-muted -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
              <div className="label-eyebrow">CURRENT PLAN</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-display font-bold text-primary text-lg">
                  {subscription.plan_name}
                </span>
                <Award className="h-5 w-5 text-gold" />
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="label-eyebrow">EMPLOYEES</div>
              <div className="font-display font-bold text-primary text-2xl">{employeeCount}</div>
            </div>
          </div>
          <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="label-eyebrow">MANAGERS</div>
              <div className="font-display font-bold text-primary text-2xl">{managerCount}</div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Edit Modal ─── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-background rounded-t-3xl p-6 pb-10 space-y-5 shadow-2xl animate-slide-up">

            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-primary">Edit Company Profile</h3>
              <button
                onClick={() => setEditing(false)}
                className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="label-eyebrow mb-1.5">COMPANY NAME</div>
                <input
                  className={inputCls}
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <div className="label-eyebrow mb-1.5">INDUSTRY</div>
                <input
                  className={inputCls}
                  value={editForm.industry}
                  onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Logistics, Construction"
                />
              </div>
              <div>
                <div className="label-eyebrow mb-1.5">CONTACT EMAIL</div>
                <input
                  className={inputCls}
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <div className="label-eyebrow mb-1.5">CONTACT PHONE</div>
                <input
                  className={inputCls}
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                  placeholder="+27 xx xxx xxxx"
                />
              </div>
              <div>
                <div className="label-eyebrow mb-1.5">ADDRESS</div>
                <input
                  className={inputCls}
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-white font-bold tracking-wider text-sm py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/company/$id")({ component: Company });
