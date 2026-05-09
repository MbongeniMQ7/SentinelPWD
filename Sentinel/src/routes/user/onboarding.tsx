import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/user/BrandLogo";
import { Watch, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/user/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  return (
    <div className="app-shell px-5 py-8 flex flex-col">
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="h-14 w-14 rounded-2xl bg-navy flex items-center justify-center">
          <BrandLogo size="sm" />
        </div>
      </div>
      <h2 className="sr-only">Connect your wristband</h2>

      <div className="panel relative overflow-hidden p-8 flex flex-col items-center text-center">
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gold-soft/60" />
        {/* Pulse */}
        <div className="relative my-4 flex items-center justify-center">
          <span className="absolute h-44 w-44 rounded-full bg-gold/15 animate-ping" />
          <span className="absolute h-32 w-32 rounded-full bg-gold/30" />
          <span className="relative h-20 w-20 rounded-full bg-gold-soft flex items-center justify-center">
            <Watch className="h-9 w-9 text-gold-foreground" />
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-display font-bold">
          Connecting to your<br />SentinelAI wristband...
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your device within 3 feet of your phone.
        </p>

        <div className="mt-6 w-full rounded-2xl bg-secondary p-4 flex items-center justify-between">
          <div className="text-left">
            <div className="label-eyebrow">Device ID</div>
            <div className="font-display font-bold text-lg tracking-wider">SNT-WRISTBAND</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold">
            <Check className="h-3.5 w-3.5 text-success" />
            Connected
          </span>
        </div>
      </div>

      <Link
        to="/user/login"
        className="mt-6 w-full rounded-2xl bg-gold-soft hover:bg-gold/80 py-4 flex items-center justify-center gap-2 text-gold-foreground font-bold"
      >
        Next <ArrowRight className="h-4 w-4" />
      </Link>

      <p className="mt-4 text-center text-xs text-muted-foreground px-6">
        By continuing, you agree to the SentinelAI Safety &amp; Data Transmission Protocols.
      </p>

      <div className="mt-5 flex justify-center gap-1.5">
        <span className="h-1 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1 w-6 rounded-full bg-navy" />
      </div>
    </div>
  );
}
