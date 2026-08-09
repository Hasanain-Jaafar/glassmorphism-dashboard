import { ChartCard } from "@/components/dashboard/chart-card";
import { SalespersonRankChart } from "@/components/charts/salesperson-chart";
import { salespersonRanking } from "@/lib/mock-data";

export function SalespersonRanking() {
  const people = salespersonRanking.map((person) => ({
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
      <SalespersonRankChart people={people} />
    </ChartCard>
  );
}
