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
  activity: CustomerActivity[];
};

/**
 * Mock CRM data for the /customers page. There's no Supabase `customers`
 * table yet (see CLAUDE.md §35/§52) — this mirrors how /dashboard and the
 * Sales Team KPI tab work before backend integration.
 */
export const customers: Customer[] = [
  {
    id: "al-fahad-construction",
    company: "Al-Fahad Construction Co.",
    contactPerson: "Yousef Al-Fahad",
    email: "yousef.alfahad@alfahadconst.com",
    phone: "+964 770 123 4567",
    address: "Al Muhandiseen District, Basra, Iraq",
    status: "active",
    assignedSalespersonId: "ahmed-ali",
    totalSales: 184500,
    totalDeals: 6,
    outstandingAmount: 12400,
    lastPurchaseDate: "2026-08-14",
    createdAt: "2024-03-02",
    activity: [
      { id: "afc-1", type: "appointment", date: "2026-07-20", label: "Site visit — new Basra warehouse project" },
      { id: "afc-2", type: "quotation", date: "2026-07-28", label: "Quote sent — QT-2231 (PPR pressure system)", amount: 46800 },
      { id: "afc-3", type: "deal", date: "2026-08-05", label: "Deal closed — QT-2231 accepted", amount: 46800 },
      { id: "afc-4", type: "invoice", date: "2026-08-10", label: "Invoice issued — INV-3142", amount: 46800 },
      { id: "afc-5", type: "payment", date: "2026-08-14", label: "Payment received — INV-3142 (partial)", amount: 34400 },
    ],
  },
  {
    id: "hassan-trading",
    company: "Hassan Trading Est.",
    contactPerson: "Layla Hassan",
    email: "layla.hassan@hassantrading.iq",
    phone: "+964 780 234 5678",
    address: "Al Fayhaa, Nasiriyah, Dhi Qar, Iraq",
    status: "active",
    assignedSalespersonId: "rami-saad",
    totalSales: 132750,
    totalDeals: 4,
    outstandingAmount: 0,
    lastPurchaseDate: "2026-07-29",
    createdAt: "2024-06-18",
    activity: [
      { id: "ht-1", type: "appointment", date: "2026-07-10", label: "Follow-up meeting — Nasiriyah showroom" },
      { id: "ht-2", type: "quotation", date: "2026-07-15", label: "Quote sent — QT-2198 (sanitary ware set)", amount: 28500 },
      { id: "ht-3", type: "deal", date: "2026-07-22", label: "Deal closed — QT-2198 accepted", amount: 28500 },
      { id: "ht-4", type: "invoice", date: "2026-07-25", label: "Invoice issued — INV-3108", amount: 28500 },
      { id: "ht-5", type: "payment", date: "2026-07-29", label: "Payment received — INV-3108 (paid in full)", amount: 28500 },
    ],
  },
  {
    id: "al-sayed-real-estate",
    company: "Al-Sayed Real Estate Group",
    contactPerson: "Omar Al-Sayed",
    email: "omar.alsayed@alsayedre.com",
    phone: "+964 790 345 6789",
    address: "Al Andalus Quarter, Basra, Iraq",
    status: "active",
    assignedSalespersonId: "najee-waleed",
    totalSales: 297300,
    totalDeals: 9,
    outstandingAmount: 34200,
    lastPurchaseDate: "2026-08-20",
    createdAt: "2023-11-05",
    activity: [
      { id: "asre-1", type: "appointment", date: "2026-08-02", label: "Progress review — Basra villas phase 2" },
      { id: "asre-2", type: "quotation", date: "2026-08-08", label: "Quote sent — QT-2255 (drainage + storage tanks)", amount: 61500 },
      { id: "asre-3", type: "deal", date: "2026-08-15", label: "Deal closed — QT-2255 accepted", amount: 61500 },
      { id: "asre-4", type: "invoice", date: "2026-08-18", label: "Invoice issued — INV-3161", amount: 61500 },
      { id: "asre-5", type: "payment", date: "2026-08-20", label: "Payment received — INV-3161 (partial)", amount: 27300 },
    ],
  },
  {
    id: "zahran-plumbing-supplies",
    company: "Zahran Plumbing Supplies",
    contactPerson: "Fatima Zahran",
    email: "fatima.zahran@zahransupplies.com",
    phone: "+964 750 456 7890",
    address: "Al Wahda Street, Amarah, Maysan, Iraq",
    status: "prospect",
    assignedSalespersonId: "mustafa-kamil",
    totalSales: 0,
    totalDeals: 0,
    outstandingAmount: 0,
    lastPurchaseDate: null,
    createdAt: "2026-08-15",
    activity: [
      { id: "zps-1", type: "appointment", date: "2026-08-15", label: "Initial meeting — Amarah branch product line review" },
      { id: "zps-2", type: "quotation", date: "2026-08-20", label: "Quote sent — QT-2267 (CPVC hot & cold set)", amount: 15600 },
    ],
  },
  {
    id: "mansour-building-materials",
    company: "Mansour Building Materials",
    contactPerson: "Khalid Mansour",
    email: "khalid.mansour@mansourbm.com",
    phone: "+964 771 567 8901",
    address: "Al Rasheed Street, Samawah, Al Muthanna, Iraq",
    status: "active",
    assignedSalespersonId: "hameed-radi",
    totalSales: 156200,
    totalDeals: 5,
    outstandingAmount: 8600,
    lastPurchaseDate: "2026-08-05",
    createdAt: "2024-01-22",
    activity: [
      { id: "mbm-1", type: "appointment", date: "2026-07-18", label: "Quarterly account review — Samawah branch" },
      { id: "mbm-2", type: "quotation", date: "2026-07-24", label: "Quote sent — QT-2209 (galvanized pipe order)", amount: 32900 },
      { id: "mbm-3", type: "deal", date: "2026-07-30", label: "Deal closed — QT-2209 accepted", amount: 32900 },
      { id: "mbm-4", type: "invoice", date: "2026-08-02", label: "Invoice issued — INV-3121", amount: 32900 },
      { id: "mbm-5", type: "payment", date: "2026-08-05", label: "Payment received — INV-3121 (partial)", amount: 24300 },
    ],
  },
  {
    id: "al-amin-contracting",
    company: "Al-Amin Contracting",
    contactPerson: "Noor Al-Amin",
    email: "noor.alamin@alamincontracting.com",
    phone: "+964 781 678 9012",
    address: "Al Qadisiyyah Street, Diwaniyah, Iraq",
    status: "inactive",
    assignedSalespersonId: "alwan-kadhim",
    totalSales: 64800,
    totalDeals: 3,
    outstandingAmount: 0,
    lastPurchaseDate: "2025-11-10",
    createdAt: "2023-07-14",
    activity: [
      { id: "aac-1", type: "appointment", date: "2025-10-28", label: "Check-in call — Diwaniyah site" },
      { id: "aac-2", type: "quotation", date: "2025-11-02", label: "Quote sent — QT-1876 (drainage fittings)", amount: 21400 },
      { id: "aac-3", type: "deal", date: "2025-11-07", label: "Deal closed — QT-1876 accepted", amount: 21400 },
      { id: "aac-4", type: "invoice", date: "2025-11-10", label: "Invoice issued — INV-2884", amount: 21400 },
      { id: "aac-5", type: "payment", date: "2025-11-10", label: "Payment received — INV-2884 (paid in full)", amount: 21400 },
    ],
  },
  {
    id: "suleiman-infrastructure",
    company: "Suleiman Infrastructure LLC",
    contactPerson: "Tariq Suleiman",
    email: "tariq.suleiman@suleimaninfra.iq",
    phone: "+964 791 789 0123",
    address: "Al Sinaiyah Industrial Zone, Basra, Iraq",
    status: "active",
    assignedSalespersonId: "wesam-ali",
    totalSales: 341600,
    totalDeals: 7,
    outstandingAmount: 52300,
    lastPurchaseDate: "2026-08-22",
    createdAt: "2023-09-30",
    activity: [
      { id: "sil-1", type: "appointment", date: "2026-08-06", label: "Site walk — Umm Qasr port infrastructure works" },
      { id: "sil-2", type: "quotation", date: "2026-08-12", label: "Quote sent — QT-2261 (industrial valves & couplings)", amount: 88900 },
      { id: "sil-3", type: "deal", date: "2026-08-18", label: "Deal closed — QT-2261 accepted", amount: 88900 },
      { id: "sil-4", type: "invoice", date: "2026-08-21", label: "Invoice issued — INV-3168", amount: 88900 },
      { id: "sil-5", type: "payment", date: "2026-08-22", label: "Payment received — INV-3168 (partial)", amount: 36600 },
    ],
  },
  {
    id: "karim-sanitary-trading",
    company: "Karim Sanitary Ware Trading",
    contactPerson: "Rania Karim",
    email: "rania.karim@karimsanitary.iq",
    phone: "+964 751 890 1234",
    address: "Al Nasr Street, Nasiriyah, Dhi Qar, Iraq",
    status: "prospect",
    assignedSalespersonId: "ahmed-ali",
    totalSales: 0,
    totalDeals: 0,
    outstandingAmount: 0,
    lastPurchaseDate: null,
    createdAt: "2026-08-06",
    activity: [
      { id: "kst-1", type: "appointment", date: "2026-08-06", label: "Introductory meeting — Nasiriyah showroom" },
    ],
  },
  {
    id: "nasser-municipal-projects",
    company: "Nasser Municipal Projects",
    contactPerson: "Bilal Nasser",
    email: "bilal.nasser@nassermunicipal.iq",
    phone: "+964 772 901 2345",
    address: "Maysan Governorate Center, Amarah, Iraq",
    status: "inactive",
    assignedSalespersonId: "rami-saad",
    totalSales: 47250,
    totalDeals: 2,
    outstandingAmount: 0,
    lastPurchaseDate: "2025-08-19",
    createdAt: "2024-02-11",
    activity: [
      { id: "nmp-1", type: "appointment", date: "2025-08-05", label: "Municipal tender briefing — Amarah" },
      { id: "nmp-2", type: "quotation", date: "2025-08-10", label: "Quote sent — QT-1742 (manhole & access kits)", amount: 24750 },
      { id: "nmp-3", type: "deal", date: "2025-08-15", label: "Deal closed — QT-1742 accepted", amount: 24750 },
      { id: "nmp-4", type: "invoice", date: "2025-08-19", label: "Invoice issued — INV-2793", amount: 24750 },
      { id: "nmp-5", type: "payment", date: "2025-08-19", label: "Payment received — INV-2793 (paid in full)", amount: 24750 },
    ],
  },
  {
    id: "youssef-villas-development",
    company: "Youssef Villas Development",
    contactPerson: "Samira Youssef",
    email: "samira.youssef@youssefvillas.iq",
    phone: "+964 782 012 3456",
    address: "Kut Al Hijaj, Basra, Iraq",
    status: "active",
    assignedSalespersonId: "najee-waleed",
    totalSales: 218900,
    totalDeals: 6,
    outstandingAmount: 19750,
    lastPurchaseDate: "2026-08-25",
    createdAt: "2024-05-08",
    activity: [
      { id: "yvd-1", type: "appointment", date: "2026-08-10", label: "Design coordination — Kut Al Hijaj villas" },
      { id: "yvd-2", type: "quotation", date: "2026-08-16", label: "Quote sent — QT-2270 (water tanks + booster pumps)", amount: 41200 },
      { id: "yvd-3", type: "deal", date: "2026-08-21", label: "Deal closed — QT-2270 accepted", amount: 41200 },
      { id: "yvd-4", type: "invoice", date: "2026-08-24", label: "Invoice issued — INV-3175", amount: 41200 },
      { id: "yvd-5", type: "payment", date: "2026-08-25", label: "Payment received — INV-3175 (partial)", amount: 21450 },
    ],
  },
];

export function avgDealValue(customer: Customer): number {
  return customer.totalDeals ? customer.totalSales / customer.totalDeals : 0;
}

/** Most recent activity date, falling back to the last purchase date. */
export function lastActivityDate(customer: Customer): string | null {
  if (customer.activity.length === 0) return customer.lastPurchaseDate;
  return customer.activity.reduce(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    customer.activity[0].date
  );
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
