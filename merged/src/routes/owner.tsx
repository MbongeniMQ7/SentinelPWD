import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/owner")({ component: OwnerLayout });

function OwnerLayout() {
  return (
    <div data-role="owner">
      <Outlet />
    </div>
  );
}
