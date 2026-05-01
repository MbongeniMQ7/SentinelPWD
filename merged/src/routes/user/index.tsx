import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/user/")({
  component: () => <Navigate to="/user/login" />,
});
