import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { AlertTriangle, Activity, LinkIcon, AlertCircle, OctagonAlert, Battery, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  component: Alerts,
});

function Alerts() {
  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        <div>
          <h1 className="text-3xl font-display font-bold">Safety Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring 24 active personnel in Sector 7
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="label-eyebrow">Critical Events</span>
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[10px] font-bold text-danger tracking-widest">
            LIVE
          </span>
        </div>

        {/* Critical card 1 */}
        <div className="panel p-4 border-l-4 border-l-danger">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-danger-soft flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between gap-2">
                <h3 className="font-display font-bold text-lg leading-tight">High Fatigue<br />Detected</h3>
                <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground h-fit">2m ago</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Your fatigue score exceeded 85%. Immediate intervention recommended.
              </p>
              <div className="mt-3 flex gap-2">
                <Link to="/leave" className="rounded-xl bg-navy text-navy-foreground text-xs font-bold px-4 py-2.5">Request Break</Link>
                <button className="rounded-xl bg-secondary text-xs font-bold px-4 py-2.5">Dismiss</button>
              </div>
            </div>
          </div>
        </div>

        {/* Critical card 2 */}
        <div className="panel p-4 border-l-4 border-l-gold">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold-soft flex items-center justify-center">
              <Activity className="h-5 w-5 text-gold-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between gap-2">
                <h3 className="font-display font-bold text-lg leading-tight">Abnormal Heart<br />Rate</h3>
                <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground h-fit">14m ago</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                System detected sustained elevated BPM. Environment temperature: 34°C.
              </p>
            </div>
          </div>
        </div>

        <Link to="/leave" className="inline-block rounded-xl bg-navy text-navy-foreground text-xs font-bold px-4 py-2.5">
          Apply for rest
        </Link>

        <div className="flex items-center justify-between pt-2">
          <span className="label-eyebrow">Past 24 Hours</span>
          <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            Filter <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        <PastRow icon={<LinkIcon className="h-4 w-4 text-muted-foreground" />} title="Device Disconnected" desc="Sentinel Wristband #204 lost sync with the hub." time="08:42 AM" />
        <PastRow icon={<AlertCircle className="h-4 w-4 text-warning" />} title="Mild Dehydration Alert" desc="Alex V. biometrics indicate early signs of heat stress." time="07:15 AM" />
        <PastRow icon={<OctagonAlert className="h-4 w-4 text-danger" />} title="Zone Boundary Breach" desc="Worker entered restricted hazardous storage area." time="Yesterday" />
        <PastRow icon={<Battery className="h-4 w-4 text-muted-foreground" />} title="System Maintenance" desc="Automated diagnostic completed for Gateway 02." time="Yesterday" />

        <div className="text-center label-eyebrow py-2">Load Older Alerts</div>
      </main>
      <BottomNav />
    </div>
  );
}

function PastRow({ icon, title, desc, time }: { icon: React.ReactNode; title: string; desc: string; time: string }) {
  return (
    <div className="panel p-3 flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground shrink-0">{time}</div>
        </div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
