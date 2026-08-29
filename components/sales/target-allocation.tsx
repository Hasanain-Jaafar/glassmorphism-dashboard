import { ChartCard } from "@/components/dashboard/chart-card";
import { SalespersonRankChart, type RankedPerson } from "@/components/charts/salesperson-chart";
import {
  personTargetForSelection,
  type TargetPeriodSelection,
  type TargetPerson,
} from "@/lib/target-period";

export function TargetAllocation({
  people,
  selection,
}: {
  people: TargetPerson[];
  selection: TargetPeriodSelection;
}) {
  const withTargets = people.map((person) => ({
    person,
    target: personTargetForSelection(person, selection),
  }));
  const total = withTargets.reduce((sum, p) => sum + p.target, 0);

  const ranked: RankedPerson[] = [...withTargets]
    .sort((a, b) => b.target - a.target)
    .map(({ person, target }, index) => ({
      id: person.id,
      name: person.name,
      initials: person.initials,
      value: target,
      contributionPct: total ? (target / total) * 100 : 0,
      rank: index + 1,
    }));

  return (
    <ChartCard
      title="Target Allocation"
      description="Who owns how much of the company target this period"
    >
      {ranked.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-tertiary">
          No targets assigned yet.
        </p>
      ) : (
        <SalespersonRankChart people={ranked} />
      )}
    </ChartCard>
  );
}
