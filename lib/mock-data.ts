export type Salesperson = {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** Current month, paid */
  monthlySales: number;
  monthlyTarget: number;
  /** Year to date, paid */
  yearlySales: number;
  yearlyTarget: number;
  /** Current month */
  closedDeals: number;
  conversionRate: number;
  avgDeal: number;
  age: number;
  education: string;
  email: string;
  address: string;
  /** ISO date */
  startDate: string;
  /** Current month */
  totalAppointments: number;
  /** Has access to a personal/company car */
  hasCar: boolean;
};

export const salespeople: Salesperson[] = [
  {
    id: "anna-svensson",
    name: "Anna Svensson",
    role: "Sales Representative",
    initials: "AS",
    monthlySales: 83200,
    monthlyTarget: 101500,
    yearlySales: 719200,
    yearlyTarget: 870000,
    closedDeals: 5,
    conversionRate: 68,
    avgDeal: 16640,
    age: 34,
    education: "BSc Business Administration, Stockholm University",
    email: "anna.svensson@salesdash.com",
    address: "12 Vasagatan, Stockholm, Sweden",
    startDate: "2021-03-15",
    totalAppointments: 9,
    hasCar: true,
  },
  {
    id: "johan-berg",
    name: "Johan Berg",
    role: "Sales Representative",
    initials: "JB",
    monthlySales: 68900,
    monthlyTarget: 84000,
    yearlySales: 595200,
    yearlyTarget: 720000,
    closedDeals: 4,
    conversionRate: 62,
    avgDeal: 17225,
    age: 41,
    education: "BSc Economics, Lund University",
    email: "johan.berg@salesdash.com",
    address: "45 Kungsgatan, Gothenburg, Sweden",
    startDate: "2019-08-01",
    totalAppointments: 7,
    hasCar: true,
  },
  {
    id: "erik-lindqvist",
    name: "Erik Lindqvist",
    role: "Sales Representative",
    initials: "EL",
    monthlySales: 54500,
    monthlyTarget: 66500,
    yearlySales: 471200,
    yearlyTarget: 570000,
    closedDeals: 3,
    conversionRate: 58,
    avgDeal: 18167,
    age: 29,
    education: "BA Marketing, Uppsala University",
    email: "erik.lindqvist@salesdash.com",
    address: "8 Drottninggatan, Uppsala, Sweden",
    startDate: "2022-11-10",
    totalAppointments: 6,
    hasCar: false,
  },
  {
    id: "sara-nilsson",
    name: "Sara Nilsson",
    role: "Sales Representative",
    initials: "SN",
    monthlySales: 45900,
    monthlyTarget: 56000,
    yearlySales: 396800,
    yearlyTarget: 480000,
    closedDeals: 3,
    conversionRate: 60,
    avgDeal: 15300,
    age: 37,
    education: "BSc Business Administration, Linköping University",
    email: "sara.nilsson@salesdash.com",
    address: "22 Storgatan, Malmö, Sweden",
    startDate: "2020-05-20",
    totalAppointments: 5,
    hasCar: true,
  },
  {
    id: "marcus-ekstrom",
    name: "Marcus Ekström",
    role: "Sales Representative",
    initials: "ME",
    monthlySales: 34500,
    monthlyTarget: 42000,
    yearlySales: 297600,
    yearlyTarget: 360000,
    closedDeals: 2,
    conversionRate: 50,
    avgDeal: 17250,
    age: 26,
    education: "BA Communications, Örebro University",
    email: "marcus.ekstrom@salesdash.com",
    address: "3 Sveavägen, Örebro, Sweden",
    startDate: "2023-06-01",
    totalAppointments: 4,
    hasCar: false,
  },
];

export const company = {
  currentYearTotal: 2_480_000,
  previousYearToDateTotal: 2_199_000,
  yearTarget: 3_000_000,
  monthlyTarget: 350_000,
  monthlyActual: 287_000,
  activeReps: salespeople.length,
  currentMonthLabel: "August",
};

