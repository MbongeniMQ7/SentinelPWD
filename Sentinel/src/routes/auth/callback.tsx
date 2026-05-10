import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase, type AppRole, roleRouteMap } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        toast.error("Authentication failed. Please try again.");
        navigate({ to: "/choose-role" });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, needs_password_reset")
        .eq("auth_user_id", session.user.id)
        .single();

      const role = (profile?.role as AppRole) ?? "EMPLOYEE";
      const type = new URLSearchParams(window.location.search).get("type");

      // New users created by admin/owner must set their own password first
      if (profile?.needs_password_reset) {
        navigate({ to: "/auth/set-password" });
        return;
      }

      if (type === "recovery") {
        toast.success("You're logged in — please update your password in Settings.");
      }

      navigate({ to: roleRouteMap[role] as "/user/home" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm animate-pulse">Verifying your session…</p>
    </div>
  );
}
