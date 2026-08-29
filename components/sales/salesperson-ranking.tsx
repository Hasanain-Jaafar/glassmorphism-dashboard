import { ChartCard } from "@/components/dashboard/chart-card";
import { SalespersonRankChart } from "@/components/charts/salesperson-chart";
import type { RankedTeamMember } from "@/lib/supabase/team";

export function SalespersonRanking({ people }: { people: RankedTeamMember[] }) {
  const ranked = people.map((person) => ({
    id: person.id,
    name: person.name,
    initials: person.initials,
    value: person.yearlySales,
    contributionPct: person.contributionPct,
    rank: person.rank,
  }));

  return (
    <ChartCard
      title="Salesperson Performance"
      description="Contribution to year-to-date sales"
    >
      <SalespersonRankChart people={ranked} />
    </ChartCard>
  );
}
