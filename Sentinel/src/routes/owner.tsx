import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

const _roleCache = new Map<string, string>();

export const Route = createFileRoute("/owner")(
  {
    beforeLoad: async ({ location }) => {
      if (location.pathname === "/owner/login" || location.pathname === "/owner/") {
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
      if (role === "MANAGER") throw redirect({ to: "/admin/dashboard" });
    },
    component: OwnerLayout,
  }
);

function OwnerLayout() {
  return (
    <div data-role="owner">
      <Outlet />
    </div>
  );
}
