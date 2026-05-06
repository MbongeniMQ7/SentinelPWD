import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/" || location.pathname === "/admin") {
      throw redirect({ to: "/choose-role" });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/choose-role" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", session.user.id)
      .single();

    const role = profile?.role;
    if (role === "EMPLOYEE") throw redirect({ to: "/user/home" });
    if (role === "OWNER") throw redirect({ to: "/owner/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div data-role="admin">
      <Outlet />
    </div>
  );
}
