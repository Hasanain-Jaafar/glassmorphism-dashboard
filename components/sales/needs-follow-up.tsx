"use client";

import { useEffect, useMemo, useState } from "react";
import { FileClock, HandCoins } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchCustomers } from "@/lib/supabase/customers";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import {
  fetchDeals,
  isDealStale,
  type Deal,
} from "@/lib/supabase/deals";
import {
  fetchQuotations,
  isQuotationOverdue,
  type Quotation,
} from "@/lib/supabase/quotations";
import type { Customer } from "@/lib/customers-data";
import { workingDaysElapsed } from "@/lib/working-days";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";

type FollowUpItem = {
  id: string;
  kind: "deal" | "quotation";
  customerName: string;
  repName: string;
  amount: number;
  workingDays: number;
};

const MAX_SHOWN = 6;

/**
 * Named list of exactly which open deals and sent quotations have gone
 * quiet, sorted most-stalled first — the "who do I call today" complement
 * to the funnel's aggregate conversion rates. Auto-scoped to "my own" for a
 * rep and "the whole team" for an admin via the same RLS the fetches
 * already rely on elsewhere.
 */
export function NeedsFollowUp() {
  const { isAdmin } = useAuth();
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [quotations, setQuotations] = useState<Quotation[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [people, setPeople] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetchDeals().then(setDeals).catch(() => setDeals([]));
    fetchQuotations().then(setQuotations).catch(() => setQuotations([]));
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchTeamMembers().then(setPeople).catch(() => {});
  }, []);

  const items = useMemo<FollowUpItem[] | null>(() => {
    if (deals === null || quotations === null) return null;
    const customersById = new Map(customers.map((c) => [c.id, c]));
    const peopleById = new Map(people.map((p) => [p.id, p]));

    const staleDeals: FollowUpItem[] = deals
      .filter((d) => isDealStale(d))
      .map((d) => ({
        id: d.id,
        kind: "deal",
        customerName: customersById.get(d.customerId)?.company ?? "Unknown customer",
        repName: peopleById.get(d.salesRepId)?.name ?? "Unknown rep",
        amount: d.amount,
        workingDays: workingDaysElapsed(new Date(d.createdAt)),
      }));

    const overdueQuotations: FollowUpItem[] = quotations
      .filter((q) => isQuotationOverdue(q))
      .map((q) => ({
        id: q.id,
        kind: "quotation",
        customerName: customersById.get(q.customerId)?.company ?? "Unknown customer",
        repName: peopleById.get(q.salesRepId)?.name ?? "Unknown rep",
        amount: q.total,
        // isQuotationOverdue already guarantees sentAt is set here.
        workingDays: workingDaysElapsed(new Date(q.sentAt as string)),
      }));

    return [...staleDeals, ...overdueQuotations].sort(
      (a, b) => b.workingDays - a.workingDays
    );
  }, [deals, quotations, customers, people]);

  if (items === null) {
    return (
      <ChartCard
        title="Needs Follow-Up"
        description="Open deals and sent quotations sitting with no response"
      >
        <div className="space-y-2.5">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </ChartCard>
    );
  }

  const shown = items.slice(0, MAX_SHOWN);

  return (
    <ChartCard
      title="Needs Follow-Up"
      description="Open deals and sent quotations sitting with no response"
      actions={
        items.length > 0 && (
          <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
            {items.length}
          </span>
        )
      }
    >
      {shown.length === 0 ? (
        <p className="py-6 text-center text-xs text-text-tertiary">
          Nothing stalled — every open deal and sent quotation is moving.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center gap-2.5 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-2.5"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  item.kind === "deal"
                    ? "bg-danger/10 text-danger"
                    : "bg-warning/10 text-warning"
                )}
              >
                {item.kind === "deal" ? (
                  <HandCoins className="size-3.5" />
                ) : (
                  <FileClock className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.customerName}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {isAdmin ? `${item.repName} · ` : ""}
                  {item.kind === "deal" ? "Open deal" : "Sent quotation"} ·{" "}
                  {item.workingDays}d
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {formatUSD(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
