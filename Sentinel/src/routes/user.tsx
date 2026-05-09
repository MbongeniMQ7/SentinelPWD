import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

const _roleCache = new Map<string, string>();

export const Route = createFileRoute("/user")();
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/user/login") {
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

    if (role === "MANAGER") throw redirect({ to: "/admin/dashboard" });
    if (role === "OWNER") throw redirect({ to: "/owner/dashboard" });
  },
  component: UserLayout,
});

function UserLayout() {
  return (
    <div data-role="user">
      <Outlet />
    </div>
  );
}
