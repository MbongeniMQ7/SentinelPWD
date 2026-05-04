import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    // Allow unauthenticated access to the login page
    if (location.pathname === "/admin/" || location.pathname === "/admin") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/admin/" });
    }

    const role = session.user.user_metadata?.role;
    if (role && role !== "admin") {
      throw redirect({ to: `/${role}/dashboard` as "/admin/dashboard" });
    }
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
