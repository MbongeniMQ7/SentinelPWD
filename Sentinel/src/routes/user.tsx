import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/user")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/user/login") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/user/login" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", session.user.id)
      .single();

    const role = profile?.role;
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
