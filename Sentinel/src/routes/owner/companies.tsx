import { createFileRoute, Outlet } from "@tanstack/react-router";

const CompaniesLayout = () => <Outlet />;

export const Route = createFileRoute("/owner/companies")({ component: CompaniesLayout });

