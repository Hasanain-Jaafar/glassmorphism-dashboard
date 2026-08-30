import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { UserRole } from "@/components/providers/auth-provider";
import { currentYear } from "@/lib/mock-data";
import { currentMonthNumber } from "@/lib/target-period";
import { formatUSD } from "@/lib/format";
import {
  computeMonthlyTotal,
  computeYearToDateTotals,
  computePipelineCounts,
} from "@/lib/company-performance";
import { withTeamAggregates, computeRanking } from "@/lib/supabase/team";
import {
  fetchAppointmentsServer,
  fetchQuotationsServer,
  fetchDealsServer,
  fetchInvoicesServer,
  fetchTeamMembersServer,
  fetchCompanyTargetsServer,
  fetchIndividualTargetsServer,
  fetchKnowledgeBaseServer,
  type ServerSupabase,
} from "@/lib/ai/data";

export type AssistantToolContext = {
  supabase: ServerSupabase;
  userId: string;
  role: UserRole;
};

/**
 * 5 read-only tools the assistant can call, each scoped by Postgres RLS via
 * the request's own Supabase server client — a sales rep's tool calls only
 * ever see their own rows, an admin's see everyone's, exactly like the rest
 * of the dashboard. `year`/`month` follow the same "current period" the rest
 * of the app agrees on (lib/mock-data.ts's currentYear, lib/target-period.ts's
 * currentMonthNumber) so the assistant's numbers always match what's on
 * screen elsewhere.
 */
