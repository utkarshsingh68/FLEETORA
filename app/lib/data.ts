// Centralised, frontend-only data used across the Fleetora product surfaces.
// Dates are ISO-formatted so components can localise them without reparsing copy.

export type TrendDirection = "up" | "down" | "flat";
export type SemanticTone =
  | "blue"
  | "emerald"
  | "amber"
  | "red"
  | "violet"
  | "slate";
export type TripStatus =
  | "In transit"
  | "Scheduled"
  | "Loading"
  | "Delivered"
  | "Delayed";
export type VehicleStatus =
  | "On trip"
  | "Available"
  | "In service"
  | "Inactive";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const indianNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Formats a number as a full Indian Rupee value, e.g. ₹12,45,000. */
export function formatINR(value: number, maximumFractionDigits = 0) {
  if (maximumFractionDigits === 0) return inrFormatter.format(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

/** Formats large Rupee values in familiar Indian units, e.g. ₹1.24 Cr. */
export function formatCompactINR(value: number, decimals = 1) {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const compact = (divisor: number, suffix: string) => {
    const amount = (absoluteValue / divisor).toFixed(decimals).replace(/\.0+$/, "");
    return `${sign}₹${amount} ${suffix}`;
  };

  if (absoluteValue >= 10_000_000) return compact(10_000_000, "Cr");
  if (absoluteValue >= 100_000) return compact(100_000, "L");
  if (absoluteValue >= 1_000) return compact(1_000, "K");
  return `${sign}${inrFormatter.format(absoluteValue)}`;
}

/** Formats counts in the Indian numbering system, e.g. 1,25,000. */
export function formatIndianNumber(value: number) {
  return indianNumberFormatter.format(value);
}

/** Conventional alias used by table and card components. */
export const formatCurrency = formatINR;

export const companyProfile = {
  name: "Fleetora Logistics Pvt. Ltd.",
  shortName: "Fleetora",
  initials: "FL",
  branch: "Mumbai HQ",
  gstin: "27AAECF2847D1Z8",
  fleetCode: "FL-MH-01",
  financialYear: "FY 2026–27",
};

export type ModuleId =
  | "dashboard"
  | "fleet"
  | "drivers"
  | "trips"
  | "customers"
  | "vendors"
  | "finance"
  | "fuel"
  | "maintenance"
  | "documents"
  | "reports"
  | "notifications"
  | "settings"
  | "support";

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  href: string;
  icon: string;
  description: string;
  group: "Operations" | "Business" | "Workspace";
  shortcut?: string;
}

export const modules: ModuleMeta[] = [
  {
    id: "dashboard",
    label: "Overview",
    href: "/dashboard",
    icon: "LayoutDashboard",
    description: "Live performance and operational health",
    group: "Operations",
    shortcut: "G D",
  },
  {
    id: "fleet",
    label: "Fleet",
    href: "/fleet",
    icon: "Truck",
    description: "Vehicles, availability and compliance",
    group: "Operations",
    shortcut: "G F",
  },
  {
    id: "drivers",
    label: "Drivers",
    href: "/drivers",
    icon: "UsersRound",
    description: "Driver roster, attendance and performance",
    group: "Operations",
  },
  {
    id: "trips",
    label: "Trips",
    href: "/trips",
    icon: "Route",
    description: "Plan, dispatch and track every movement",
    group: "Operations",
    shortcut: "G T",
  },
  {
    id: "customers",
    label: "Customers",
    href: "/customers",
    icon: "Building2",
    description: "Accounts, credit and customer activity",
    group: "Business",
  },
  {
    id: "vendors",
    label: "Vendors",
    href: "/vendors",
    icon: "Handshake",
    description: "Supplier performance and outstanding bills",
    group: "Business",
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: "Landmark",
    description: "Revenue, expenses and receivables",
    group: "Business",
  },
  {
    id: "fuel",
    label: "Fuel",
    href: "/fuel",
    icon: "Fuel",
    description: "Fill-ups, mileage and fuel efficiency",
    group: "Business",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/maintenance",
    icon: "Wrench",
    description: "Service schedules, repairs and parts",
    group: "Business",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: "Files",
    description: "Vehicle and driver compliance records",
    group: "Business",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: "ChartNoAxesCombined",
    description: "Operational and financial exports",
    group: "Workspace",
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: "Bell",
    description: "Alerts requiring your attention",
    group: "Workspace",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "Settings2",
    description: "Company, users and preferences",
    group: "Workspace",
  },
  {
    id: "support",
    label: "Help & support",
    href: "/support",
    icon: "Headphones",
    description: "Support tickets and product guidance",
    group: "Workspace",
  },
];

export const sidebarGroups = [
  {
    label: "Operations",
    items: ["dashboard", "fleet", "drivers", "trips"] as ModuleId[],
  },
  {
    label: "Business",
    items: [
      "customers",
      "vendors",
      "finance",
      "fuel",
      "maintenance",
      "documents",
    ] as ModuleId[],
  },
  {
    label: "Workspace",
    items: ["reports", "notifications", "settings", "support"] as ModuleId[],
  },
];

export const quickActions = [
  {
    id: "create-trip",
    label: "Create trip",
    description: "Plan a new shipment",
    href: "/trips?new=true",
    icon: "Route",
    shortcut: "C T",
    tone: "blue" as SemanticTone,
  },
  {
    id: "add-driver",
    label: "Add driver",
    description: "Create a driver profile",
    href: "/drivers?new=true",
    icon: "UserPlus",
    shortcut: "A D",
    tone: "violet" as SemanticTone,
  },
  {
    id: "add-truck",
    label: "Add truck",
    description: "Register a fleet vehicle",
    href: "/fleet?new=true",
    icon: "Truck",
    shortcut: "A V",
    tone: "emerald" as SemanticTone,
  },
  {
    id: "generate-invoice",
    label: "Generate invoice",
    description: "Bill a completed trip",
    href: "/finance?new=invoice",
    icon: "ReceiptText",
    shortcut: "G I",
    tone: "amber" as SemanticTone,
  },
];

export interface DashboardKpi {
  id: string;
  label: string;
  rawValue: number;
  value: string;
  change: number;
  direction: TrendDirection;
  comparison: string;
  icon: string;
  tone: SemanticTone;
}

export const dashboardKpis: DashboardKpi[] = [
  {
    id: "revenue",
    label: "Revenue this month",
    rawValue: 8_640_000,
    value: formatCompactINR(8_640_000, 2),
    change: 12.8,
    direction: "up",
    comparison: "vs last month",
    icon: "IndianRupee",
    tone: "blue",
  },
  {
    id: "active-trips",
    label: "Running trips",
    rawValue: 27,
    value: "27",
    change: 8.3,
    direction: "up",
    comparison: "2 more today",
    icon: "Navigation",
    tone: "violet",
  },
  {
    id: "fleet-availability",
    label: "Truck availability",
    rawValue: 84,
    value: "84%",
    change: 3.1,
    direction: "up",
    comparison: "42 of 50 available",
    icon: "Truck",
    tone: "emerald",
  },
  {
    id: "receivables",
    label: "Pending payments",
    rawValue: 2_480_000,
    value: formatCompactINR(2_480_000, 2),
    change: 6.4,
    direction: "down",
    comparison: "vs last month",
    icon: "Clock3",
    tone: "amber",
  },
  {
    id: "total-trucks",
    label: "Total trucks",
    rawValue: 50,
    value: "50",
    change: 4.2,
    direction: "up",
    comparison: "2 added this quarter",
    icon: "Container",
    tone: "blue",
  },
  {
    id: "completed-trips",
    label: "Completed trips",
    rawValue: 186,
    value: "186",
    change: 10.7,
    direction: "up",
    comparison: "this month",
    icon: "CircleCheckBig",
    tone: "emerald",
  },
  {
    id: "monthly-profit",
    label: "Monthly profit",
    rawValue: 1_862_000,
    value: formatCompactINR(1_862_000, 2),
    change: 9.6,
    direction: "up",
    comparison: "21.6% margin",
    icon: "TrendingUp",
    tone: "emerald",
  },
  {
    id: "fuel-cost",
    label: "Fuel cost",
    rawValue: 2_240_000,
    value: formatCompactINR(2_240_000, 2),
    change: 2.7,
    direction: "down",
    comparison: "cost per km improved",
    icon: "Fuel",
    tone: "amber",
  },
  {
    id: "today-expenses",
    label: "Today’s expenses",
    rawValue: 186_420,
    value: formatCompactINR(186_420, 2),
    change: 4.1,
    direction: "down",
    comparison: "vs daily average",
    icon: "WalletCards",
    tone: "red",
  },
  {
    id: "today-trips",
    label: "Today’s trips",
    rawValue: 14,
    value: "14",
    change: 16.7,
    direction: "up",
    comparison: "12 dispatched",
    icon: "MapPinned",
    tone: "violet",
  },
  {
    id: "driver-availability",
    label: "Driver availability",
    rawValue: 78,
    value: "78%",
    change: 1.8,
    direction: "up",
    comparison: "78 of 100 available",
    icon: "BadgeCheck",
    tone: "blue",
  },
];

export interface MonthlyPerformancePoint {
  month: string;
  revenue: number;
  profit: number;
  expenses: number;
  fuel: number;
  trips: number;
}

export const monthlyPerformance: MonthlyPerformancePoint[] = [
  { month: "Aug", revenue: 6_420_000, profit: 1_160_000, expenses: 5_260_000, fuel: 1_710_000, trips: 142 },
  { month: "Sep", revenue: 6_780_000, profit: 1_280_000, expenses: 5_500_000, fuel: 1_790_000, trips: 149 },
  { month: "Oct", revenue: 7_360_000, profit: 1_510_000, expenses: 5_850_000, fuel: 1_890_000, trips: 161 },
  { month: "Nov", revenue: 7_040_000, profit: 1_390_000, expenses: 5_650_000, fuel: 1_840_000, trips: 156 },
  { month: "Dec", revenue: 7_820_000, profit: 1_640_000, expenses: 6_180_000, fuel: 2_020_000, trips: 173 },
  { month: "Jan", revenue: 7_580_000, profit: 1_520_000, expenses: 6_060_000, fuel: 1_970_000, trips: 168 },
  { month: "Feb", revenue: 7_910_000, profit: 1_680_000, expenses: 6_230_000, fuel: 2_030_000, trips: 174 },
  { month: "Mar", revenue: 8_260_000, profit: 1_770_000, expenses: 6_490_000, fuel: 2_120_000, trips: 181 },
  { month: "Apr", revenue: 8_040_000, profit: 1_710_000, expenses: 6_330_000, fuel: 2_080_000, trips: 177 },
  { month: "May", revenue: 8_320_000, profit: 1_790_000, expenses: 6_530_000, fuel: 2_160_000, trips: 182 },
  { month: "Jun", revenue: 8_470_000, profit: 1_810_000, expenses: 6_660_000, fuel: 2_190_000, trips: 183 },
  { month: "Jul", revenue: 8_640_000, profit: 1_862_000, expenses: 6_778_000, fuel: 2_240_000, trips: 186 },
];

export const weeklyTripVolume = [
  { day: "Mon", completed: 11, active: 4 },
  { day: "Tue", completed: 14, active: 5 },
  { day: "Wed", completed: 12, active: 7 },
  { day: "Thu", completed: 16, active: 6 },
  { day: "Fri", completed: 15, active: 8 },
  { day: "Sat", completed: 10, active: 5 },
  { day: "Sun", completed: 8, active: 3 },
];

export const tripStatusBreakdown = [
  { label: "Delivered", value: 186, percentage: 72, color: "#16A34A" },
  { label: "In transit", value: 27, percentage: 11, color: "#2563EB" },
  { label: "Scheduled", value: 22, percentage: 9, color: "#8B5CF6" },
  { label: "Loading", value: 13, percentage: 5, color: "#F59E0B" },
  { label: "Delayed", value: 7, percentage: 3, color: "#DC2626" },
];

export const expenseMix = [
  { label: "Fuel", value: 2_240_000, percentage: 33, color: "#2563EB" },
  { label: "Driver & toll", value: 1_624_000, percentage: 24, color: "#8B5CF6" },
  { label: "Maintenance", value: 1_218_000, percentage: 18, color: "#F59E0B" },
  { label: "Payroll", value: 1_016_000, percentage: 15, color: "#16A34A" },
  { label: "Other", value: 680_000, percentage: 10, color: "#94A3B8" },
];

export const chartSeries = {
  monthlyPerformance,
  weeklyTripVolume,
  tripStatusBreakdown,
  expenseMix,
};

export const revenueSeries = monthlyPerformance;

export interface TripRow {
  id: string;
  lrNumber: string;
  origin: string;
  destination: string;
  route: string;
  customer: string;
  vehicle: string;
  driver: string;
  startDate: string;
  eta: string;
  revenue: number;
  expenses: number;
  profit: number;
  progress: number;
  status: TripStatus;
  cargo: string;
}

export const recentTrips: TripRow[] = [
  {
    id: "TRP-2607148",
    lrNumber: "FLR/MUM/78412",
    origin: "Mumbai, MH",
    destination: "Bengaluru, KA",
    route: "Mumbai → Bengaluru",
    customer: "Tata Consumer Products",
    vehicle: "MH 04 KU 7281",
    driver: "Ramesh Yadav",
    startDate: "2026-07-09T06:30:00+05:30",
    eta: "2026-07-11T15:30:00+05:30",
    revenue: 92_500,
    expenses: 62_800,
    profit: 29_700,
    progress: 68,
    status: "In transit",
    cargo: "Packaged foods · 16.4 T",
  },
  {
    id: "TRP-2607147",
    lrNumber: "FLR/PUN/78408",
    origin: "Pune, MH",
    destination: "Hyderabad, TS",
    route: "Pune → Hyderabad",
    customer: "Crompton Greaves",
    vehicle: "MH 12 VX 4419",
    driver: "Iqbal Sheikh",
    startDate: "2026-07-09T09:15:00+05:30",
    eta: "2026-07-10T18:00:00+05:30",
    revenue: 68_400,
    expenses: 45_120,
    profit: 23_280,
    progress: 82,
    status: "In transit",
    cargo: "Electrical goods · 11.8 T",
  },
  {
    id: "TRP-2607146",
    lrNumber: "FLR/AHM/78405",
    origin: "Ahmedabad, GJ",
    destination: "Jaipur, RJ",
    route: "Ahmedabad → Jaipur",
    customer: "Pidilite Industries",
    vehicle: "GJ 01 JT 6027",
    driver: "Mahesh Patel",
    startDate: "2026-07-10T05:45:00+05:30",
    eta: "2026-07-11T09:00:00+05:30",
    revenue: 54_800,
    expenses: 37_600,
    profit: 17_200,
    progress: 31,
    status: "In transit",
    cargo: "Industrial adhesives · 9.6 T",
  },
  {
    id: "TRP-2607145",
    lrNumber: "FLR/DEL/78401",
    origin: "Delhi, DL",
    destination: "Ludhiana, PB",
    route: "Delhi → Ludhiana",
    customer: "Havells India",
    vehicle: "HR 55 AN 3188",
    driver: "Surinder Singh",
    startDate: "2026-07-10T13:00:00+05:30",
    eta: "2026-07-11T01:30:00+05:30",
    revenue: 38_600,
    expenses: 24_900,
    profit: 13_700,
    progress: 0,
    status: "Loading",
    cargo: "Consumer electricals · 7.2 T",
  },
  {
    id: "TRP-2607144",
    lrNumber: "FLR/CHE/78396",
    origin: "Chennai, TN",
    destination: "Kochi, KL",
    route: "Chennai → Kochi",
    customer: "Asian Paints",
    vehicle: "TN 09 CQ 8754",
    driver: "Arun Kumar",
    startDate: "2026-07-10T17:30:00+05:30",
    eta: "2026-07-11T17:00:00+05:30",
    revenue: 61_200,
    expenses: 42_300,
    profit: 18_900,
    progress: 0,
    status: "Scheduled",
    cargo: "Decorative coatings · 12.5 T",
  },
  {
    id: "TRP-2607143",
    lrNumber: "FLR/NAG/78392",
    origin: "Nagpur, MH",
    destination: "Raipur, CG",
    route: "Nagpur → Raipur",
    customer: "JSW Steel Processing",
    vehicle: "MH 31 FC 2906",
    driver: "Dinesh Sahu",
    startDate: "2026-07-08T08:00:00+05:30",
    eta: "2026-07-09T16:30:00+05:30",
    revenue: 47_500,
    expenses: 33_180,
    profit: 14_320,
    progress: 100,
    status: "Delivered",
    cargo: "Steel coils · 19.2 T",
  },
  {
    id: "TRP-2607142",
    lrNumber: "FLR/SUR/78389",
    origin: "Surat, GJ",
    destination: "Indore, MP",
    route: "Surat → Indore",
    customer: "Reliance Retail",
    vehicle: "GJ 05 CZ 1142",
    driver: "Prakash Chouhan",
    startDate: "2026-07-09T04:30:00+05:30",
    eta: "2026-07-10T11:00:00+05:30",
    revenue: 58_900,
    expenses: 41_700,
    profit: 17_200,
    progress: 76,
    status: "Delayed",
    cargo: "FMCG mixed load · 13.1 T",
  },
  {
    id: "TRP-2607141",
    lrNumber: "FLR/KOL/78385",
    origin: "Kolkata, WB",
    destination: "Bhubaneswar, OD",
    route: "Kolkata → Bhubaneswar",
    customer: "Berger Paints India",
    vehicle: "WB 23 E 9086",
    driver: "Subhash Mondal",
    startDate: "2026-07-08T11:00:00+05:30",
    eta: "2026-07-09T13:30:00+05:30",
    revenue: 51_300,
    expenses: 35_400,
    profit: 15_900,
    progress: 100,
    status: "Delivered",
    cargo: "Emulsion paint · 10.7 T",
  },
];

export type ExpiryUrgency = "Critical" | "Due soon" | "Healthy";

export interface DocumentExpiry {
  id: string;
  documentType: "Insurance" | "Permit" | "Fitness" | "PUC" | "Tax" | "License";
  asset: string;
  owner: string;
  expiryDate: string;
  daysLeft: number;
  urgency: ExpiryUrgency;
}

export const documentExpiries: DocumentExpiry[] = [
  {
    id: "EXP-1048",
    documentType: "Fitness",
    asset: "MH 04 KU 7281",
    owner: "Fleet vehicle",
    expiryDate: "2026-07-13",
    daysLeft: 3,
    urgency: "Critical",
  },
  {
    id: "EXP-1047",
    documentType: "PUC",
    asset: "GJ 01 JT 6027",
    owner: "Fleet vehicle",
    expiryDate: "2026-07-15",
    daysLeft: 5,
    urgency: "Critical",
  },
  {
    id: "EXP-1046",
    documentType: "License",
    asset: "Ramesh Yadav",
    owner: "Driver · DRV-0084",
    expiryDate: "2026-07-19",
    daysLeft: 9,
    urgency: "Due soon",
  },
  {
    id: "EXP-1045",
    documentType: "Insurance",
    asset: "HR 55 AN 3188",
    owner: "Fleet vehicle",
    expiryDate: "2026-07-24",
    daysLeft: 14,
    urgency: "Due soon",
  },
  {
    id: "EXP-1044",
    documentType: "Permit",
    asset: "TN 09 CQ 8754",
    owner: "National permit",
    expiryDate: "2026-07-31",
    daysLeft: 21,
    urgency: "Due soon",
  },
  {
    id: "EXP-1043",
    documentType: "Tax",
    asset: "MH 12 VX 4419",
    owner: "Fleet vehicle",
    expiryDate: "2026-08-18",
    daysLeft: 39,
    urgency: "Healthy",
  },
];

export type NotificationKind =
  | "trip"
  | "document"
  | "payment"
  | "driver"
  | "maintenance";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  unread: boolean;
  href: string;
  tone: SemanticTone;
}

