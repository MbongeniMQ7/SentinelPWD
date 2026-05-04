import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/owner")({
  beforeLoad: async ({ location }) => {
    // Allow unauthenticated access to the login page
    if (location.pathname === "/owner/login" || location.pathname === "/owner/") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/owner/login" });
    }

    const role = session.user.user_metadata?.role;
    if (role && role !== "owner") {
      throw redirect({ to: `/${role}/dashboard` as "/owner/dashboard" });
    }
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