export function buildAssistantTools(ctx: AssistantToolContext) {
  const { supabase, userId, role } = ctx;
  const year = currentYear;
  const month = currentMonthNumber;

  const getPerformanceSummary = betaZodTool({
    name: "get_performance_summary",
    description:
      "Current month and year-to-date sales, closed deals this month, and all-time deal conversion rate. For a sales rep this is their own numbers; for an admin this is company-wide.",
    inputSchema: z.object({}),
    run: async () => {
      const [invoices, deals] = await Promise.all([
        fetchInvoicesServer(supabase),
        fetchDealsServer(supabase),
      ]);
      const monthlySales = computeMonthlyTotal(invoices, year, month);
      const { currentYearTotal } = computeYearToDateTotals(invoices, year, month);
      const closedDealsThisMonth = deals.filter((d) => {
        if (d.status !== "won" || !d.closedAt) return false;
        const closed = new Date(d.closedAt);
        return closed.getFullYear() === year && closed.getMonth() + 1 === month;
      }).length;
      const won = deals.filter((d) => d.status === "won").length;
      const lost = deals.filter((d) => d.status === "lost").length;
      const conversionRatePct = won + lost ? Math.round((won / (won + lost)) * 100) : 0;

      return JSON.stringify({
        scope: role === "admin" ? "company-wide" : "your own",
        period: { year, month },
        monthlySales,
        monthlySalesFormatted: formatUSD(monthlySales),
        yearToDateSales: currentYearTotal,
        yearToDateSalesFormatted: formatUSD(currentYearTotal),
        closedDealsThisMonth,
        conversionRatePct,
      });
    },
  });

  const getTeamRanking = betaZodTool({
    name: "get_team_ranking",
    description:
      "Ranked list of sales reps by year-to-date sales, with closed deals and conversion rate for each. For a sales rep this only ever returns their own row — they can't see other reps' data.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Max number of reps to return, default 10"),
    }),
    run: async ({ limit }) => {
      const [members, appointments, deals, invoices] = await Promise.all([
        fetchTeamMembersServer(supabase),
        fetchAppointmentsServer(supabase),
        fetchDealsServer(supabase),
        fetchInvoicesServer(supabase),
      ]);
      const reps = members.filter((m) => m.role === "sales_rep");
      const withAggregates = withTeamAggregates(
        reps,
        { appointments, deals, invoices },
        year,
        month
      );
      const ranking = computeRanking(withAggregates).slice(0, limit ?? 10);

      return JSON.stringify(
        ranking.map((r) => ({
          rank: r.rank,
          name: r.name,
          monthlySales: r.monthlySales,
          yearlySales: r.yearlySales,
          yearlySalesFormatted: formatUSD(r.yearlySales),
          closedDealsThisMonth: r.closedDeals,
          conversionRatePct: r.conversionRate,
          contributionPct: Math.round(r.contributionPct),
        }))
      );
    },
  });

  const getPipelineStats = betaZodTool({
    name: "get_pipeline_stats",
    description:
      "This month's sales pipeline: appointment, quotation, closed-deal, and paid-invoice counts, plus the conversion rate between each stage.",
    inputSchema: z.object({}),
    run: async () => {
      const [appointments, quotations, deals, invoices] = await Promise.all([
        fetchAppointmentsServer(supabase),
        fetchQuotationsServer(supabase),
        fetchDealsServer(supabase),
        fetchInvoicesServer(supabase),
      ]);
      const { stages, conversions } = computePipelineCounts(
        appointments,
        quotations,
        deals,
        invoices,
        year,
        month
      );

      return JSON.stringify({
        period: { year, month },
        stages: stages.map((s) => ({ label: s.label, value: s.value })),
        conversionRates: {
          appointmentToQuotationPct: conversions[0] ?? 0,
          quotationToDealPct: conversions[1] ?? 0,
          dealToInvoicePct: conversions[2] ?? 0,
        },
      });
    },
  });

  const getTargetProgress = betaZodTool({
    name: "get_target_progress",
    description:
      "Monthly and yearly target vs. actual, and how much is remaining to hit each. For an admin, also how many reps are on track (90%+ of their monthly target).",
    inputSchema: z.object({}),
    run: async () => {
      const invoices = await fetchInvoicesServer(supabase);
      const monthlyActual = computeMonthlyTotal(invoices, year, month);
      const { currentYearTotal: yearlyActual } = computeYearToDateTotals(
        invoices,
        year,
        month
      );

      if (role === "admin") {
        const [companyTargets, members, appointments, deals, individualTargets] =
          await Promise.all([
            fetchCompanyTargetsServer(supabase, year),
            fetchTeamMembersServer(supabase),
            fetchAppointmentsServer(supabase),
            fetchDealsServer(supabase),
            fetchIndividualTargetsServer(supabase, year),
          ]);
        const monthlyTarget = companyTargets.monthlyTargets[month] ?? 0;
        const yearlyTarget = companyTargets.yearlyTarget;
        const reps = members.filter((m) => m.role === "sales_rep");
        const withAggregates = withTeamAggregates(
          reps,
          { appointments, deals, invoices },
          year,
          month
        );
        const onTrack = withAggregates.filter((m) => {
          const target = individualTargets[m.id]?.monthlyTargets[month] ?? 0;
          return target > 0 && m.monthlySales / target >= 0.9;
        }).length;

        return JSON.stringify({
          scope: "company-wide",
          monthly: {
            target: monthlyTarget,
            actual: monthlyActual,
            remaining: Math.max(monthlyTarget - monthlyActual, 0),
            progressPct: monthlyTarget
              ? Math.round((monthlyActual / monthlyTarget) * 100)
              : 0,
          },
          yearly: {
            target: yearlyTarget,
            actual: yearlyActual,
            remaining: Math.max(yearlyTarget - yearlyActual, 0),
            progressPct: yearlyTarget
              ? Math.round((yearlyActual / yearlyTarget) * 100)
              : 0,
          },
          repsOnTrack: onTrack,
          totalReps: reps.length,
        });
      }

      const individualTargets = await fetchIndividualTargetsServer(supabase, year);
      const own = individualTargets[userId] ?? { yearlyTarget: 0, monthlyTargets: {} };
      const monthlyTarget = own.monthlyTargets[month] ?? 0;
      const yearlyTarget = own.yearlyTarget;

      return JSON.stringify({
        scope: "your own",
        monthly: {
          target: monthlyTarget,
          actual: monthlyActual,
          remaining: Math.max(monthlyTarget - monthlyActual, 0),
          progressPct: monthlyTarget
            ? Math.round((monthlyActual / monthlyTarget) * 100)
            : 0,
        },
        yearly: {
          target: yearlyTarget,
          actual: yearlyActual,
          remaining: Math.max(yearlyTarget - yearlyActual, 0),
          progressPct: yearlyTarget
            ? Math.round((yearlyActual / yearlyTarget) * 100)
            : 0,
        },
      });
    },
  });

  const getKnowledgeBase = betaZodTool({
    name: "get_knowledge_base",
    description:
      "Company documents an admin has uploaded — policies, playbooks, product info. Call this for questions the other tools can't answer with live sales data, e.g. \"what's our discount policy?\" or \"how do we handle price objections?\".",
    inputSchema: z.object({}),
    run: async () => {
      const docs = await fetchKnowledgeBaseServer(supabase);
      if (docs.length === 0) {
        return "No documents have been uploaded to the knowledge base yet.";
      }
      return docs
        .map((doc) => `# ${doc.title}\n\n${doc.content}`)
        .join("\n\n---\n\n");
    },
  });

  return [
    getPerformanceSummary,
    getTeamRanking,
    getPipelineStats,
    getTargetProgress,
    getKnowledgeBase,
  ];
}