export const notifications: NotificationItem[] = [
  {
    id: "NOT-2901",
    kind: "trip",
    title: "Truck reached Bengaluru hub",
    description: "TRP-2607148 crossed Nelamangala and is on schedule for unloading.",
    timestamp: "2026-07-10T15:42:00+05:30",
    relativeTime: "8 min ago",
    unread: true,
    href: "/trips/TRP-2607148",
    tone: "blue",
  },
  {
    id: "NOT-2900",
    kind: "payment",
    title: "Payment received",
    description: "₹2,84,600 received from Reliance Retail against INV-261184.",
    timestamp: "2026-07-10T14:28:00+05:30",
    relativeTime: "1 hr ago",
    unread: true,
    href: "/finance",
    tone: "emerald",
  },
  {
    id: "NOT-2899",
    kind: "document",
    title: "Fitness certificate expires in 3 days",
    description: "Renewal is due for MH 04 KU 7281 before 13 Jul 2026.",
    timestamp: "2026-07-10T12:15:00+05:30",
    relativeTime: "3 hrs ago",
    unread: true,
    href: "/documents",
    tone: "red",
  },
  {
    id: "NOT-2898",
    kind: "trip",
    title: "Trip delay detected",
    description: "TRP-2607142 is 2 hr 20 min behind ETA near Dhule due to heavy rain.",
    timestamp: "2026-07-10T11:06:00+05:30",
    relativeTime: "4 hrs ago",
    unread: true,
    href: "/trips/TRP-2607142",
    tone: "amber",
  },
  {
    id: "NOT-2897",
    kind: "maintenance",
    title: "Preventive service completed",
    description: "Oil and filter service closed for MH 14 JL 5560 at 84,210 km.",
    timestamp: "2026-07-10T09:40:00+05:30",
    relativeTime: "6 hrs ago",
    unread: false,
    href: "/maintenance",
    tone: "emerald",
  },
  {
    id: "NOT-2896",
    kind: "driver",
    title: "Driver duty-hour warning",
    description: "Iqbal Sheikh reaches the 10-hour driving threshold in 45 minutes.",
    timestamp: "2026-07-10T08:22:00+05:30",
    relativeTime: "7 hrs ago",
    unread: false,
    href: "/drivers/DRV-0071",
    tone: "amber",
  },
];

