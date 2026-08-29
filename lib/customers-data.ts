import { isSameMonth } from "date-fns";

export type CustomerStatus = "active" | "prospect" | "inactive";

export type CustomerActivityType =
  | "appointment"
  | "quotation"
  | "deal"
  | "invoice"
  | "payment";

export type CustomerActivity = {
  id: string;
  type: CustomerActivityType;
  label: string;
  /** ISO date */
  date: string;
  amount?: number;
};

export type Customer = {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  assignedSalespersonId: string;
  totalSales: number;
  totalDeals: number;
  outstandingAmount: number;
  /** ISO date, or null if nothing has been purchased yet. */
  lastPurchaseDate: string | null;
  /** ISO date this customer was first added. */
  createdAt: string;
};

/**
 * Real per-customer totals derived from the pipeline tables — the source of
 * truth for Customer.totalSales/totalDeals/outstandingAmount/lastPurchaseDate,
 * which `fetchCustomers()` alone can't populate (those live on separate
 * appointments/quotations/deals/invoices rows, not on the customers table).
 * Total Sales only counts paid invoices, and Outstanding only sent/overdue
 * ones — matching CLAUDE.md §3's "revenue only counts once the invoice is
 * paid" rule. Used by both the Customers page/table and the dashboard's
 * Customer Pulse widget so the numbers agree everywhere.
 */
export function computeCustomerAggregates(
  customerId: string,
  data: {
    deals: { customerId: string | null; status: string }[];
    invoices: {
      customerId: string | null;
      status: string;
      amount: number;
      paidAt: string | null;
    }[];
  }
): {
  totalSales: number;
  totalDeals: number;
  outstandingAmount: number;
  lastPurchaseDate: string | null;
} {
  let totalSales = 0;
  let outstandingAmount = 0;
  let lastPurchaseDate: string | null = null;

  for (const inv of data.invoices) {
    if (inv.customerId !== customerId) continue;
    if (inv.status === "paid" && inv.paidAt) {
      totalSales += inv.amount;
      if (!lastPurchaseDate || inv.paidAt > lastPurchaseDate) {
        lastPurchaseDate = inv.paidAt;
      }
    } else if (inv.status === "sent" || inv.status === "overdue") {
      outstandingAmount += inv.amount;
    }
  }

  const totalDeals = data.deals.filter(
    (d) => d.customerId === customerId && d.status === "won"
  ).length;

  return { totalSales, totalDeals, outstandingAmount, lastPurchaseDate };
}

/** Overlays real aggregates (see `computeCustomerAggregates`) onto a customer list. */
export function withCustomerAggregates(
  customers: Customer[],
  data: Parameters<typeof computeCustomerAggregates>[1]
): Customer[] {
  return customers.map((c) => ({ ...c, ...computeCustomerAggregates(c.id, data) }));
}

export function computeCustomerStats(items: Customer[]) {
  const now = new Date();
  const total = items.length;
  const newThisMonth = items.filter((c) =>
    isSameMonth(new Date(c.createdAt), now)
  ).length;
  const active = items.filter((c) => c.status === "active").length;
  const totalRevenue = items.reduce((sum, c) => sum + c.totalSales, 0);

  return { total, newThisMonth, active, totalRevenue };
}

export type DateRangeFilter = "all" | "30d" | "90d" | "year";

export const dateRangeOptions: { value: DateRangeFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "year", label: "This Year" },
];

/** Start-of-range cutoff for `createdAt`, or null when the range is unbounded. */
export function dateRangeStart(range: DateRangeFilter, now = new Date()): Date | null {
  switch (range) {
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}
