import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Moon, Globe, AlertTriangle, Activity, FileText,
  AtSign, RotateCcw, ShieldCheck, FileCheck, ExternalLink,
  ChevronRight, Camera, UserCircle2, Check, X, Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { resetPassword } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { uploadAvatar, updateProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/user/settings")({
  component: Settings,
});

const PREF_KEY = "sentinel_prefs";

interface Prefs {
  dark: boolean;
  fatigue: boolean;
  vitals: boolean;
  weekly: boolean;
  language: string;
}

const DEFAULT_PREFS: Prefs = {
  dark: false,
  fatigue: true,
  vitals: true,
  weekly: false,
  language: "English (UK)",
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  localStorage.setItem(PREF_KEY, JSON.stringify(p));
}

function applyDark(on: boolean) {
  document.documentElement.classList.toggle("dark", on);
}

const LANGUAGES = ["English (UK)", "English (US)", "isiZulu", "Afrikaans", "Sesotho"];

function Settings() {
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  // Email editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  // 2FA
  const [mfaEnrolled, setMfaEnrolled] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || user?.email?.split("@")[0] || "User"
    : user?.email?.split("@")[0] ?? "User";
  const jobTitle = (profile as any)?.employee_profiles?.job_title ?? "SentinelAI Member";
  const initials = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  // Load prefs from localStorage and apply dark mode
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    applyDark(p.dark);
  }, []);

  // Fetch real MFA status
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const enrolled = (data?.totp ?? []).some((f) => f.status === "verified");
      setMfaEnrolled(enrolled);
    });
  }, []);

  function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      if (key === "dark") applyDark(value as boolean);
      return next;
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAvatarError(false);
    try {
      const { url, error: uploadError } = await uploadAvatar(file);
      if (uploadError) { toast.error(uploadError); return; }
      if (url) {
        // avatar stored in bucket only — no url column in profiles
        refetch();
        toast.success("Profile photo updated.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleChangePassword() {
    if (!user?.email) return;
    const { error } = await resetPassword(user.email);
    if (error) toast.error(error);
    else toast.success("Password reset link sent to your email.");
  }

  async function handleEmailSave() {
    if (!newEmail.trim() || newEmail === user?.email) {
      setEditingEmail(false);
      return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Confirmation sent to both addresses. Check your new email to confirm.");
      setEditingEmail(false);
    }
  }

  return (
    <div className="app-shell px-5 py-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <Link to="/user/profile" className="h-9 w-9 rounded-full flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
      </header>

      {/* Profile avatar card */}
      <div className="panel p-5 mb-6 flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-secondary flex items-center justify-center">
            {loading ? (
              <div className="w-full h-full animate-pulse bg-muted" />
            ) : (
              <span className="text-xl font-bold text-navy">{initials || <UserCircle2 className="h-8 w-8 text-muted-foreground" />}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gold flex items-center justify-center ring-2 ring-background"
            aria-label="Change photo"
          >
            {uploading
              ? <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <Camera className="h-3.5 w-3.5 text-gold-foreground" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{displayName}</div>
          <div className="text-xs text-muted-foreground truncate">{jobTitle}</div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1.5 text-xs font-bold text-gold-foreground">
            Change photo
          </button>
        </div>
      </div>

      <Section label="App Preferences">
        <Row
          icon={<Moon className="h-4 w-4" />}
          title="Dark Mode"
          sub="Adjust visual interface"
          trailing={<Toggle on={prefs.dark} onChange={(v) => updatePref("dark", v)} />}
        />
        <Row
          icon={<Globe className="h-4 w-4" />}
          title="Language"
          sub={prefs.language}
          trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          onClick={() => setShowLangPicker(true)}
        />
      </Section>

      <Section label="Notifications">
        <Row
          icon={<AlertTriangle className="h-4 w-4 text-gold-foreground" />}
          iconBg="bg-gold-soft"
          title="Fatigue Alerts"
          sub="Real-time safety prompts"
          trailing={<Toggle on={prefs.fatigue} onChange={(v) => { updatePref("fatigue", v); toast(v ? "Fatigue alerts enabled" : "Fatigue alerts disabled"); }} />}
        />
        <Row
          icon={<Activity className="h-4 w-4" />}
          title="Vitals Warnings"
          sub="Heart rate & temperature alerts"
          trailing={<Toggle on={prefs.vitals} onChange={(v) => { updatePref("vitals", v); toast(v ? "Vitals warnings enabled" : "Vitals warnings disabled"); }} />}
        />
        <Row
          icon={<FileText className="h-4 w-4" />}
          title="Weekly Reports"
          sub="Email summary of performance"
          trailing={<Toggle on={prefs.weekly} onChange={(v) => { updatePref("weekly", v); toast(v ? "Weekly report emails enabled" : "Weekly report emails disabled"); }} />}
        />
      </Section>

      <Section label="Account">
        {editingEmail ? (
          <div className="px-4 py-3 flex items-center gap-2">
            <AtSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={user?.email ?? "New email"}
              className="flex-1 text-sm bg-transparent border-b border-border outline-none py-0.5"
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailSave(); if (e.key === "Escape") setEditingEmail(false); }}
            />
            <button onClick={handleEmailSave} disabled={emailSaving} className="h-7 w-7 rounded-full bg-navy flex items-center justify-center">
              {emailSaving ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Check className="h-3.5 w-3.5 text-white" />}
            </button>
            <button onClick={() => setEditingEmail(false)} className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Row
            icon={<AtSign className="h-4 w-4" />}
            title="Email Address"
            sub={user?.email ?? "—"}
            trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            onClick={() => { setNewEmail(user?.email ?? ""); setEditingEmail(true); }}
          />
        )}
        <Row
          icon={<RotateCcw className="h-4 w-4" />}
          title="Change Password"
          sub="Send a reset link to your email"
          trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          onClick={handleChangePassword}
        />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Two-Factor Authentication"
          sub={
            mfaEnrolled === null
              ? <span className="text-muted-foreground">Checking…</span>
              : mfaEnrolled
                ? <span className="text-success font-semibold">Enabled</span>
                : <span className="text-muted-foreground">Not enabled</span>
          }
          trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          onClick={() => toast(mfaEnrolled ? "Manage 2FA in your Supabase account settings." : "Enable 2FA via your account security settings.")}
        />
      </Section>

      <Section label="Security">
        <Row
          icon={<ExternalLink className="h-4 w-4" />}
          title="Privacy Policy"
          trailing={<ExternalLink className="h-4 w-4 text-muted-foreground" />}
          onClick={() => window.open("https://sentinelai-sofware.vercel.app/privacy", "_blank", "noopener,noreferrer")}
        />
        <Row
          icon={<FileCheck className="h-4 w-4" />}
          title="Terms of Service"
          trailing={<ExternalLink className="h-4 w-4 text-muted-foreground" />}
          onClick={() => window.open("https://sentinelai-sofware.vercel.app/terms", "_blank", "noopener,noreferrer")}
        />
      </Section>

      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="rounded-full bg-card border border-border px-3 py-1 text-[11px] font-bold tracking-widest flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> SENTINELAI V1.0.0
        </span>
        <span className="text-xs text-muted-foreground">Build: 2026.04.01.Secure</span>
      </div>

      <div className="mt-6 text-center">
        <Link to="/user/support" className="text-xs font-bold text-gold-foreground tracking-wider">CONTACT SUPPORT</Link>
      </div>

      {/* Language picker bottom sheet */}
      {showLangPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowLangPicker(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-card rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <h2 className="text-lg font-display font-bold mb-4">Select Language</h2>
            <div className="space-y-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => { updatePref("language", lang); setShowLangPicker(false); toast(`Language set to ${lang}`); }}
                  className={`w-full text-left flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold text-sm transition ${prefs.language === lang ? "bg-navy text-navy-foreground" : "hover:bg-secondary"}`}
                >
                  {lang}
                  {prefs.language === lang && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="label-eyebrow mb-2">{label}</div>
      <div className="panel divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({
  icon, iconBg = "bg-secondary", title, sub, trailing, onClick,
}: {
  icon: React.ReactNode; iconBg?: string; title: string;
  sub?: React.ReactNode; trailing?: React.ReactNode; onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center text-navy shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      {trailing}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition">
        {content}
      </button>
    );
  }
  return <div className="flex items-center gap-3 px-4 py-3.5">{content}</div>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-navy" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-5.5" : "left-0.5"}`} />
    </button>
  );
}