export const yoyGrowthPct =
  ((company.currentYearTotal - company.previousYearToDateTotal) /
    company.previousYearToDateTotal) *
  100;

export const yearTargetProgressPct =
  (company.currentYearTotal / company.yearTarget) * 100;

export const monthlyRemaining = company.monthlyTarget - company.monthlyActual;

export const monthlyProgressPct =
  (company.monthlyActual / company.monthlyTarget) * 100;

export const avgSalesPerRep = company.monthlyActual / company.activeReps;

export type MonthlyRevenuePoint = {
  month: string;
  current: number;
  previous: number;
};

export const revenueSeries: MonthlyRevenuePoint[] = [
  { month: "Jan", current: 281_000, previous: 249_000 },
  { month: "Feb", current: 288_000, previous: 255_000 },
  { month: "Mar", current: 305_000, previous: 270_000 },
  { month: "Apr", current: 320_000, previous: 284_000 },
  { month: "May", current: 312_000, previous: 277_000 },
  { month: "Jun", current: 327_000, previous: 290_000 },
  { month: "Jul", current: 360_000, previous: 319_000 },
  { month: "Aug", current: 287_000, previous: 255_000 },
];

export type PipelineStage = {
  key: "appointments" | "quotations" | "deals" | "invoices";
  label: string;
  value: number;
};

export const pipeline: PipelineStage[] = [
  { key: "appointments", label: "Appointments", value: 42 },
  { key: "quotations", label: "Quotations", value: 28 },
  { key: "deals", label: "Closed Deals", value: 17 },
  { key: "invoices", label: "Paid Invoices", value: 14 },
];

export const pipelineConversion = {
  appointmentToQuotation: Math.round(
    (pipeline[1].value / pipeline[0].value) * 100
  ),
  quotationToClosed: Math.round((pipeline[2].value / pipeline[1].value) * 100),
  closedToPaid: Math.round((pipeline[3].value / pipeline[2].value) * 100),
};