export const recentPayments = [
  {
    id: "PAY-261920",
    customer: "Reliance Retail",
    invoice: "INV-261184",
    amount: 284_600,
    method: "NEFT",
    receivedAt: "2026-07-10T14:28:00+05:30",
    status: "Received" as const,
  },
  {
    id: "PAY-261919",
    customer: "Asian Paints",
    invoice: "INV-261172",
    amount: 178_400,
    method: "RTGS",
    receivedAt: "2026-07-10T10:12:00+05:30",
    status: "Received" as const,
  },
  {
    id: "PAY-261918",
    customer: "Havells India",
    invoice: "INV-261165",
    amount: 96_800,
    method: "Bank transfer",
    receivedAt: "2026-07-09T16:44:00+05:30",
    status: "Received" as const,
  },
  {
    id: "PAY-261917",
    customer: "Crompton Greaves",
    invoice: "INV-261160",
    amount: 142_250,
    method: "Cheque",
    receivedAt: "2026-07-09T11:18:00+05:30",
    status: "Processing" as const,
  },
];

export interface FleetRow {
  id: string;
  vehicleNumber: string;
  model: string;
  manufacturer: string;
  type: string;
  capacityTons: number;
  year: number;
  status: VehicleStatus;
  driver: string | null;
  driverId: string | null;
  currentLocation: string;
  lastUpdated: string;
  odometerKm: number;
  fuelLevel: number;
  mileageKmpl: number;
  utilization: number;
  insuranceExpiry: string;
  permitExpiry: string;
  fitnessExpiry: string;
  nextServiceKm: number;
}

