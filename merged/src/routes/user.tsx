import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/user")({
  beforeLoad: async ({ location }) => {
    // Allow unauthenticated access to the login page
    if (location.pathname === "/user/login") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/user/login" });
    }

    const role = session.user.user_metadata?.role;
    if (role && role !== "user") {
      throw redirect({ to: `/${role}/dashboard` as "/user/home" });
    }
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
