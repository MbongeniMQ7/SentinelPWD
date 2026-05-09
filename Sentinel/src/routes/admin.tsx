import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

// Cache the role so navigating between admin pages doesn't re-query the DB on every transition
const _roleCache = new Map<string, string>();

export const Route = createFileRoute("/admin")();
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/" || location.pathname === "/admin") {
      throw redirect({ to: "/choose-role" });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      _roleCache.clear();
      throw redirect({ to: "/choose-role" });
    }

    let role = _roleCache.get(session.user.id);
    if (!role) {
      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", session.user.id)
        .single();
      role = p?.role ?? undefined;
      if (role) _roleCache.set(session.user.id, role);
    }

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