export const fleetRows: FleetRow[] = [
  {
    id: "VEH-0050",
    vehicleNumber: "MH 04 KU 7281",
    model: "Blazo X 42",
    manufacturer: "Mahindra",
    type: "32 ft multi-axle",
    capacityTons: 25,
    year: 2023,
    status: "On trip",
    driver: "Ramesh Yadav",
    driverId: "DRV-0084",
    currentLocation: "Nelamangala, Karnataka",
    lastUpdated: "2026-07-10T15:42:00+05:30",
    odometerKm: 126_840,
    fuelLevel: 42,
    mileageKmpl: 4.1,
    utilization: 91,
    insuranceExpiry: "2027-01-18",
    permitExpiry: "2026-11-24",
    fitnessExpiry: "2026-07-13",
    nextServiceKm: 3_160,
  },
  {
    id: "VEH-0049",
    vehicleNumber: "MH 12 VX 4419",
    model: "Prima 5530.S",
    manufacturer: "Tata Motors",
    type: "Tractor trailer",
    capacityTons: 35,
    year: 2024,
    status: "On trip",
    driver: "Iqbal Sheikh",
    driverId: "DRV-0071",
    currentLocation: "Zaheerabad, Telangana",
    lastUpdated: "2026-07-10T15:31:00+05:30",
    odometerKm: 86_540,
    fuelLevel: 58,
    mileageKmpl: 3.8,
    utilization: 94,
    insuranceExpiry: "2027-03-09",
    permitExpiry: "2026-12-16",
    fitnessExpiry: "2027-03-14",
    nextServiceKm: 5_460,
  },
  {
    id: "VEH-0048",
    vehicleNumber: "GJ 01 JT 6027",
    model: "Eicher Pro 6048",
    manufacturer: "VE Commercial",
    type: "High-side deck",
    capacityTons: 28,
    year: 2022,
    status: "On trip",
    driver: "Mahesh Patel",
    driverId: "DRV-0065",
    currentLocation: "Himmatnagar, Gujarat",
    lastUpdated: "2026-07-10T15:26:00+05:30",
    odometerKm: 174_280,
    fuelLevel: 67,
    mileageKmpl: 4.3,
    utilization: 88,
    insuranceExpiry: "2026-10-02",
    permitExpiry: "2027-02-21",
    fitnessExpiry: "2026-11-08",
    nextServiceKm: 720,
  },
  {
    id: "VEH-0047",
    vehicleNumber: "HR 55 AN 3188",
    model: "5525 6x4",
    manufacturer: "BharatBenz",
    type: "Container carrier",
    capacityTons: 30,
    year: 2021,
    status: "Available",
    driver: "Surinder Singh",
    driverId: "DRV-0059",
    currentLocation: "Fleetora Delhi Yard",
    lastUpdated: "2026-07-10T14:54:00+05:30",
    odometerKm: 231_960,
    fuelLevel: 81,
    mileageKmpl: 3.9,
    utilization: 84,
    insuranceExpiry: "2026-07-24",
    permitExpiry: "2026-09-30",
    fitnessExpiry: "2026-12-04",
    nextServiceKm: 4_040,
  },
  {
    id: "VEH-0046",
    vehicleNumber: "TN 09 CQ 8754",
    model: "AVTR 4825",
    manufacturer: "Ashok Leyland",
    type: "32 ft container",
    capacityTons: 24,
    year: 2023,
    status: "Available",
    driver: "Arun Kumar",
    driverId: "DRV-0052",
    currentLocation: "Oragadam, Chennai",
    lastUpdated: "2026-07-10T15:08:00+05:30",
    odometerKm: 118_620,
    fuelLevel: 76,
    mileageKmpl: 4.4,
    utilization: 89,
    insuranceExpiry: "2027-02-08",
    permitExpiry: "2026-07-31",
    fitnessExpiry: "2027-01-22",
    nextServiceKm: 1_380,
  },
  {
    id: "VEH-0045",
    vehicleNumber: "MH 31 FC 2906",
    model: "Signa 4825.TK",
    manufacturer: "Tata Motors",
    type: "Tipper",
    capacityTons: 29,
    year: 2022,
    status: "Available",
    driver: "Dinesh Sahu",
    driverId: "DRV-0048",
    currentLocation: "Wadi, Nagpur",
    lastUpdated: "2026-07-10T14:38:00+05:30",
    odometerKm: 162_140,
    fuelLevel: 64,
    mileageKmpl: 3.7,
    utilization: 82,
    insuranceExpiry: "2026-12-11",
    permitExpiry: "2027-01-06",
    fitnessExpiry: "2026-10-19",
    nextServiceKm: 2_860,
  },
  {
    id: "VEH-0044",
    vehicleNumber: "GJ 05 CZ 1142",
    model: "Pro 6028T",
    manufacturer: "Eicher",
    type: "Closed-body truck",
    capacityTons: 18,
    year: 2020,
    status: "On trip",
    driver: "Prakash Chouhan",
    driverId: "DRV-0041",
    currentLocation: "Dhule, Maharashtra",
    lastUpdated: "2026-07-10T15:47:00+05:30",
    odometerKm: 284_510,
    fuelLevel: 35,
    mileageKmpl: 4.2,
    utilization: 79,
    insuranceExpiry: "2026-09-17",
    permitExpiry: "2026-11-28",
    fitnessExpiry: "2026-08-22",
    nextServiceKm: 490,
  },
  {
    id: "VEH-0043",
    vehicleNumber: "WB 23 E 9086",
    model: "AVTR 4120",
    manufacturer: "Ashok Leyland",
    type: "Open-body truck",
    capacityTons: 21,
    year: 2021,
    status: "Available",
    driver: "Subhash Mondal",
    driverId: "DRV-0036",
    currentLocation: "Dankuni, West Bengal",
    lastUpdated: "2026-07-10T13:19:00+05:30",
    odometerKm: 214_770,
    fuelLevel: 72,
    mileageKmpl: 4,
    utilization: 81,
    insuranceExpiry: "2026-11-04",
    permitExpiry: "2027-02-14",
    fitnessExpiry: "2026-12-29",
    nextServiceKm: 5_230,
  },
  {
    id: "VEH-0042",
    vehicleNumber: "MH 14 JL 5560",
    model: "Furio 17",
    manufacturer: "Mahindra",
    type: "20 ft container",
    capacityTons: 11,
    year: 2024,
    status: "In service",
    driver: null,
    driverId: null,
    currentLocation: "Bhosari Workshop, Pune",
    lastUpdated: "2026-07-10T09:40:00+05:30",
    odometerKm: 84_210,
    fuelLevel: 48,
    mileageKmpl: 6.2,
    utilization: 73,
    insuranceExpiry: "2027-04-12",
    permitExpiry: "2027-01-09",
    fitnessExpiry: "2027-04-18",
    nextServiceKm: 10_000,
  },
  {
    id: "VEH-0041",
    vehicleNumber: "KA 51 MN 7432",
    model: "1916 LPT",
    manufacturer: "Tata Motors",
    type: "22 ft high-side",
    capacityTons: 12,
    year: 2019,
    status: "Inactive",
    driver: null,
    driverId: null,
    currentLocation: "Bommasandra Yard, Bengaluru",
    lastUpdated: "2026-07-08T18:20:00+05:30",
    odometerKm: 368_420,
    fuelLevel: 18,
    mileageKmpl: 5.4,
    utilization: 61,
    insuranceExpiry: "2026-08-06",
    permitExpiry: "2026-08-12",
    fitnessExpiry: "2026-08-03",
    nextServiceKm: 580,
  },
];

