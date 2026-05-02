import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/sentinel/StatusBadge";
import { Plus, Search, Watch, Battery, CloudOff, MoreVertical, UserX } from "lucide-react";
import marcus from "@/assets/worker-marcus.jpg";
import sarah from "@/assets/worker-sarah.jpg";
import bradley from "@/assets/worker-bradley.jpg";

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "Device Management — SentinelAI Admin" },
      { name: "description", content: "Real-time status tracking and employee assignment for the Sentinel wearable fleet." },
    ],
  }),
  component: DevicesPage,
});

function DevicesPage() {
  return (
    <AppShell>
      <TopBar right={<button className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Search className="h-4 w-4 text-ink" /></button>} showBell />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-warning-foreground/70 uppercase">Fleet Oversight</p>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink mt-1">Device Management</h1>
        <p className="mt-3 text-[13px] text-ink-soft">Real-time status tracking and employee assignment for the Sentinel wearable fleet.</p>
        <button className="mt-4 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider uppercase inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New Device
        </button>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <DeviceCard
          icon={<Watch className="h-5 w-5 text-ink-soft" />}
          status={<StatusBadge variant="success">Connected</StatusBadge>}
          deviceId="SN-992-ALPHA"
          assigneeName="Johnathan Doe" assigneeImg={marcus}
          actionLabel="Unassign"
        />
        <DeviceCard
          icon={<Battery className="h-5 w-5 text-warning-foreground" />}
          status={<StatusBadge variant="warning">Low Battery</StatusBadge>}
          deviceId="SN-104-BETA"
          assigneeName="Sarah Miller" assigneeImg={sarah}
          actionLabel="Unassign"
        />
        <DeviceCard
          icon={<CloudOff className="h-5 w-5 text-ink-soft" />}
          status={<StatusBadge variant="info">Offline</StatusBadge>}
          deviceId="SN-880-GAMMA"
          unassigned
          actionLabel="Assign Device"
          actionStyle="bg-warning text-ink"
        />
        <DeviceCard
          icon={<Watch className="h-5 w-5 text-ink-soft" />}
          status={<StatusBadge variant="success">Connected</StatusBadge>}
          deviceId="SN-512-DELTA"
          assigneeName="Mark Thompson" assigneeImg={bradley}
          actionLabel="Unassign"
        />

        <div className="flex flex-col items-center mt-2">
          <button className="h-12 w-12 rounded-xl bg-surface border border-border flex items-center justify-center"><Plus className="h-5 w-5 text-ink" /></button>
          <p className="mt-2 text-[12px] font-extrabold tracking-wider text-ink uppercase">Register Fleet Unit</p>
          <p className="text-[11px] text-ink-soft">Onboard a new IoT sensor</p>
        </div>

        <section className="bg-surface-muted rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <FleetStat label="TOTAL FLEET" value="128" valueColor="text-ink" />
            <FleetStat label="ACTIVE NOW" value="104" valueColor="text-success" />
            <FleetStat label="NEEDS ATTENTION" value="12" valueColor="text-warning-foreground" />
          </div>
          <p className="mt-3 text-[10px] font-extrabold tracking-wider text-ink-soft uppercase text-center">Last Update: 2 mins ago</p>
        </section>
      </div>
    </AppShell>
  );
}

function DeviceCard({ icon, status, deviceId, assigneeName, assigneeImg, unassigned, actionLabel, actionStyle }: {
  icon: React.ReactNode; status: React.ReactNode; deviceId: string;
  assigneeName?: string; assigneeImg?: string; unassigned?: boolean;
  actionLabel: string; actionStyle?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">{icon}</div>
        {status}
      </div>
      <p className="mt-4 text-[10px] font-extrabold tracking-wider text-ink-soft">DEVICE ID</p>
      <p className="text-[20px] font-extrabold text-ink">{deviceId}</p>

      <div className={`mt-3 p-3 rounded-xl ${unassigned ? "bg-muted border border-dashed border-border" : "bg-muted"}`}>
        <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">ASSIGNED TO</p>
        <div className="mt-1 flex items-center gap-2">
          {unassigned ? (
            <><UserX className="h-4 w-4 text-ink-soft" /><span className="text-[14px] font-bold text-ink-soft">Unassigned</span></>
          ) : (
            <>{assigneeImg && <img src={assigneeImg} width={24} height={24} loading="lazy" alt={assigneeName} className="h-6 w-6 rounded-full object-cover" />}<span className="text-[14px] font-bold text-ink">{assigneeName}</span></>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button className={`flex-1 h-11 rounded-xl text-[12px] font-extrabold tracking-wider uppercase ${actionStyle || "bg-muted text-ink"}`}>{actionLabel}</button>
        <button className="h-11 w-11 rounded-xl bg-surface flex items-center justify-center text-ink-soft" aria-label="More"><MoreVertical className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function FleetStat({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="bg-surface rounded-xl p-3">
      <p className="text-[9px] font-extrabold tracking-wider text-ink-soft uppercase">{label}</p>
      <p className={`mt-1 text-[24px] font-extrabold ${valueColor}`}>{value}</p>
    </div>
  );
}
