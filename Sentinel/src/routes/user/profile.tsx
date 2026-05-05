import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { Cpu, Radio, Bell, Shield, RotateCcw, FileWarning, ChevronRight, LogOut, BadgeCheck, UserCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { signOut, resetPassword } from "@/lib/auth";

export const Route = createFileRoute("/user/profile")({
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const [push, setPush] = useState(true);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? "—";
  const jobTitle = profile?.job_title ?? profile?.department ?? "Sentinel User";
  const [avatarError, setAvatarError] = useState(false);
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await signOut();
    navigate({ to: "/" });
  }

  async function handleChangePassword() {
    if (!user?.email) return;
    const { error } = await resetPassword(user.email);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Password reset link sent to your email.");
    }
  }

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        {/* Profile hero */}
        <div className="panel bg-navy text-navy-foreground p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/10" />
          <div className="flex items-start gap-4 relative">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl overflow-hidden bg-navy/20 flex items-center justify-center">
                {loading ? (
                  <div className="w-full h-full bg-navy-foreground/10 animate-pulse" />
                ) : profile?.avatar_url && !avatarError ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="text-2xl font-display font-bold text-navy-foreground">
                    {initials || <UserCircle2 className="h-10 w-10 text-navy-foreground/50" />}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gold-soft flex items-center justify-center ring-2 ring-navy">
                <BadgeCheck className="h-4 w-4 text-gold-foreground" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-36 rounded bg-navy-foreground/10 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-navy-foreground/10 animate-pulse" />
                </div>
              ) : (
                <>
                  <h1 className="font-display text-3xl font-bold leading-tight">
                    {displayName.split(" ").slice(0, 2).join("\n")}
                  </h1>
                  <p className="text-sm opacity-70 mt-1">{jobTitle}</p>
                </>
              )}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> STATUS: ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div>
          <div className="label-eyebrow mb-2">Account Details</div>
          <div className="panel divide-y divide-border">
            <div className="px-4 py-3 flex items-center gap-3">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm font-semibold">{user?.email ?? "—"}</div>
              </div>
            </div>
            {profile?.company && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Company</div>
                  <div className="text-sm font-semibold">{profile.company}</div>
                </div>
              </div>
            )}
            {profile?.phone && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="text-sm font-semibold">{profile.phone}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="label-eyebrow mb-2">Hardware Ecosystem</div>
          <div className="space-y-3">
            <div className="panel p-4">
              <div className="label-eyebrow">Device ID</div>
              <div className="font-display text-2xl font-bold mt-1">HIVE-7721</div>
              <Cpu className="h-4 w-4 text-muted-foreground mt-2" />
            </div>
            <div className="panel p-4">
              <div className="label-eyebrow">Connectivity</div>
              <div className="font-display text-2xl font-bold mt-1 flex items-center gap-2">
                Connected <span className="h-2 w-2 rounded-full bg-success" />
              </div>
              <Radio className="h-4 w-4 text-muted-foreground mt-2" />
            </div>
            <div className="panel p-4">
              <div className="label-eyebrow">Battery</div>
              <div className="font-display text-2xl font-bold mt-1">85%</div>
              <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gold" style={{ width: "85%" }} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="label-eyebrow mb-2">Configuration</div>
          <div className="space-y-3">
            <ConfigRow
              icon={<Bell className="h-4 w-4" />}
              title="Push Notifications"
              sub="Real-time safety alerts & fatigue warnings"
              trailing={
                <button onClick={() => setPush(!push)} className={`relative h-6 w-11 rounded-full ${push ? "bg-gold" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${push ? "left-[22px]" : "left-0.5"}`} />
                </button>
              }
            />
            <Link to="/user/settings"><ConfigRow icon={<Shield className="h-4 w-4" />} title="Privacy Settings" sub="Manage data sharing & telemetry" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} /></Link>
            <button type="button" onClick={handleChangePassword} className="text-left w-full">
              <ConfigRow icon={<RotateCcw className="h-4 w-4" />} title="Change Password" sub="Send reset link to your email" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} />
            </button>
            <Link to="/user/support"><ConfigRow icon={<FileWarning className="h-4 w-4" />} title="Log an Issue" sub="Report an issue" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} /></Link>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl bg-danger-soft py-4 flex items-center justify-center gap-2 text-danger font-bold"
        >
          <LogOut className="h-4 w-4" /> Logout from Device
        </button>

        <div className="text-center label-eyebrow opacity-70 pt-2">
          SentinelAI v4.2.0 • Security Protocol<br />Enabled
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function ConfigRow({ icon, title, sub, trailing }: { icon: React.ReactNode; title: string; sub: string; trailing: React.ReactNode }) {
  return (
    <div className="panel p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-navy">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {trailing}
    </div>
  );
}