export type DriverStatus = "On trip" | "Available" | "On leave" | "Off duty";

export interface DriverRow {
  id: string;
  name: string;
  initials: string;
  phone: string;
  base: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  assignedVehicle: string | null;
  rating: number;
  completedTrips: number;
  onTimeRate: number;
  attendanceRate: number;
  monthlySalary: number;
  joinedDate: string;
  emergencyContact: string;
}

export const driverRows: DriverRow[] = [
  { id: "DRV-0084", name: "Ramesh Yadav", initials: "RY", phone: "+91 98765 24108", base: "Mumbai", licenseNumber: "MH1420150049821", licenseExpiry: "2026-07-19", status: "On trip", assignedVehicle: "MH 04 KU 7281", rating: 4.9, completedTrips: 286, onTimeRate: 96, attendanceRate: 98, monthlySalary: 38_500, joinedDate: "2021-04-12", emergencyContact: "+91 97654 88420" },
  { id: "DRV-0071", name: "Iqbal Sheikh", initials: "IS", phone: "+91 98209 67154", base: "Pune", licenseNumber: "MH1220140061732", licenseExpiry: "2027-01-24", status: "On trip", assignedVehicle: "MH 12 VX 4419", rating: 4.8, completedTrips: 241, onTimeRate: 94, attendanceRate: 97, monthlySalary: 40_200, joinedDate: "2020-11-03", emergencyContact: "+91 98907 33218" },
  { id: "DRV-0065", name: "Mahesh Patel", initials: "MP", phone: "+91 98981 40762", base: "Ahmedabad", licenseNumber: "GJ0120160074228", licenseExpiry: "2028-06-18", status: "On trip", assignedVehicle: "GJ 01 JT 6027", rating: 4.7, completedTrips: 198, onTimeRate: 92, attendanceRate: 96, monthlySalary: 37_800, joinedDate: "2022-02-15", emergencyContact: "+91 97254 11087" },
  { id: "DRV-0059", name: "Surinder Singh", initials: "SS", phone: "+91 98104 82614", base: "Delhi", licenseNumber: "DL0420130096241", licenseExpiry: "2027-09-05", status: "Available", assignedVehicle: "HR 55 AN 3188", rating: 4.9, completedTrips: 318, onTimeRate: 97, attendanceRate: 99, monthlySalary: 42_000, joinedDate: "2019-08-21", emergencyContact: "+91 99712 40566" },
  { id: "DRV-0052", name: "Arun Kumar", initials: "AK", phone: "+91 98403 71925", base: "Chennai", licenseNumber: "TN0920170062185", licenseExpiry: "2029-02-12", status: "Available", assignedVehicle: "TN 09 CQ 8754", rating: 4.8, completedTrips: 174, onTimeRate: 95, attendanceRate: 97, monthlySalary: 38_900, joinedDate: "2022-07-08", emergencyContact: "+91 94442 16877" },
  { id: "DRV-0048", name: "Dinesh Sahu", initials: "DS", phone: "+91 98233 65018", base: "Nagpur", licenseNumber: "MH3120140081550", licenseExpiry: "2026-12-28", status: "Off duty", assignedVehicle: "MH 31 FC 2906", rating: 4.6, completedTrips: 265, onTimeRate: 91, attendanceRate: 95, monthlySalary: 37_500, joinedDate: "2020-01-19", emergencyContact: "+91 93011 77628" },
  { id: "DRV-0041", name: "Prakash Chouhan", initials: "PC", phone: "+91 99742 38196", base: "Surat", licenseNumber: "GJ0520150056419", licenseExpiry: "2027-04-07", status: "On trip", assignedVehicle: "GJ 05 CZ 1142", rating: 4.5, completedTrips: 223, onTimeRate: 89, attendanceRate: 94, monthlySalary: 36_800, joinedDate: "2021-09-16", emergencyContact: "+91 98252 61743" },
  { id: "DRV-0036", name: "Subhash Mondal", initials: "SM", phone: "+91 98311 62048", base: "Kolkata", licenseNumber: "WB2320130074260", licenseExpiry: "2028-11-21", status: "Available", assignedVehicle: "WB 23 E 9086", rating: 4.8, completedTrips: 302, onTimeRate: 95, attendanceRate: 98, monthlySalary: 39_600, joinedDate: "2019-12-02", emergencyContact: "+91 98743 88109" },
  { id: "DRV-0029", name: "Naveen Gowda", initials: "NG", phone: "+91 98862 40571", base: "Bengaluru", licenseNumber: "KA5120180029654", licenseExpiry: "2030-03-14", status: "On leave", assignedVehicle: null, rating: 4.7, completedTrips: 148, onTimeRate: 93, attendanceRate: 92, monthlySalary: 37_200, joinedDate: "2023-01-23", emergencyContact: "+91 98455 39281" },
  { id: "DRV-0024", name: "Faisal Khan", initials: "FK", phone: "+91 97001 55842", base: "Hyderabad", licenseNumber: "TS0920170048610", licenseExpiry: "2029-07-30", status: "Available", assignedVehicle: null, rating: 4.6, completedTrips: 166, onTimeRate: 92, attendanceRate: 96, monthlySalary: 36_900, joinedDate: "2022-10-11", emergencyContact: "+91 99490 21388" },
];

