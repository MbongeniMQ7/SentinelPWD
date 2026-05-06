import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Search, Users, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { UserRole, UserStatus } from "@/lib/database.types";

interface UserRow {
  profile_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  companies: { company_name: string } | null;
}

const roleIcon = (role: UserRole) => {
  if (role === "OWNER") return ShieldCheck;
  if (role === "MANAGER") return ShieldCheck;
  return User;
};

const roleStyle = (role: UserRole) => {
  if (role === "OWNER") return "bg-gold text-gold-foreground";
  if (role === "MANAGER") return "bg-primary text-white";
  return "bg-secondary text-primary";
};

const statusStyle = (s: UserStatus) =>
  s === "ACTIVE"
    ? "bg-success/20 text-success"
    : s === "SUSPENDED"
    ? "bg-destructive-soft text-destructive"
    : "bg-secondary text-muted-foreground";

const UserOverview = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_id, username, first_name, last_name, email, role, status, created_at, companies(company_name)")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load users");
        return;
      }
      setUsers((data as unknown as UserRow[]) ?? []);
    }
    load().finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.companies?.company_name ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total: users.length,
    owners: users.filter((u) => u.role === "OWNER").length,
    managers: users.filter((u) => u.role === "MANAGER").length,
    employees: users.filter((u) => u.role === "EMPLOYEE").length,
  };

  return (
    <AppShell>
      <TopBar title="Users Overview" />
      <div className="px-5 pt-3 pb-24 space-y-4">
        <h2 className="font-display text-[28px] font-bold leading-tight">All Users</h2>
        <p className="text-foreground/70 text-sm">Every account across all companies on the SentinelAI platform.</p>

        {/* Summary pills */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "TOTAL", value: counts.total, style: "bg-card shadow-card" },
            { label: "OWNERS", value: counts.owners, style: "bg-gold text-gold-foreground" },
            { label: "MANAGERS", value: counts.managers, style: "bg-primary text-white" },
            { label: "EMPLOYEES", value: counts.employees, style: "bg-secondary text-primary" },
          ].map(({ label, value, style }) => (
            <div key={label} className={`rounded-2xl p-4 ${style}`}>
              <div className="label-eyebrow opacity-70">{label}</div>
              <div className="font-display font-bold text-[28px] mt-1">{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Search by name, username, email, company…"
            className="bg-transparent flex-1 outline-none text-sm text-primary placeholder:text-muted-foreground/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role filter */}
        <div className="bg-secondary rounded-xl p-1 flex text-xs font-bold tracking-wider">
          {(["ALL", "OWNER", "MANAGER", "EMPLOYEE"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`flex-1 py-2 rounded-lg transition ${
                roleFilter === r ? "bg-white text-primary shadow" : "text-primary/60"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No users found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const Icon = roleIcon(u.role);
              return (
                <div key={u.profile_id} className="bg-card text-card-foreground rounded-2xl p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-primary">
                          {u.first_name} {u.last_name}
                        </span>
                        <span className={`pill text-[10px] ${roleStyle(u.role)}`}>{u.role}</span>
                        <span className={`pill text-[10px] ${statusStyle(u.status)}`}>{u.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">@{u.username}</div>
                      {u.companies?.company_name && (
                        <div className="text-xs text-muted-foreground">📋 {u.companies.company_name}</div>
                      )}
                      {u.email && (
                        <div className="text-xs text-muted-foreground truncate">✉ {u.email}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/users")({ component: UserOverview });
