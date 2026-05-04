import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, User, Building2, ArrowRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/choose-role")({
  component: RoleChooser,
});

const roles = [
  {
    to: "/user" as const,
    title: "User",
    desc: "Personal monitoring, alerts and reports for individual users.",
    icon: User,
    accent: "from-sky-500/10 to-sky-500/0",
  },
  {
    to: "/admin" as const,
    title: "Admin",
    desc: "Workforce safety dashboard, devices and onboarding.",
    icon: ShieldCheck,
    accent: "from-amber-500/10 to-amber-500/0",
  },
  {
    to: "/owner" as const,
    title: "Owner",
    desc: "Multi-company oversight, revenue and subscriptions.",
    icon: Building2,
    accent: "from-indigo-500/10 to-indigo-500/0",
  },
];

function RoleChooser() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold text-center">
          Choose your <span className="text-gold">experience</span>
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Select the role that matches how you'll use SentinelAI today.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {roles.map(({ to, title, desc, icon: Icon, accent }) => (
            <Link
              key={to}
              to={to}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`absolute inset-0 -z-0 bg-gradient-to-br ${accent} opacity-70 transition group-hover:opacity-100`}
              />
              <div className="relative z-10 flex flex-col h-full">
                <div className="h-12 w-12 rounded-2xl bg-foreground/5 flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-2xl font-display font-bold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{desc}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
                  Enter <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