export type CustomerStatus = "Active" | "Review" | "On hold";

export interface CustomerRow {
  id: string;
  company: string;
  initials: string;
  industry: string;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  creditLimit: number;
  outstanding: number;
  activeTrips: number;
  completedTrips: number;
  revenueYtd: number;
  paymentTerms: string;
  status: CustomerStatus;
}

export const customerRows: CustomerRow[] = [
  { id: "CUS-0300", company: "Reliance Retail Ltd.", initials: "RR", industry: "Retail & FMCG", city: "Mumbai", contactName: "Neha Mehta", phone: "+91 98200 18473", email: "neha.mehta@relianceretail.in", creditLimit: 5_000_000, outstanding: 1_184_600, activeTrips: 6, completedTrips: 214, revenueYtd: 8_420_000, paymentTerms: "30 days", status: "Active" },
  { id: "CUS-0294", company: "Asian Paints Ltd.", initials: "AP", industry: "Paints & coatings", city: "Mumbai", contactName: "Kunal Deshpande", phone: "+91 99302 81640", email: "kunal.d@asianpaints.com", creditLimit: 4_000_000, outstanding: 842_300, activeTrips: 4, completedTrips: 186, revenueYtd: 7_180_000, paymentTerms: "30 days", status: "Active" },
  { id: "CUS-0288", company: "Tata Consumer Products", initials: "TC", industry: "Food & beverages", city: "Bengaluru", contactName: "Aditi Rao", phone: "+91 99020 64182", email: "aditi.rao@tataconsumer.com", creditLimit: 4_500_000, outstanding: 624_800, activeTrips: 5, completedTrips: 172, revenueYtd: 6_940_000, paymentTerms: "45 days", status: "Active" },
  { id: "CUS-0281", company: "Havells India Ltd.", initials: "HI", industry: "Electrical equipment", city: "Noida", contactName: "Rohit Bansal", phone: "+91 98108 62715", email: "rohit.bansal@havells.com", creditLimit: 3_200_000, outstanding: 918_250, activeTrips: 3, completedTrips: 144, revenueYtd: 5_620_000, paymentTerms: "30 days", status: "Active" },
  { id: "CUS-0276", company: "Pidilite Industries", initials: "PI", industry: "Specialty chemicals", city: "Ahmedabad", contactName: "Jignesh Shah", phone: "+91 98250 39518", email: "jignesh.shah@pidilite.com", creditLimit: 2_800_000, outstanding: 412_700, activeTrips: 2, completedTrips: 119, revenueYtd: 4_380_000, paymentTerms: "30 days", status: "Active" },
  { id: "CUS-0269", company: "Crompton Greaves Consumer", initials: "CG", industry: "Consumer durables", city: "Pune", contactName: "Mitali Joshi", phone: "+91 97662 80145", email: "mitali.joshi@crompton.co.in", creditLimit: 2_500_000, outstanding: 736_500, activeTrips: 3, completedTrips: 108, revenueYtd: 3_920_000, paymentTerms: "45 days", status: "Review" },
  { id: "CUS-0258", company: "Berger Paints India", initials: "BP", industry: "Paints & coatings", city: "Kolkata", contactName: "Sourav Sen", phone: "+91 98306 17492", email: "sourav.sen@bergerindia.com", creditLimit: 3_000_000, outstanding: 385_100, activeTrips: 2, completedTrips: 127, revenueYtd: 4_710_000, paymentTerms: "30 days", status: "Active" },
  { id: "CUS-0247", company: "JSW Steel Processing", initials: "JS", industry: "Steel & metals", city: "Mumbai", contactName: "Vinay Kulkarni", phone: "+91 98670 42813", email: "vinay.kulkarni@jsw.in", creditLimit: 5_500_000, outstanding: 1_862_000, activeTrips: 2, completedTrips: 96, revenueYtd: 6_180_000, paymentTerms: "60 days", status: "On hold" },
];

export type FinanceEntryType = "Income" | "Expense";
export type LedgerStatus = "Cleared" | "Pending" | "Overdue";

export interface FinanceEntry {
  id: string;
  date: string;
  type: FinanceEntryType;
  category: string;
  reference: string;
  counterparty: string;
  amount: number;
  paymentMode: string;
  status: LedgerStatus;
}

export const financeEntries: FinanceEntry[] = [
  { id: "FIN-6621", date: "2026-07-10", type: "Income", category: "Freight revenue", reference: "INV-261184", counterparty: "Reliance Retail Ltd.", amount: 284_600, paymentMode: "NEFT", status: "Cleared" },
  { id: "FIN-6620", date: "2026-07-10", type: "Expense", category: "Fuel", reference: "FUE-9841", counterparty: "IndianOil — Khalapur", amount: 68_950, paymentMode: "Fleet card", status: "Cleared" },
  { id: "FIN-6619", date: "2026-07-10", type: "Expense", category: "Toll & FASTag", reference: "TAG-71840", counterparty: "ICICI FASTag", amount: 24_780, paymentMode: "Wallet", status: "Cleared" },
  { id: "FIN-6618", date: "2026-07-10", type: "Income", category: "Freight revenue", reference: "INV-261172", counterparty: "Asian Paints Ltd.", amount: 178_400, paymentMode: "RTGS", status: "Cleared" },
  { id: "FIN-6617", date: "2026-07-09", type: "Expense", category: "Maintenance", reference: "MNT-2185", counterparty: "Shree Auto Works", amount: 42_600, paymentMode: "Bank transfer", status: "Pending" },
  { id: "FIN-6616", date: "2026-07-09", type: "Income", category: "Freight revenue", reference: "INV-261160", counterparty: "Crompton Greaves Consumer", amount: 142_250, paymentMode: "Cheque", status: "Pending" },
  { id: "FIN-6615", date: "2026-07-08", type: "Expense", category: "Driver advance", reference: "ADV-4428", counterparty: "Ramesh Yadav", amount: 18_000, paymentMode: "UPI", status: "Cleared" },
  { id: "FIN-6614", date: "2026-07-07", type: "Income", category: "Detention charge", reference: "DN-260418", counterparty: "JSW Steel Processing", amount: 34_500, paymentMode: "Bank transfer", status: "Overdue" },
];

