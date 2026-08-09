import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/components/providers/auth-provider";

export type TeamMember = {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  hasCar: boolean;
  /** ISO date, or null if not set. */
  startDate: string | null;
  /** Current month, paid. Zero until real appointments/quotations/deals/invoices exist — see supabase/README.md. */
  monthlySales: number;
  monthlyTarget: number;
  /** Year to date, paid. */
  yearlySales: number;
  yearlyTarget: number;
  /** Current month. */
  closedDeals: number;
  conversionRate: number;
  avgDeal: number;
  totalAppointments: number;
};

function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** All active accounts (sales reps and admins) — the roster shown on /team. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, avatar_url, role, is_active, has_car, start_date"
    )
    .eq("is_active", true)
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role as UserRole,
    initials: initialsFromName(p.full_name),
    avatarUrl: p.avatar_url,
    email: p.email,
    phone: p.phone,
    hasCar: p.has_car,
    startDate: p.start_date,
    // Performance metrics require real appointments/quotations/deals/invoices
    // data, which doesn't exist until the sales workflow pages are built —
    // see supabase/README.md for what's live vs. still pending.
    monthlySales: 0,
    monthlyTarget: 0,
    yearlySales: 0,
    yearlyTarget: 0,
    closedDeals: 0,
    conversionRate: 0,
    avgDeal: 0,
    totalAppointments: 0,
  }));
}

export function computeTeamStats(people: TeamMember[]) {
  const monthlySalesTotal = people.reduce(
    (sum, person) => sum + person.monthlySales,
    0
  );
  const monthlyTargetTotal = people.reduce(
    (sum, person) => sum + person.monthlyTarget,
    0
  );
  const closedDealsTotal = people.reduce(
    (sum, person) => sum + person.closedDeals,
    0
  );
  const avgConversionRate = people.length
    ? people.reduce((sum, person) => sum + person.conversionRate, 0) /
      people.length
    : 0;

  return {
    monthlySalesTotal,
    monthlyTargetTotal,
    monthlyProgressPct: monthlyTargetTotal
      ? (monthlySalesTotal / monthlyTargetTotal) * 100
      : 0,
    closedDealsTotal,
    avgConversionRate,
  };
}

export type RankedTeamMember = TeamMember & {
  rank: number;
  contributionPct: number;
};

export function computeRanking(people: TeamMember[]): RankedTeamMember[] {
  const yearlyTotal = people.reduce(
    (sum, person) => sum + person.yearlySales,
    0
  );

  return [...people]
    .sort((a, b) => b.yearlySales - a.yearlySales)
    .map((person, index) => ({
      ...person,
      rank: index + 1,
      contributionPct: yearlyTotal
        ? (person.yearlySales / yearlyTotal) * 100
        : 0,
    }));
}
