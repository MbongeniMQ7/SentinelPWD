import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase, type AppRole } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

const roleRedirects: Record<AppRole, string> = {
  user: "/user/home",
  admin: "/admin/dashboard",
  owner: "/owner/dashboard",
};

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase embeds tokens in the URL hash or query string after redirects.
    // Calling getSession() causes the client to exchange them for a real session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Authentication failed. Please try again.");
        navigate({ to: "/choose-role" });
        return;
      }

      const type = new URLSearchParams(window.location.search).get("type");

      if (type === "recovery") {
        // After password reset the user lands here; send them to update their password.
        // For now, redirect to their role's login with a toast.
        toast.success("You're logged in — please update your password in Settings.");
        const role = (session.user.user_metadata?.role as AppRole) ?? "user";
        navigate({ to: roleRedirects[role] });
        return;
      }

      const role = (session.user.user_metadata?.role as AppRole) ?? "user";
      navigate({ to: roleRedirects[role] });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm animate-pulse">Verifying your session…</p>
    </div>
  );
}