export interface FuelEntry {
  id: string;
  date: string;
  vehicle: string;
  driver: string;
  station: string;
  city: string;
  litres: number;
  pricePerLitre: number;
  amount: number;
  odometerKm: number;
  mileageKmpl: number;
  paymentMethod: string;
}

export const fuelEntries: FuelEntry[] = [
  { id: "FUE-9841", date: "2026-07-10T07:26:00+05:30", vehicle: "MH 04 KU 7281", driver: "Ramesh Yadav", station: "IndianOil COCO", city: "Khalapur", litres: 752.5, pricePerLitre: 91.63, amount: 68_950, odometerKm: 126_102, mileageKmpl: 4.1, paymentMethod: "Fleet card" },
  { id: "FUE-9840", date: "2026-07-10T06:18:00+05:30", vehicle: "MH 12 VX 4419", driver: "Iqbal Sheikh", station: "HPCL Highway Fuel", city: "Solapur", litres: 618, pricePerLitre: 92.48, amount: 57_153, odometerKm: 86_008, mileageKmpl: 3.8, paymentMethod: "Fleet card" },
  { id: "FUE-9839", date: "2026-07-09T19:42:00+05:30", vehicle: "GJ 01 JT 6027", driver: "Mahesh Patel", station: "Nayara Energy", city: "Ahmedabad", litres: 489.4, pricePerLitre: 90.92, amount: 44_492, odometerKm: 173_914, mileageKmpl: 4.3, paymentMethod: "Credit account" },
  { id: "FUE-9838", date: "2026-07-09T15:08:00+05:30", vehicle: "GJ 05 CZ 1142", driver: "Prakash Chouhan", station: "Bharat Petroleum", city: "Surat", litres: 426, pricePerLitre: 91.11, amount: 38_813, odometerKm: 283_876, mileageKmpl: 4.2, paymentMethod: "Fleet card" },
  { id: "FUE-9837", date: "2026-07-09T09:37:00+05:30", vehicle: "TN 09 CQ 8754", driver: "Arun Kumar", station: "IndianOil COCO", city: "Sriperumbudur", litres: 514.2, pricePerLitre: 93.02, amount: 47_831, odometerKm: 118_201, mileageKmpl: 4.4, paymentMethod: "Credit account" },
  { id: "FUE-9836", date: "2026-07-08T18:24:00+05:30", vehicle: "WB 23 E 9086", driver: "Subhash Mondal", station: "HPCL Shaktigarh", city: "Bardhaman", litres: 472.6, pricePerLitre: 92.14, amount: 43_549, odometerKm: 214_284, mileageKmpl: 4, paymentMethod: "Fleet card" },
];

export type MaintenanceStatus = "Scheduled" | "In progress" | "Completed" | "Awaiting parts";

export interface MaintenanceEntry {
  id: string;
  vehicle: string;
  category: string;
  description: string;
  vendor: string;
  openedDate: string;
  dueDate: string;
  odometerKm: number;
  estimatedCost: number;
  actualCost: number | null;
  status: MaintenanceStatus;
  priority: "Low" | "Medium" | "High";
}

export const maintenanceEntries: MaintenanceEntry[] = [
  { id: "MNT-2188", vehicle: "KA 51 MN 7432", category: "Engine", description: "Investigate low oil-pressure warning", vendor: "Bharat Motors Bengaluru", openedDate: "2026-07-10", dueDate: "2026-07-12", odometerKm: 368_420, estimatedCost: 86_000, actualCost: null, status: "In progress", priority: "High" },
  { id: "MNT-2187", vehicle: "GJ 01 JT 6027", category: "Preventive service", description: "180,000 km scheduled service", vendor: "Eicher Truck Care", openedDate: "2026-07-10", dueDate: "2026-07-16", odometerKm: 174_280, estimatedCost: 38_500, actualCost: null, status: "Scheduled", priority: "Medium" },
  { id: "MNT-2186", vehicle: "MH 14 JL 5560", category: "Oil & filters", description: "Engine oil, fuel and air-filter replacement", vendor: "Shree Auto Works", openedDate: "2026-07-09", dueDate: "2026-07-10", odometerKm: 84_210, estimatedCost: 29_000, actualCost: 27_840, status: "Completed", priority: "Medium" },
  { id: "MNT-2185", vehicle: "HR 55 AN 3188", category: "Tyres", description: "Replace two rear tyres and alignment", vendor: "MRF Fleet Services", openedDate: "2026-07-09", dueDate: "2026-07-11", odometerKm: 231_960, estimatedCost: 44_000, actualCost: 42_600, status: "Completed", priority: "High" },
  { id: "MNT-2184", vehicle: "WB 23 E 9086", category: "Electrical", description: "Alternator and battery health check", vendor: "Eastern Truck Care", openedDate: "2026-07-08", dueDate: "2026-07-14", odometerKm: 214_770, estimatedCost: 18_500, actualCost: null, status: "Awaiting parts", priority: "Medium" },
  { id: "MNT-2183", vehicle: "MH 31 FC 2906", category: "Brakes", description: "Replace front brake liners", vendor: "Nagpur Diesel Works", openedDate: "2026-07-07", dueDate: "2026-07-08", odometerKm: 161_980, estimatedCost: 21_800, actualCost: 20_950, status: "Completed", priority: "High" },
];

export type DocumentStatus = "Valid" | "Expiring soon" | "Expired" | "Under review";

export interface DocumentRow {
  id: string;
  type: string;
  holderType: "Vehicle" | "Driver" | "Company";
  holder: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  status: DocumentStatus;
  fileSize: string;
  verifiedBy: string;
}

export const documentRows: DocumentRow[] = [
  { id: "DOC-4821", type: "Fitness certificate", holderType: "Vehicle", holder: "MH 04 KU 7281", documentNumber: "MH04/FC/2024/11862", issueDate: "2024-07-14", expiryDate: "2026-07-13", status: "Expiring soon", fileSize: "1.8 MB", verifiedBy: "Ananya Iyer" },
  { id: "DOC-4820", type: "PUC certificate", holderType: "Vehicle", holder: "GJ 01 JT 6027", documentNumber: "GJ01/PUC/2601847", issueDate: "2026-01-16", expiryDate: "2026-07-15", status: "Expiring soon", fileSize: "642 KB", verifiedBy: "Ananya Iyer" },
  { id: "DOC-4819", type: "Driving license", holderType: "Driver", holder: "Ramesh Yadav", documentNumber: "MH1420150049821", issueDate: "2016-07-20", expiryDate: "2026-07-19", status: "Expiring soon", fileSize: "1.1 MB", verifiedBy: "Vivek Rao" },
  { id: "DOC-4818", type: "Insurance policy", holderType: "Vehicle", holder: "HR 55 AN 3188", documentNumber: "TATA-AIG/CV/4819206", issueDate: "2025-07-25", expiryDate: "2026-07-24", status: "Expiring soon", fileSize: "2.4 MB", verifiedBy: "Ananya Iyer" },
  { id: "DOC-4817", type: "National permit", holderType: "Vehicle", holder: "TN 09 CQ 8754", documentNumber: "TN09/NP/2021/64082", issueDate: "2021-08-01", expiryDate: "2026-07-31", status: "Expiring soon", fileSize: "1.6 MB", verifiedBy: "Vivek Rao" },
  { id: "DOC-4816", type: "Goods carriage permit", holderType: "Vehicle", holder: "MH 12 VX 4419", documentNumber: "MH12/GCP/2025/72918", issueDate: "2025-12-17", expiryDate: "2026-12-16", status: "Valid", fileSize: "1.9 MB", verifiedBy: "Ananya Iyer" },
  { id: "DOC-4815", type: "GST registration", holderType: "Company", holder: "Fleetora Logistics Pvt. Ltd.", documentNumber: "27AAECF2847D1Z8", issueDate: "2019-04-01", expiryDate: "2099-12-31", status: "Valid", fileSize: "884 KB", verifiedBy: "Karan Malhotra" },
];