export function computeTeamStats(people: Salesperson[]) {
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

export type RankedSalesperson = Salesperson & {
  rank: number;
  contributionPct: number;
};

export function computeRanking(people: Salesperson[]): RankedSalesperson[] {
  const yearlyTotal = people.reduce((sum, person) => sum + person.yearlySales, 0);

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

export const salespersonRanking: RankedSalesperson[] =
  computeRanking(salespeople);

export const currentYear = 2026;
export const previousYear = 2025;
export const rankingYears = [currentYear, previousYear] as const;
export const rankingMonths = revenueSeries.map((point) => point.month);

export type ProductStatus = "active" | "draft" | "archived";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  status: ProductStatus;
  description: string;
};

export const productCategories = [
  "Drinking Water Systems",
  "Sewage & Drainage Systems",
  "Sanitary Ware",
  "Galvanized Steel Pipes",
  "Infrastructure Pipeline Solutions",
  "Tools & Equipment",
  "Water Storage Tanks",
] as const;

export const productBrands = [
  "Polymelt",
  "Poloplast",
  "Saudi Ceramics",
  "+GF+ (Georg Fischer)",
  "Pimtas",
  "DAB Pumps",
  "Aquapa",
  "Alvit",
  "Quarterbath",
  "Turan",
  "NASSAR",
  "Guaari",
] as const;

export const products: Product[] = [
  {
    id: "ppr-pressure-system",
    name: "PPR Pressure Pipe & Fitting System — DN20–110",
    sku: "PIM-PPR-2011",
    category: "Drinking Water Systems",
    brand: "Pimtas",
    price: 1450,
    status: "active",
    description:
      "Cold and hot water PPR pressure pipes and fittings for indoor and outdoor potable water networks.",
  },
  {
    id: "cpvc-hot-cold-set",
    name: "CPVC Hot & Cold Water Pipe Set",
    sku: "PLM-CPVC-100",
    category: "Drinking Water Systems",
    brand: "Polymelt",
    price: 980,
    status: "active",
    description:
      "CPVC piping system rated for hot and cold potable water distribution.",
  },
  {
    id: "pvc-drainage-range",
    name: "PVC-U Drainage Pipe & Fitting Range",
    sku: "PLP-PVC-DR40",
    category: "Sewage & Drainage Systems",
    brand: "Poloplast",
    price: 760,
    status: "active",
    description:
      "Primary and secondary network drainage pipes and fittings for sewage systems.",
  },
  {
    id: "sewage-manhole-kit",
    name: "Sewage Network Manhole & Access Fitting Kit",
    sku: "NAS-SWG-MH1",
    category: "Sewage & Drainage Systems",
    brand: "NASSAR",
    price: 540,
    status: "draft",
    description:
      "Manhole connectors and access fittings for buried sewage networks.",
  },
  {
    id: "ceramic-basin-wc-suite",
    name: "Wall-Hung Ceramic Basin & WC Suite",
    sku: "SCR-SAN-WC12",
    category: "Sanitary Ware",
    brand: "Saudi Ceramics",
    price: 610,
    status: "active",
    description:
      "Wall-hung ceramic basin and WC suite for residential and commercial bathrooms.",
  },
  {
    id: "bath-shower-fixture-set",
    name: "Designer Bath & Shower Fixture Set",
    sku: "QTB-FIX-450",
    category: "Sanitary Ware",
    brand: "Quarterbath",
    price: 890,
    status: "active",
    description:
      "Mixer taps, shower sets, and bathroom fixtures in a coordinated finish.",
  },
  {
    id: "sink-faucet-range",
    name: "Sink & Faucet Fitting Range",
    sku: "ALV-SNK-220",
    category: "Sanitary Ware",
    brand: "Alvit",
    price: 310,
    status: "draft",
    description: "Kitchen and utility sinks with matching faucet fittings.",
  },
  {
    id: "galvanized-threaded-pipe",
    name: "Galvanized Steel Threaded Pipe",
    sku: "TRN-GST-150",
    category: "Galvanized Steel Pipes",
    brand: "Turan",
    price: 1120,
    status: "active",
    description:
      "Hot-dip galvanized steel pipe with threaded ends for structural and plumbing use.",
  },
  {
    id: "galvanized-fitting-set",
    name: "Structural Galvanized Fitting Set",
    sku: "NAS-GST-FIT",
    category: "Galvanized Steel Pipes",
    brand: "NASSAR",
    price: 475,
    status: "active",
    description:
      "Elbows, tees, and couplings for galvanized steel pipe assemblies.",
  },
  {
    id: "industrial-valve-coupling",
    name: "Industrial Pipeline Valve & Coupling System",
    sku: "GF-IND-VLV9",
    category: "Infrastructure Pipeline Solutions",
    brand: "+GF+ (Georg Fischer)",
    price: 3250,
    status: "active",
    description:
      "Valves and couplings engineered for municipal and industrial buried pipeline networks.",
  },
  {
    id: "agricultural-irrigation-kit",
    name: "Agricultural Irrigation Pipeline Kit",
    sku: "PLP-AGR-IRR",
    category: "Infrastructure Pipeline Solutions",
    brand: "Poloplast",
    price: 1680,
    status: "draft",
    description:
      "Buried pipeline components for agricultural irrigation networks.",
  },
  {
    id: "electrofusion-welding-machine",
    name: "Electrofusion Welding Machine",
    sku: "GF-TL-EF160",
    category: "Tools & Equipment",
    brand: "+GF+ (Georg Fischer)",
    price: 4800,
    status: "active",
    description:
      "Electrofusion fusion machine for joining PE and PP pipe systems on-site.",
  },
  {
    id: "booster-pump-set",
    name: "Booster Pump Set",
    sku: "DAB-PMP-B2",
    category: "Tools & Equipment",
    brand: "DAB Pumps",
    price: 1340,
    status: "active",
    description:
      "Pressure booster pump set for residential and light commercial water supply.",
  },
  {
    id: "polyethylene-water-tank",
    name: "Polyethylene Water Storage Tank — 2,000L",
    sku: "AQP-TNK-2000",
    category: "Water Storage Tanks",
    brand: "Aquapa",
    price: 890,
    status: "active",
    description:
      "Rotomolded polyethylene water storage tank for rooftop or ground installation.",
  },
  {
    id: "stainless-steel-water-tank",
    name: "Stainless Steel Panel Water Tank",
    sku: "GRI-TNK-SS15",
    category: "Water Storage Tanks",
    brand: "Guaari",
    price: 2150,
    status: "archived",
    description:
      "Stainless steel panel water tank, replaced by the Aquapa rotomolded range.",
  },
  {
    id: "upvc-pressure-pipe-system",
    name: "UPVC Pressure Pipe System — Class D",
    sku: "PLM-UPVC-300",
    category: "Drinking Water Systems",
    brand: "Polymelt",
    price: 720,
    status: "active",
    description:
      "UPVC pressure pipe system for cold water supply and irrigation networks.",
  },
  {
    id: "soundproof-drainage-system",
    name: "Soundproof Drainage Pipe System",
    sku: "PLP-SND-DR60",
    category: "Sewage & Drainage Systems",
    brand: "Poloplast",
    price: 890,
    status: "active",
    description:
      "Low-noise mineral-reinforced drainage pipes for multi-story buildings.",
  },
  {
    id: "pedestal-wash-basin-set",
    name: "Pedestal Wash Basin Set",
    sku: "SCR-SAN-PED8",
    category: "Sanitary Ware",
    brand: "Saudi Ceramics",
    price: 340,
    status: "active",
    description: "Freestanding pedestal wash basin with matching fittings.",
  },
  {
    id: "one-piece-floor-wc",
    name: "One-Piece Floor-Mounted WC",
    sku: "SCR-SAN-WC20",
    category: "Sanitary Ware",
    brand: "Saudi Ceramics",
    price: 480,
    status: "active",
    description: "Compact one-piece toilet with dual-flush cistern.",
  },
  {
    id: "actuated-butterfly-valve",
    name: "Actuated Butterfly Valve — DN50-300",
    sku: "GF-IND-BFV5",
    category: "Infrastructure Pipeline Solutions",
    brand: "+GF+ (Georg Fischer)",
    price: 2100,
    status: "active",
    description:
      "Electrically actuated butterfly valve for municipal water and industrial process lines.",
  },
  {
    id: "pipe-fusion-jointing-kit",
    name: "Pipe Fusion Jointing Tool Kit",
    sku: "GF-TL-JNT30",
    category: "Tools & Equipment",
    brand: "+GF+ (Georg Fischer)",
    price: 1250,
    status: "active",
    description:
      "Hand tool kit for socket and butt fusion jointing of PE and PP pipe.",
  },
  {
    id: "ppr-fitting-assortment-box",
    name: "PP-R Fitting Assortment Box",
    sku: "PIM-PPR-FIT1",
    category: "Drinking Water Systems",
    brand: "Pimtas",
    price: 260,
    status: "active",
    description:
      "Mixed box of elbows, tees, and couplings for PP-R pressure systems.",
  },
  {
    id: "submersible-drainage-pump",
    name: "Submersible Drainage Pump",
    sku: "DAB-PMP-SUB4",
    category: "Tools & Equipment",
    brand: "DAB Pumps",
    price: 610,
    status: "active",
    description:
      "Submersible pump for dewatering and drainage of wastewater pits.",
  },
  {
    id: "domestic-circulator-pump",
    name: "Domestic Circulator Pump",
    sku: "DAB-PMP-CIR2",
    category: "Tools & Equipment",
    brand: "DAB Pumps",
    price: 285,
    status: "draft",
    description:
      "Wet-rotor circulator pump for domestic heating and hot water systems.",
  },
  {
    id: "polyethylene-water-tank-5000",
    name: "Polyethylene Water Storage Tank — 5,000L",
    sku: "AQP-TNK-5000",
    category: "Water Storage Tanks",
    brand: "Aquapa",
    price: 1620,
    status: "active",
    description:
      "Large-capacity rotomolded tank for ground-level water storage.",
  },
  {
    id: "angle-valve-hose-set",
    name: "Angle Valve & Flexible Hose Set",
    sku: "ALV-VLV-ANG3",
    category: "Sanitary Ware",
    brand: "Alvit",
    price: 95,
    status: "active",
    description:
      "Chrome angle valves with braided flexible hoses for basins and WCs.",
  },
  {
    id: "rain-shower-panel-system",
    name: "Rain Shower Panel System",
    sku: "QTB-SHW-RAIN",
    category: "Sanitary Ware",
    brand: "Quarterbath",
    price: 1150,
    status: "active",
    description:
      "Wall-mounted shower panel with rain head, hand shower, and body jets.",
  },
  {
    id: "galvanized-pipe-plain-end",
    name: "Galvanized Steel Pipe — Plain End",
    sku: "TRN-GST-PE100",
    category: "Galvanized Steel Pipes",
    brand: "Turan",
    price: 890,
    status: "active",
    description:
      "Hot-dip galvanized steel pipe with plain ends for welded assemblies.",
  },
  {
    id: "galvanized-flange-gasket-set",
    name: "Galvanized Flange & Gasket Set",
    sku: "NAS-GST-FLG2",
    category: "Galvanized Steel Pipes",
    brand: "NASSAR",
    price: 210,
    status: "draft",
    description:
      "Galvanized steel flanges with matching gaskets and bolt sets.",
  },
  {
    id: "grp-sectional-water-tank",
    name: "GRP Sectional Water Tank",
    sku: "GRI-TNK-GRP10",
    category: "Water Storage Tanks",
    brand: "Guaari",
    price: 3400,
    status: "active",
    description:
      "Glass-reinforced-plastic sectional tank assembled on-site for large storage volumes.",
  },
];

export function computeProductStats(items: Product[]) {
  const total = items.length;
  const active = items.filter((product) => product.status === "active").length;
  const categories = new Set(items.map((product) => product.category)).size;
  const avgPrice = total
    ? items.reduce((sum, product) => sum + product.price, 0) / total
    : 0;

  return { total, active, categories, avgPrice };
}

export function companyYearlyTotal(year: number): number {
  return year === previousYear
    ? company.previousYearToDateTotal
    : company.currentYearTotal;
}

export function companyMonthlyTotal(month: string): number {
  return revenueSeries.find((point) => point.month === month)?.current ?? 0;
}

/**
 * Distributes a person's year-to-date sales across a given year/month using
 * the company's actual monthly seasonal curve. Previous-year figures are
 * derived by reversing the overall YoY growth rate, so per-person and
 * company-wide totals stay reconciled.
 */
export function salesForPeriod(
  person: Salesperson,
  year: number,
  month: string | null
): number {
  const ytd =
    year === previousYear
      ? person.yearlySales / (1 + yoyGrowthPct / 100)
      : person.yearlySales;

  if (!month) return ytd;

  const point = revenueSeries.find((p) => p.month === month);
  if (!point) return ytd;

  return ytd * (point.current / company.currentYearTotal);
}

export type PeriodRankedPerson = {
  id: string;
  name: string;
  initials: string;
  value: number;
  contributionPct: number;
  rank: number;
};

export function computeRankingForPeriod(
  people: Salesperson[],
  year: number,
  month: string | null
): PeriodRankedPerson[] {
  const withValues = people.map((person) => ({
    id: person.id,
    name: person.name,
    initials: person.initials,
    value: salesForPeriod(person, year, month),
  }));

  const total = withValues.reduce((sum, person) => sum + person.value, 0);

  return withValues
    .sort((a, b) => b.value - a.value)
    .map((person, index) => ({
      ...person,
      rank: index + 1,
      contributionPct: total ? (person.value / total) * 100 : 0,
    }));
}
