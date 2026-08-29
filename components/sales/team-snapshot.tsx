import { ChartCard } from "@/components/dashboard/chart-card";
import { TeamSnapshotRadar } from "@/components/charts/team-snapshot-radar";
import type { TeamSnapshotAxis } from "@/lib/company-performance";

export function TeamSnapshot({ data }: { data: TeamSnapshotAxis[] }) {
  return (
    <ChartCard
      title="Team Snapshot"
      description="This month's pipeline health, at a glance"
    >
      <TeamSnapshotRadar data={data} />
    </ChartCard>
  );
}