export interface ReportCard {
  id: string;
  title: string;
  description: string;
  category: "Operations" | "Finance" | "Fleet" | "Compliance";
  period: string;
  lastGenerated: string;
  formats: string[];
  icon: string;
  accent: SemanticTone;
}

export const reportCards: ReportCard[] = [
  { id: "REP-001", title: "Trip profitability", description: "Revenue, cost and margin by route, vehicle and customer.", category: "Finance", period: "Monthly", lastGenerated: "2026-07-10T08:30:00+05:30", formats: ["PDF", "Excel", "CSV"], icon: "ChartSpline", accent: "blue" },
  { id: "REP-002", title: "Fleet utilisation", description: "Vehicle availability, idle time and productive kilometres.", category: "Fleet", period: "Weekly", lastGenerated: "2026-07-09T18:00:00+05:30", formats: ["PDF", "Excel"], icon: "Truck", accent: "violet" },
  { id: "REP-003", title: "Fuel efficiency", description: "Mileage, fuel variance and cost per kilometre by vehicle.", category: "Fleet", period: "Monthly", lastGenerated: "2026-07-09T10:45:00+05:30", formats: ["PDF", "Excel", "CSV"], icon: "Fuel", accent: "amber" },
  { id: "REP-004", title: "Receivables ageing", description: "Customer balances grouped into actionable ageing buckets.", category: "Finance", period: "Live", lastGenerated: "2026-07-10T15:00:00+05:30", formats: ["PDF", "Excel"], icon: "IndianRupee", accent: "emerald" },
  { id: "REP-005", title: "On-time delivery", description: "Lane-wise delivery SLA performance and delay reasons.", category: "Operations", period: "Monthly", lastGenerated: "2026-07-08T17:20:00+05:30", formats: ["PDF", "CSV"], icon: "ClockCheck", accent: "blue" },
  { id: "REP-006", title: "Document compliance", description: "Valid, expiring and missing documents across the fleet.", category: "Compliance", period: "Weekly", lastGenerated: "2026-07-10T07:15:00+05:30", formats: ["PDF", "Excel"], icon: "BadgeCheck", accent: "red" },
];

export interface VendorRow {
  id: string;
  name: string;
  category: string;
  city: string;
  contactName: string;
  phone: string;
  gstin: string;
  rating: number;
  openBills: number;
  outstanding: number;
  ordersYtd: number;
  status: "Preferred" | "Active" | "Review";
}

export const vendorRows: VendorRow[] = [
  { id: "VEN-0184", name: "IndianOil Fleet Services", category: "Fuel", city: "Mumbai", contactName: "Sanjay Rao", phone: "+91 98204 51826", gstin: "27AAACI1681G1ZR", rating: 4.9, openBills: 3, outstanding: 684_500, ordersYtd: 428, status: "Preferred" },
  { id: "VEN-0179", name: "MRF Fleet Services", category: "Tyres", city: "Pune", contactName: "Amol Bendre", phone: "+91 97654 26810", gstin: "27AAACM4154C1ZV", rating: 4.8, openBills: 2, outstanding: 184_200, ordersYtd: 42, status: "Preferred" },
  { id: "VEN-0172", name: "Shree Auto Works", category: "Repairs & service", city: "Pune", contactName: "Deepak Jadhav", phone: "+91 98222 73159", gstin: "27AAMPJ6208K1ZT", rating: 4.6, openBills: 4, outstanding: 126_800, ordersYtd: 68, status: "Active" },
  { id: "VEN-0168", name: "ICICI FASTag Corporate", category: "Toll services", city: "Mumbai", contactName: "Ankit Verma", phone: "+91 99301 48620", gstin: "27AAACI1195H1ZK", rating: 4.7, openBills: 1, outstanding: 248_600, ordersYtd: 12, status: "Preferred" },
  { id: "VEN-0159", name: "Safexpress Warehousing", category: "Warehousing", city: "Delhi", contactName: "Meera Kapoor", phone: "+91 98110 68427", gstin: "07AAACS1879B1ZJ", rating: 4.4, openBills: 2, outstanding: 92_400, ordersYtd: 31, status: "Active" },
  { id: "VEN-0148", name: "Eastern Truck Care", category: "Repairs & service", city: "Kolkata", contactName: "Arup Dutta", phone: "+91 98310 72458", gstin: "19AAHFE6284M1ZR", rating: 4.1, openBills: 3, outstanding: 78_900, ordersYtd: 27, status: "Review" },
];

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  requester: string;
  createdAt: string;
  updatedAt: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In progress" | "Waiting on customer" | "Resolved";
  assignee: string;
  lastMessage: string;
}

export const supportTickets: SupportTicket[] = [
  { id: "TKT-10842", subject: "Bulk import vehicle documents", category: "Documents", requester: "Ananya Iyer", createdAt: "2026-07-10T10:18:00+05:30", updatedAt: "2026-07-10T14:32:00+05:30", priority: "Medium", status: "In progress", assignee: "Priya — Fleetora", lastMessage: "We validated your spreadsheet and shared the corrected template." },
  { id: "TKT-10831", subject: "FASTag expense reconciliation mismatch", category: "Finance", requester: "Karan Malhotra", createdAt: "2026-07-09T12:44:00+05:30", updatedAt: "2026-07-10T11:15:00+05:30", priority: "High", status: "Waiting on customer", assignee: "Arjun — Fleetora", lastMessage: "Please attach the ICICI statement for 1–7 July." },
  { id: "TKT-10818", subject: "Add a custom delay reason", category: "Trips", requester: "Vivek Rao", createdAt: "2026-07-08T09:05:00+05:30", updatedAt: "2026-07-09T17:26:00+05:30", priority: "Low", status: "Open", assignee: "Priya — Fleetora", lastMessage: "Request logged for the product team." },
  { id: "TKT-10796", subject: "Driver app location not refreshing", category: "Tracking", requester: "Rohit Sharma", createdAt: "2026-07-05T16:38:00+05:30", updatedAt: "2026-07-08T13:04:00+05:30", priority: "High", status: "Resolved", assignee: "Arjun — Fleetora", lastMessage: "Background location permission restored; tracking is healthy." },
  { id: "TKT-10782", subject: "Configure weekly profitability report", category: "Reports", requester: "Karan Malhotra", createdAt: "2026-07-03T11:22:00+05:30", updatedAt: "2026-07-07T15:41:00+05:30", priority: "Medium", status: "Resolved", assignee: "Mehul — Fleetora", lastMessage: "The report now arrives every Monday at 08:00 IST." },
];
