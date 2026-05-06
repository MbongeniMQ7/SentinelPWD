import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/owner")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/owner/login" || location.pathname === "/owner/") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/owner/login" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", session.user.id)
      .single();

    const role = profile?.role;
    if (role === "EMPLOYEE") throw redirect({ to: "/user/home" });
    if (role === "MANAGER") throw redirect({ to: "/admin/dashboard" });
  },
  component: OwnerLayout,
});

function OwnerLayout() {
  return (
    <div data-role="owner">
      <Outlet />
    </div>
  );
}
