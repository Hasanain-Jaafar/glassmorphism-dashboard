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
