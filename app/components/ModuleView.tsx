"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Files,
  Filter,
  Fuel,
  Gauge,
  Handshake,
  Headphones,
  IndianRupee,
  Landmark,
  MapPin,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  Upload,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  customerRows,
  documentRows,
  driverRows,
  financeEntries,
  fleetRows,
  formatCompactINR,
  formatIndianNumber,
  fuelEntries,
  maintenanceEntries,
  notifications,
  recentTrips,
  reportCards,
  supportTickets,
  vendorRows,
  type ModuleId,
  type NotificationItem,
  type ReportCard,
} from "../lib/data";

type ModuleRoute = Exclude<ModuleId, "dashboard">;
type CellValue = string | number | null;
type ModuleRow = Record<string, CellValue>;
type Tone = "blue" | "emerald" | "amber" | "red" | "violet" | "slate";
type CellFormat =
  | "text"
  | "status"
  | "currency"
  | "signed-currency"
  | "date"
  | "datetime"
  | "number"
  | "percent"
  | "distance"
  | "litres"
  | "mileage"
  | "rating";

interface KpiItem {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
  icon: LucideIcon;
}

interface ModuleColumn {
  key: string;
  label: string;
  format?: CellFormat;
  secondaryKey?: string;
  align?: "left" | "right";
}

interface ModuleFilter {
  value: string;
  label: string;
  match?: (row: ModuleRow) => boolean;
}

interface InsightItem {
  label: string;
  value: string;
  tone?: Tone;
}

interface ModuleInsight {
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
  progress?: number;
  items: InsightItem[];
  action: string;
}

interface ModuleConfig {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  primaryAction: string;
  primaryPastTense: string;
  secondaryAction: string;
  searchPlaceholder: string;
  sectionTitle: string;
  sectionCaption: string;
  view: "table" | "reports" | "notifications" | "settings";
  kpis: KpiItem[];
  rows: ModuleRow[];
  columns: ModuleColumn[];
  filters: ModuleFilter[];
  insight: ModuleInsight;
}

interface SettingsItem {
  id: string;
  category: "Operations" | "Finance" | "Security" | "Communication";
  title: string;
  description: string;
  icon: LucideIcon;
  defaultValue: boolean;
  badge?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const ALL_FILTER: ModuleFilter = { value: "all", label: "All" };

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: "live-tracking",
    category: "Operations",
    title: "Live GPS tracking",
    description: "Refresh active vehicle positions every 60 seconds.",
    icon: MapPin,
    defaultValue: true,
  },
  {
    id: "delay-alerts",
    category: "Operations",
    title: "Predictive delay alerts",
    description: "Notify dispatch when a trip is likely to miss its ETA.",
    icon: CircleAlert,
    defaultValue: true,
    badge: "Recommended",
  },
  {
    id: "auto-invoice",
    category: "Finance",
    title: "Invoice after POD",
    description: "Create a draft invoice when proof of delivery is approved.",
    icon: ReceiptText,
    defaultValue: true,
  },
  {
    id: "payment-reminders",
    category: "Finance",
    title: "Payment reminders",
    description: "Send customers a reminder three days before an invoice is due.",
    icon: IndianRupee,
    defaultValue: false,
  },
  {
    id: "two-factor",
    category: "Security",
    title: "Two-factor authentication",
    description: "Require a one-time code for all administrator accounts.",
    icon: ShieldCheck,
    defaultValue: true,
  },
  {
    id: "session-timeout",
    category: "Security",
    title: "Idle session protection",
    description: "Sign users out after 30 minutes of inactivity.",
    icon: Clock3,
    defaultValue: true,
  },
  {
    id: "daily-digest",
    category: "Communication",
    title: "Daily operations digest",
    description: "Email leadership a concise summary at 19:00 IST.",
    icon: Bell,
    defaultValue: true,
  },
  {
    id: "driver-sms",
    category: "Communication",
    title: "Driver SMS fallback",
    description: "Use SMS when a driver has not opened an app alert in 10 minutes.",
    icon: Zap,
    defaultValue: false,
  },
];

const fleetData: ModuleRow[] = fleetRows.map((item) => ({
  id: item.id,
  asset: item.vehicleNumber,
  model: `${item.manufacturer} ${item.model} · ${item.type}`,
  assignment: item.driver ?? "Unassigned",
  location: item.currentLocation,
  utilization: item.utilization,
  fuel: item.fuelLevel,
  service: item.nextServiceKm,
  status: item.status,
}));

const driverData: ModuleRow[] = driverRows.map((item) => ({
  id: item.id,
  driver: item.name,
  base: `${item.base} · ${item.phone}`,
  vehicle: item.assignedVehicle ?? "Unassigned",
  rating: item.rating,
  trips: item.completedTrips,
  onTime: item.onTimeRate,
  attendance: item.attendanceRate,
  status: item.status,
}));

const tripData: ModuleRow[] = recentTrips.map((item) => ({
  id: item.id,
  trip: item.lrNumber,
  route: item.route,
  customer: item.customer,
  vehicle: item.vehicle,
  driver: item.driver,
  eta: item.eta,
  progress: item.progress,
  margin: Math.round((item.profit / item.revenue) * 100),
  status: item.status,
}));

const customerData: ModuleRow[] = customerRows.map((item) => ({
  id: item.id,
  account: item.company,
  industry: `${item.industry} · ${item.city}`,
  contact: item.contactName,
  terms: item.paymentTerms,
  activeTrips: item.activeTrips,
  completedTrips: item.completedTrips,
  outstanding: item.outstanding,
  revenue: item.revenueYtd,
  status: item.status,
}));

const vendorData: ModuleRow[] = vendorRows.map((item) => ({
  id: item.id,
  vendor: item.name,
  category: `${item.category} · ${item.city}`,
  contact: item.contactName,
  rating: item.rating,
  bills: item.openBills,
  outstanding: item.outstanding,
  orders: item.ordersYtd,
  status: item.status,
}));

const financeData: ModuleRow[] = financeEntries.map((item) => ({
  id: item.id,
  date: item.date,
  reference: item.reference,
  category: item.category,
  counterparty: item.counterparty,
  mode: item.paymentMode,
  amount: item.amount,
  type: item.type,
  status: item.status,
}));

const fuelData: ModuleRow[] = fuelEntries.map((item) => ({
  id: item.id,
  date: item.date,
  vehicle: item.vehicle,
  driver: item.driver,
  station: item.station,
  city: item.city,
  litres: item.litres,
  mileage: item.mileageKmpl,
  amount: item.amount,
  method: item.paymentMethod,
}));

const maintenanceData: ModuleRow[] = maintenanceEntries.map((item) => ({
  id: item.id,
  order: item.id,
  category: `${item.category} · ${item.description}`,
  vehicle: item.vehicle,
  vendor: item.vendor,
  due: item.dueDate,
  cost: item.actualCost ?? item.estimatedCost,
  priority: item.priority,
  status: item.status,
}));

const documentData: ModuleRow[] = documentRows.map((item) => ({
  id: item.id,
  document: item.type,
  holder: item.holder,
  holderType: item.holderType,
  number: item.documentNumber,
  expiry: item.expiryDate,
  verified: item.verifiedBy,
  size: item.fileSize,
  status: item.status,
}));

const reportData: ModuleRow[] = reportCards.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
  period: item.period,
  formats: item.formats.join(" "),
}));

const notificationData: ModuleRow[] = notifications.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  kind: item.kind,
  time: item.relativeTime,
  status: item.unread ? "Unread" : "Read",
}));

const settingsData: ModuleRow[] = SETTINGS_ITEMS.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
}));

const supportData: ModuleRow[] = supportTickets.map((item) => ({
  id: item.id,
  subject: item.subject,
  category: item.category,
  requester: item.requester,
  updated: item.updatedAt,
  priority: item.priority,
  status: item.status,
  assignee: item.assignee,
}));

const fleetMileage = fleetRows.reduce((sum, item) => sum + item.mileageKmpl, 0) / fleetRows.length;
const driverOnTime = driverRows.reduce((sum, item) => sum + item.onTimeRate, 0) / driverRows.length;
const customerOutstanding = customerRows.reduce((sum, item) => sum + item.outstanding, 0);
const vendorOutstanding = vendorRows.reduce((sum, item) => sum + item.outstanding, 0);
const financeIncome = financeEntries
  .filter((item) => item.type === "Income")
  .reduce((sum, item) => sum + item.amount, 0);
const financeExpense = financeEntries
  .filter((item) => item.type === "Expense")
  .reduce((sum, item) => sum + item.amount, 0);
const fuelLitres = fuelEntries.reduce((sum, item) => sum + item.litres, 0);
const fuelSpend = fuelEntries.reduce((sum, item) => sum + item.amount, 0);
const averageMileage = fuelEntries.reduce((sum, item) => sum + item.mileageKmpl, 0) / fuelEntries.length;
const maintenanceExposure = maintenanceEntries
  .filter((item) => item.status !== "Completed")
  .reduce((sum, item) => sum + item.estimatedCost, 0);

const CONFIGS: Record<ModuleRoute, ModuleConfig> = {
  fleet: {
    title: "Fleet command",
    eyebrow: "Asset operations",
    description: "See readiness, location, utilisation and service risk across every vehicle.",
    icon: Truck,
    primaryAction: "Add vehicle",
    primaryPastTense: "Vehicle workspace opened",
    secondaryAction: "Export fleet",
    searchPlaceholder: "Search registration, model, driver or location…",
    sectionTitle: "Vehicle register",
    sectionCaption: "Live operating status and asset health",
    view: "table",
    kpis: [
      { label: "Registered fleet", value: "50", detail: "2 added this quarter", tone: "blue", icon: Truck },
      { label: "Road ready", value: "84%", detail: "42 vehicles available", tone: "emerald", icon: CheckCircle2 },
      { label: "Average utilisation", value: "82.2%", detail: "+3.1 pts this month", tone: "violet", icon: Gauge },
      { label: "Fleet mileage", value: `${fleetMileage.toFixed(1)} km/L`, detail: "0.2 above target", tone: "amber", icon: Fuel },
    ],
    rows: fleetData,
    columns: [
      { key: "asset", label: "Vehicle", secondaryKey: "model" },
      { key: "assignment", label: "Driver" },
      { key: "location", label: "Last location" },
      { key: "utilization", label: "Utilisation", format: "percent" },
      { key: "fuel", label: "Fuel", format: "percent" },
      { key: "service", label: "Service in", format: "distance", align: "right" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "on-trip", label: "On trip", match: (row) => row.status === "On trip" },
      { value: "available", label: "Available", match: (row) => row.status === "Available" },
      { value: "attention", label: "Needs attention", match: (row) => row.status === "In service" || row.status === "Inactive" },
    ],
    insight: {
      eyebrow: "Readiness forecast",
      title: "Capacity is healthy for tomorrow",
      body: "North and West hubs can absorb the planned load without an external vehicle.",
      metric: "118 T",
      metricLabel: "spare payload tomorrow",
      progress: 84,
      items: [
        { label: "Service due within 1,000 km", value: "3 vehicles", tone: "amber" },
        { label: "Compliance holds", value: "1 vehicle", tone: "red" },
        { label: "Best-performing class", value: "32 ft MXL", tone: "emerald" },
      ],
      action: "Review capacity plan",
    },
  },
  drivers: {
    title: "Driver workforce",
    eyebrow: "People operations",
    description: "Coordinate assignments, duty status, safety and on-time performance.",
    icon: UsersRound,
    primaryAction: "Add driver",
    primaryPastTense: "Driver onboarding opened",
    secondaryAction: "Export roster",
    searchPlaceholder: "Search driver, base, phone or vehicle…",
    sectionTitle: "Driver roster",
    sectionCaption: "Availability, assignment and performance",
    view: "table",
    kpis: [
      { label: "Active drivers", value: "100", detail: "96 on payroll today", tone: "blue", icon: UsersRound },
      { label: "Available now", value: "78%", detail: "12 dispatch-ready nearby", tone: "emerald", icon: UserRoundCheck },
      { label: "On-time rate", value: `${driverOnTime.toFixed(1)}%`, detail: "+1.8 pts vs June", tone: "violet", icon: Clock3 },
      { label: "Safety score", value: "96.4", detail: "No major events in 18 days", tone: "amber", icon: ShieldCheck },
    ],
    rows: driverData,
    columns: [
      { key: "driver", label: "Driver", secondaryKey: "base" },
      { key: "vehicle", label: "Assigned vehicle" },
      { key: "rating", label: "Rating", format: "rating" },
      { key: "trips", label: "Trips", format: "number", align: "right" },
      { key: "onTime", label: "On time", format: "percent" },
      { key: "attendance", label: "Attendance", format: "percent" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "available", label: "Available", match: (row) => row.status === "Available" },
      { value: "on-trip", label: "On trip", match: (row) => row.status === "On trip" },
      { value: "off-duty", label: "Off duty / leave", match: (row) => row.status === "Off duty" || row.status === "On leave" },
    ],
    insight: {
      eyebrow: "Dispatch match",
      title: "Three ideal driver matches",
      body: "Availability, home base and recent duty hours align with tomorrow’s Pune departures.",
      metric: "97%",
      metricLabel: "coverage for planned trips",
      progress: 97,
      items: [
        { label: "Licences due in 30 days", value: "1 driver", tone: "red" },
        { label: "Duty-hour warnings", value: "1 active", tone: "amber" },
        { label: "Top on-time performer", value: "Surinder · 97%", tone: "emerald" },
      ],
      action: "Open assignment planner",
    },
  },
  trips: {
    title: "Trip control",
    eyebrow: "Live dispatch",
    description: "Plan, dispatch and intervene across every shipment from loading to POD.",
    icon: Route,
    primaryAction: "Create trip",
    primaryPastTense: "Trip planner opened",
    secondaryAction: "Export trips",
    searchPlaceholder: "Search LR, route, customer, vehicle or driver…",
    sectionTitle: "Movement board",
    sectionCaption: "Live milestones, ETAs and contribution margin",
    view: "table",
    kpis: [
      { label: "Running now", value: "27", detail: "18 on schedule", tone: "blue", icon: Route },
      { label: "Today’s dispatch", value: "14", detail: "12 already departed", tone: "violet", icon: MapPin },
      { label: "On-time delivery", value: "94.6%", detail: "+2.2 pts this month", tone: "emerald", icon: CheckCircle2 },
      { label: "Exceptions", value: "7", detail: "2 require dispatch action", tone: "red", icon: CircleAlert },
    ],
    rows: tripData,
    columns: [
      { key: "trip", label: "LR / trip", secondaryKey: "id" },
      { key: "route", label: "Route" },
      { key: "customer", label: "Customer" },
      { key: "vehicle", label: "Vehicle" },
      { key: "eta", label: "ETA", format: "datetime" },
      { key: "progress", label: "Progress", format: "percent" },
      { key: "margin", label: "Margin", format: "percent" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "moving", label: "In transit", match: (row) => row.status === "In transit" },
      { value: "planning", label: "Scheduled / loading", match: (row) => row.status === "Scheduled" || row.status === "Loading" },
      { value: "exceptions", label: "Exceptions", match: (row) => row.status === "Delayed" },
      { value: "delivered", label: "Delivered", match: (row) => row.status === "Delivered" },
    ],
    insight: {
      eyebrow: "Exception watch",
      title: "Surat → Indore needs attention",
      body: "Heavy rain near Dhule has moved TRP-2607142 outside its customer SLA window.",
      metric: "+2h 20m",
      metricLabel: "predicted arrival delay",
      progress: 76,
      items: [
        { label: "Driver contact", value: "Confirmed 11:06", tone: "emerald" },
        { label: "Customer update", value: "Pending", tone: "red" },
        { label: "Alternate route", value: "Adds 46 km", tone: "amber" },
      ],
      action: "Open exception room",
    },
  },
  customers: {
    title: "Customer accounts",
    eyebrow: "Commercial operations",
    description: "Manage service activity, credit exposure and lifetime account value.",
    icon: Building2,
    primaryAction: "Add customer",
    primaryPastTense: "Customer workspace opened",
    secondaryAction: "Export accounts",
    searchPlaceholder: "Search company, industry, city or contact…",
    sectionTitle: "Account portfolio",
    sectionCaption: "Revenue, trips and receivable position",
    view: "table",
    kpis: [
      { label: "Active accounts", value: "42", detail: "3 added this quarter", tone: "blue", icon: Building2 },
      { label: "YTD revenue", value: "₹4.73 Cr", detail: "+14.2% year on year", tone: "emerald", icon: IndianRupee },
      { label: "Outstanding", value: formatCompactINR(customerOutstanding, 2), detail: "18.4% of credit utilised", tone: "amber", icon: WalletCards },
      { label: "Retention", value: "96.8%", detail: "12-month rolling rate", tone: "violet", icon: Handshake },
    ],
    rows: customerData,
    columns: [
      { key: "account", label: "Account", secondaryKey: "industry" },
      { key: "contact", label: "Primary contact" },
      { key: "terms", label: "Terms" },
      { key: "activeTrips", label: "Active", format: "number", align: "right" },
      { key: "completedTrips", label: "Completed", format: "number", align: "right" },
      { key: "outstanding", label: "Outstanding", format: "currency", align: "right" },
      { key: "revenue", label: "YTD revenue", format: "currency", align: "right" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "active", label: "Active", match: (row) => row.status === "Active" },
      { value: "review", label: "Credit review", match: (row) => row.status === "Review" },
      { value: "hold", label: "On hold", match: (row) => row.status === "On hold" },
    ],
    insight: {
      eyebrow: "Portfolio pulse",
      title: "Credit risk is concentrated",
      body: "One account represents 27% of current receivables and has crossed its agreed ageing window.",
      metric: "₹18.62 L",
      metricLabel: "JSW Steel exposure",
      progress: 73,
      items: [
        { label: "Invoices due this week", value: "14", tone: "amber" },
        { label: "Accounts over limit", value: "1", tone: "red" },
        { label: "Expansion candidates", value: "4", tone: "emerald" },
      ],
      action: "Review receivables",
    },
  },
  vendors: {
    title: "Vendor network",
    eyebrow: "Supply operations",
    description: "Control supplier quality, spend, open bills and service coverage.",
    icon: Handshake,
    primaryAction: "Add vendor",
    primaryPastTense: "Vendor onboarding opened",
    secondaryAction: "Export vendors",
    searchPlaceholder: "Search vendor, category, city or contact…",
    sectionTitle: "Approved suppliers",
    sectionCaption: "Performance, activity and payable position",
    view: "table",
    kpis: [
      { label: "Approved vendors", value: "36", detail: "8 preferred partners", tone: "blue", icon: Handshake },
      { label: "Open bills", value: "15", detail: formatCompactINR(vendorOutstanding, 2), tone: "amber", icon: ReceiptText },
      { label: "Average rating", value: "4.6 / 5", detail: "+0.2 over six months", tone: "emerald", icon: Star },
      { label: "Coverage gaps", value: "2", detail: "East and Northeast tyres", tone: "red", icon: MapPin },
    ],
    rows: vendorData,
    columns: [
      { key: "vendor", label: "Vendor", secondaryKey: "category" },
      { key: "contact", label: "Contact" },
      { key: "rating", label: "Rating", format: "rating" },
      { key: "bills", label: "Open bills", format: "number", align: "right" },
      { key: "outstanding", label: "Outstanding", format: "currency", align: "right" },
      { key: "orders", label: "Orders YTD", format: "number", align: "right" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "preferred", label: "Preferred", match: (row) => row.status === "Preferred" },
      { value: "active", label: "Active", match: (row) => row.status === "Active" },
      { value: "review", label: "Under review", match: (row) => row.status === "Review" },
    ],
    insight: {
      eyebrow: "Supplier intelligence",
      title: "Tyre spend can improve 6–9%",
      body: "Consolidating two regional contracts would unlock better slab pricing without reducing coverage.",
      metric: "₹2.4 L",
      metricLabel: "estimated annual saving",
      progress: 68,
      items: [
        { label: "Contracts expiring soon", value: "3", tone: "amber" },
        { label: "SLA breaches this month", value: "2", tone: "red" },
        { label: "Preferred spend share", value: "71%", tone: "emerald" },
      ],
      action: "Open sourcing analysis",
    },
  },
  finance: {
    title: "Finance desk",
    eyebrow: "Cash and profitability",
    description: "Track every receipt, expense, pending entry and operating margin.",
    icon: Landmark,
    primaryAction: "New entry",
    primaryPastTense: "Journal entry opened",
    secondaryAction: "Export ledger",
    searchPlaceholder: "Search reference, counterparty, category or mode…",
    sectionTitle: "General ledger",
    sectionCaption: "Latest reconciled and outstanding entries",
    view: "table",
    kpis: [
      { label: "Revenue this month", value: "₹86.40 L", detail: "+12.8% vs June", tone: "blue", icon: CircleDollarSign },
      { label: "Recorded income", value: formatCompactINR(financeIncome, 2), detail: "In the visible ledger", tone: "emerald", icon: ArrowDownToLine },
      { label: "Recorded expense", value: formatCompactINR(financeExpense, 2), detail: "Fuel is the largest line", tone: "amber", icon: WalletCards },
      { label: "Operating margin", value: "21.6%", detail: "+1.4 pts month on month", tone: "violet", icon: ChartNoAxesCombined },
    ],
    rows: financeData,
    columns: [
      { key: "date", label: "Date", format: "date" },
      { key: "reference", label: "Reference", secondaryKey: "category" },
      { key: "counterparty", label: "Counterparty" },
      { key: "mode", label: "Payment mode" },
      { key: "type", label: "Type", format: "status" },
      { key: "status", label: "Status", format: "status" },
      { key: "amount", label: "Amount", format: "signed-currency", align: "right" },
    ],
    filters: [
      ALL_FILTER,
      { value: "income", label: "Income", match: (row) => row.type === "Income" },
      { value: "expense", label: "Expenses", match: (row) => row.type === "Expense" },
      { value: "pending", label: "Pending / overdue", match: (row) => row.status === "Pending" || row.status === "Overdue" },
    ],
    insight: {
      eyebrow: "Cash-flow outlook",
      title: "Collections cover 1.7× near-term dues",
      body: "Expected customer receipts through 17 July comfortably exceed committed operating payments.",
      metric: "+₹8.7 L",
      metricLabel: "projected 7-day net cash",
      progress: 81,
      items: [
        { label: "Receipts expected", value: "₹21.4 L", tone: "emerald" },
        { label: "Payments committed", value: "₹12.7 L", tone: "amber" },
        { label: "Overdue invoices", value: "6", tone: "red" },
      ],
      action: "Open cash forecast",
    },
  },
  fuel: {
    title: "Fuel intelligence",
    eyebrow: "Consumption control",
    description: "Monitor fills, mileage, price variance and payment reconciliation.",
    icon: Fuel,
    primaryAction: "Record fuel",
    primaryPastTense: "Fuel entry opened",
    secondaryAction: "Export fuel log",
    searchPlaceholder: "Search vehicle, driver, station or city…",
    sectionTitle: "Fuel transactions",
    sectionCaption: "Verified fills with odometer-linked efficiency",
    view: "table",
    kpis: [
      { label: "Fuel spend", value: formatCompactINR(fuelSpend, 2), detail: "Across latest 6 fills", tone: "blue", icon: IndianRupee },
      { label: "Volume purchased", value: `${formatIndianNumber(Math.round(fuelLitres))} L`, detail: "92.05 average ₹/L", tone: "violet", icon: Fuel },
      { label: "Average mileage", value: `${averageMileage.toFixed(1)} km/L`, detail: "+0.2 vs target", tone: "emerald", icon: Gauge },
      { label: "Variance alerts", value: "2", detail: "One needs verification", tone: "amber", icon: CircleAlert },
    ],
    rows: fuelData,
    columns: [
      { key: "date", label: "Filled at", format: "datetime" },
      { key: "vehicle", label: "Vehicle", secondaryKey: "driver" },
      { key: "station", label: "Fuel station", secondaryKey: "city" },
      { key: "litres", label: "Quantity", format: "litres", align: "right" },
      { key: "mileage", label: "Mileage", format: "mileage", align: "right" },
      { key: "amount", label: "Amount", format: "currency", align: "right" },
      { key: "method", label: "Payment" },
    ],
    filters: [
      ALL_FILTER,
      { value: "fleet-card", label: "Fleet card", match: (row) => row.method === "Fleet card" },
      { value: "credit", label: "Credit account", match: (row) => row.method === "Credit account" },
      { value: "low-mileage", label: "Below 4 km/L", match: (row) => typeof row.mileage === "number" && row.mileage < 4 },
    ],
    insight: {
      eyebrow: "Efficiency watch",
      title: "MH 12 VX 4419 is below baseline",
      body: "Its last three fills average 3.8 km/L against a model baseline of 4.1 km/L.",
      metric: "−7.3%",
      metricLabel: "efficiency variance",
      progress: 62,
      items: [
        { label: "Possible excess cost", value: "₹8,420 / month", tone: "red" },
        { label: "Tyre pressure check", value: "Due today", tone: "amber" },
        { label: "Fuel-card matches", value: "98.6%", tone: "emerald" },
      ],
      action: "Investigate variance",
    },
  },
  maintenance: {
    title: "Maintenance control",
    eyebrow: "Workshop operations",
    description: "Plan preventive service, manage repairs and protect fleet uptime.",
    icon: Wrench,
    primaryAction: "New work order",
    primaryPastTense: "Work order opened",
    secondaryAction: "Export schedule",
    searchPlaceholder: "Search vehicle, work order, category or vendor…",
    sectionTitle: "Workshop queue",
    sectionCaption: "Planned and active maintenance work",
    view: "table",
    kpis: [
      { label: "Open work orders", value: "3", detail: "1 high-priority repair", tone: "blue", icon: Wrench },
      { label: "Fleet uptime", value: "96.2%", detail: "+1.1 pts this month", tone: "emerald", icon: Activity },
      { label: "Cost exposure", value: formatCompactINR(maintenanceExposure, 2), detail: "Open estimated work", tone: "amber", icon: WalletCards },
      { label: "Overdue service", value: "1", detail: "Escalated to workshop", tone: "red", icon: CalendarClock },
    ],
    rows: maintenanceData,
    columns: [
      { key: "order", label: "Work order", secondaryKey: "category" },
      { key: "vehicle", label: "Vehicle" },
      { key: "vendor", label: "Service partner" },
      { key: "due", label: "Due", format: "date" },
      { key: "cost", label: "Cost", format: "currency", align: "right" },
      { key: "priority", label: "Priority", format: "status" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "open", label: "Open", match: (row) => row.status !== "Completed" },
      { value: "high", label: "High priority", match: (row) => row.priority === "High" },
      { value: "completed", label: "Completed", match: (row) => row.status === "Completed" },
    ],
    insight: {
      eyebrow: "Uptime protection",
      title: "Engine alert is the critical path",
      body: "KA 51 MN 7432 is expected back within 38 hours if oil-pressure diagnostics confirm the first hypothesis.",
      metric: "38 hrs",
      metricLabel: "estimated return to service",
      progress: 54,
      items: [
        { label: "Part availability", value: "Confirmed", tone: "emerald" },
        { label: "Replacement capacity", value: "Reserved", tone: "blue" },
        { label: "Cost ceiling", value: "₹86,000", tone: "amber" },
      ],
      action: "Open workshop plan",
    },
  },
  documents: {
    title: "Compliance vault",
    eyebrow: "Document operations",
    description: "Keep vehicle, driver and company records verified and renewal-ready.",
    icon: Files,
    primaryAction: "Upload document",
    primaryPastTense: "Secure upload opened",
    secondaryAction: "Export register",
    searchPlaceholder: "Search document, holder, number or verifier…",
    sectionTitle: "Document register",
    sectionCaption: "Verification state and expiry control",
    view: "table",
    kpis: [
      { label: "Compliance score", value: "94.8%", detail: "+2.6 pts this quarter", tone: "emerald", icon: BadgeCheck },
      { label: "Documents stored", value: "428", detail: "12 added this month", tone: "blue", icon: Files },
      { label: "Expiring in 30 days", value: "5", detail: "2 are critical this week", tone: "amber", icon: CalendarClock },
      { label: "Missing records", value: "3", detail: "Owners have been notified", tone: "red", icon: FileText },
    ],
    rows: documentData,
    columns: [
      { key: "document", label: "Document", secondaryKey: "id" },
      { key: "holder", label: "Holder", secondaryKey: "holderType" },
      { key: "number", label: "Document number" },
      { key: "expiry", label: "Expiry", format: "date" },
      { key: "verified", label: "Verified by" },
      { key: "size", label: "File" },
      { key: "status", label: "Status", format: "status" },
    ],
    filters: [
      ALL_FILTER,
      { value: "expiring", label: "Expiring soon", match: (row) => row.status === "Expiring soon" },
      { value: "valid", label: "Valid", match: (row) => row.status === "Valid" },
      { value: "vehicle", label: "Vehicle", match: (row) => row.holderType === "Vehicle" },
      { value: "driver", label: "Driver", match: (row) => row.holderType === "Driver" },
    ],
    insight: {
      eyebrow: "Renewal queue",
      title: "Two certificates need action this week",
      body: "Fitness for MH 04 KU 7281 and PUC for GJ 01 JT 6027 are inside the five-day window.",
      metric: "3 days",
      metricLabel: "nearest certificate expiry",
      progress: 41,
      items: [
        { label: "Renewal owner", value: "Ananya Iyer", tone: "blue" },
        { label: "Appointment slots", value: "2 reserved", tone: "emerald" },
        { label: "Assets at risk", value: "2 vehicles", tone: "red" },
      ],
      action: "Open renewal queue",
    },
  },
  reports: {
    title: "Reports studio",
    eyebrow: "Decision intelligence",
    description: "Generate consistent operational, financial and compliance reporting.",
    icon: ChartNoAxesCombined,
    primaryAction: "Generate report",
    primaryPastTense: "Report builder opened",
    secondaryAction: "Manage schedules",
    searchPlaceholder: "Search report, category, format or cadence…",
    sectionTitle: "Report library",
    sectionCaption: "Ready-to-run analysis for every team",
    view: "reports",
    kpis: [
      { label: "Report templates", value: "24", detail: "6 featured below", tone: "blue", icon: ChartNoAxesCombined },
      { label: "Scheduled runs", value: "11", detail: "All delivered on time", tone: "emerald", icon: CalendarClock },
      { label: "Exports this month", value: "86", detail: "+18% vs June", tone: "violet", icon: Download },
      { label: "Data freshness", value: "2 min", detail: "Across connected modules", tone: "amber", icon: Activity },
    ],
    rows: reportData,
    columns: [],
    filters: [
      ALL_FILTER,
      { value: "operations", label: "Operations", match: (row) => row.category === "Operations" },
      { value: "finance", label: "Finance", match: (row) => row.category === "Finance" },
      { value: "fleet", label: "Fleet", match: (row) => row.category === "Fleet" },
      { value: "compliance", label: "Compliance", match: (row) => row.category === "Compliance" },
    ],
    insight: {
      eyebrow: "Scheduled intelligence",
      title: "Leadership pack is ready for Monday",
      body: "Five source reports are current and the delivery list has been verified.",
      metric: "08:00",
      metricLabel: "next scheduled delivery",
      progress: 100,
      items: [
        { label: "Recipients", value: "8 leaders", tone: "blue" },
        { label: "Source checks", value: "5 of 5 passed", tone: "emerald" },
        { label: "Format", value: "PDF + Excel", tone: "violet" },
      ],
      action: "Review delivery pack",
    },
  },
  notifications: {
    title: "Activity centre",
    eyebrow: "Alerts and events",
    description: "Prioritise operational exceptions, payments and compliance reminders.",
    icon: Bell,
    primaryAction: "Mark all read",
    primaryPastTense: "All notifications marked read",
    secondaryAction: "Alert preferences",
    searchPlaceholder: "Search alerts, trips, vehicles or payments…",
    sectionTitle: "Notification stream",
    sectionCaption: "Most relevant activity across Fleetora",
    view: "notifications",
    kpis: [
      { label: "Unread", value: String(notifications.filter((item) => item.unread).length), detail: "2 need a decision", tone: "blue", icon: Bell },
      { label: "Critical", value: "1", detail: "Compliance expiry", tone: "red", icon: CircleAlert },
      { label: "Operations", value: "3", detail: "Trip and driver events", tone: "amber", icon: Route },
      { label: "Resolved today", value: "8", detail: "Median response 14 min", tone: "emerald", icon: CheckCircle2 },
    ],
    rows: notificationData,
    columns: [],
    filters: [
      ALL_FILTER,
      { value: "unread", label: "Unread", match: (row) => row.status === "Unread" },
      { value: "trip", label: "Trips", match: (row) => row.kind === "trip" },
      { value: "compliance", label: "Compliance", match: (row) => row.kind === "document" },
      { value: "finance", label: "Payments", match: (row) => row.kind === "payment" },
    ],
    insight: {
      eyebrow: "Attention summary",
      title: "Two actions unblock today’s flow",
      body: "Notify one delayed-trip customer and assign the upcoming fitness renewal.",
      metric: "14 min",
      metricLabel: "median acknowledgement time",
      progress: 86,
      items: [
        { label: "Open critical alert", value: "1", tone: "red" },
        { label: "SLA within target", value: "96%", tone: "emerald" },
        { label: "Quiet hours", value: "22:00–06:00", tone: "violet" },
      ],
      action: "Review alert rules",
    },
  },
  settings: {
    title: "Workspace settings",
    eyebrow: "Company configuration",
    description: "Tune workflows, controls and communication for your organisation.",
    icon: Settings2,
    primaryAction: "Save changes",
    primaryPastTense: "Workspace preferences saved",
    secondaryAction: "View audit log",
    searchPlaceholder: "Search preferences and controls…",
    sectionTitle: "Automation and controls",
    sectionCaption: "Changes apply across Fleetora Logistics",
    view: "settings",
    kpis: [
      { label: "Team members", value: "28", detail: "24 active this month", tone: "blue", icon: UsersRound },
      { label: "Admin roles", value: "4", detail: "Least-privilege reviewed", tone: "violet", icon: ShieldCheck },
      { label: "Automations on", value: "11", detail: "43 hours saved monthly", tone: "emerald", icon: Zap },
      { label: "Audit health", value: "100%", detail: "No unresolved findings", tone: "amber", icon: FileCheck2 },
    ],
    rows: settingsData,
    columns: [],
    filters: [
      ALL_FILTER,
      { value: "operations", label: "Operations", match: (row) => row.category === "Operations" },
      { value: "finance", label: "Finance", match: (row) => row.category === "Finance" },
      { value: "security", label: "Security", match: (row) => row.category === "Security" },
      { value: "communication", label: "Communication", match: (row) => row.category === "Communication" },
    ],
    insight: {
      eyebrow: "Configuration health",
      title: "Your workspace is well protected",
      body: "Core security controls are active. Enabling payment reminders is the highest-value next step.",
      metric: "92%",
      metricLabel: "recommended setup complete",
      progress: 92,
      items: [
        { label: "Security controls", value: "6 of 6", tone: "emerald" },
        { label: "Suggested automation", value: "1 available", tone: "blue" },
        { label: "Last admin review", value: "02 Jul 2026", tone: "violet" },
      ],
      action: "Open setup checklist",
    },
  },
  support: {
    title: "Support centre",
    eyebrow: "Help and service",
    description: "Resolve product questions with contextual, priority-aware assistance.",
    icon: Headphones,
    primaryAction: "New ticket",
    primaryPastTense: "Support request opened",
    secondaryAction: "Browse guides",
    searchPlaceholder: "Search ticket, category, requester or assignee…",
    sectionTitle: "Support requests",
    sectionCaption: "Current conversations and recent resolutions",
    view: "table",
    kpis: [
      { label: "Open requests", value: "3", detail: "1 high priority", tone: "blue", icon: Headphones },
      { label: "First response", value: "18 min", detail: "Inside 30-min target", tone: "emerald", icon: Clock3 },
      { label: "Resolution time", value: "4.2 hrs", detail: "−36 min this month", tone: "violet", icon: CheckCircle2 },
      { label: "Satisfaction", value: "4.9 / 5", detail: "From 42 responses", tone: "amber", icon: Star },
    ],
    rows: supportData,
    columns: [
      { key: "subject", label: "Request", secondaryKey: "id" },
      { key: "category", label: "Category" },
      { key: "requester", label: "Requester" },
      { key: "updated", label: "Updated", format: "datetime" },
      { key: "priority", label: "Priority", format: "status" },
      { key: "status", label: "Status", format: "status" },
      { key: "assignee", label: "Assignee" },
    ],
    filters: [
      ALL_FILTER,
      { value: "open", label: "Open", match: (row) => row.status === "Open" || row.status === "In progress" || row.status === "Waiting on customer" },
      { value: "high", label: "High priority", match: (row) => row.priority === "High" },
      { value: "resolved", label: "Resolved", match: (row) => row.status === "Resolved" },
    ],
    insight: {
      eyebrow: "Service health",
      title: "All priority SLAs are protected",
      body: "The only waiting high-priority case needs a FASTag statement from your finance team.",
      metric: "100%",
      metricLabel: "tickets inside SLA",
      progress: 100,
      items: [
        { label: "Waiting on your team", value: "1 ticket", tone: "amber" },
        { label: "Product requests logged", value: "2", tone: "blue" },
        { label: "Resolved this week", value: "12", tone: "emerald" },
      ],
      action: "Open support dashboard",
    },
  },
};

const reportCategoryIcons: Record<ReportCard["category"], LucideIcon> = {
  Operations: Route,
  Finance: IndianRupee,
  Fleet: Truck,
  Compliance: BadgeCheck,
};

const notificationIcons: Record<NotificationItem["kind"], LucideIcon> = {
  trip: Route,
  document: FileText,
  payment: IndianRupee,
  driver: UserRoundCheck,
  maintenance: Wrench,
};

function slugify(value: CellValue) {
  return String(value ?? "neutral")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDate(value: CellValue, includeTime = false) {
  if (typeof value !== "string") return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return (includeTime ? dateTimeFormatter : dateFormatter).format(parsed);
}

function renderCell(value: CellValue, column: ModuleColumn, row: ModuleRow): ReactNode {
  if (value === null || value === "") return <span className="data-muted">—</span>;

  const secondary = column.secondaryKey ? row[column.secondaryKey] : null;
  if (column.format === "status") {
    return (
      <span className={`status-pill status-${slugify(value)}`}>
        <span className="status-dot" aria-hidden="true" />
        {value}
      </span>
    );
  }

  if (column.format === "currency" && typeof value === "number") {
    return <strong className="data-money">{formatCompactINR(value, 2)}</strong>;
  }

  if (column.format === "signed-currency" && typeof value === "number") {
    const positive = row.type === "Income";
    return (
      <strong className={`data-money data-money-${positive ? "positive" : "negative"}`}>
        {positive ? "+" : "−"}{formatCompactINR(value, 2)}
      </strong>
    );
  }

  if (column.format === "date") return formatDate(value);
  if (column.format === "datetime") return formatDate(value, true);
  if (column.format === "number" && typeof value === "number") return formatIndianNumber(value);
  if (column.format === "distance" && typeof value === "number") return `${formatIndianNumber(value)} km`;
  if (column.format === "litres" && typeof value === "number") return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;
  if (column.format === "mileage" && typeof value === "number") return `${value.toFixed(1)} km/L`;
  if (column.format === "rating" && typeof value === "number") {
    return (
      <span className="data-rating">
        <Star size={14} fill="currentColor" aria-hidden="true" /> {value.toFixed(1)}
      </span>
    );
  }

  if (column.format === "percent" && typeof value === "number") {
    const constrained = Math.max(0, Math.min(100, value));
    return (
      <div className="data-progress-cell" aria-label={`${value}%`}>
        <div className="data-progress-track" aria-hidden="true">
          <span style={{ width: `${constrained}%` }} />
        </div>
        <strong>{value}%</strong>
      </div>
    );
  }

  if (secondary !== null && secondary !== "") {
    return (
      <span className="data-primary-cell">
        <strong>{value}</strong>
        <small>{secondary}</small>
      </span>
    );
  }

  return String(value);
}

function ModuleDataTable({ rows, columns, emptyText }: { rows: ModuleRow[]; columns: ModuleColumn[]; emptyText: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const definitions = useMemo<ColumnDef<ModuleRow>[]>(
    () =>
      columns.map((column) => ({
        accessorKey: column.key,
        header: ({ column: tableColumn }) => (
          <button
            type="button"
            className={`data-sort data-align-${column.align ?? "left"}`}
            onClick={tableColumn.getToggleSortingHandler()}
          >
            {column.label}
            <ArrowUpDown size={13} aria-hidden="true" />
          </button>
        ),
        cell: ({ getValue, row }) => renderCell(getValue() as CellValue, column, row.original),
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: definitions,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
              ))}
              <th className="data-actions-heading"><span className="data-visually-hidden">Actions</span></th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={String(row.original.id)}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
              <td className="data-row-actions">
                <button type="button" className="data-icon-button" aria-label={`Open actions for ${row.original.id}`}>
                  <MoreHorizontal size={17} aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="data-empty">
          <Search size={22} aria-hidden="true" />
          <strong>No matching records</strong>
          <span>{emptyText}</span>
        </div>
      )}
    </div>
  );
}

function ReportsView({ rows, onAction }: { rows: ModuleRow[]; onAction: (message: string) => void }) {
  const visibleIds = new Set(rows.map((row) => row.id));
  const visibleReports = reportCards.filter((report) => visibleIds.has(report.id));

  if (visibleReports.length === 0) {
    return <EmptyState text="Try a broader report name or a different category." />;
  }

  return (
    <div className="module-report-grid">
      {visibleReports.map((report, index) => {
        const Icon = reportCategoryIcons[report.category];
        return (
          <motion.article
            className={`module-report-card module-tone-${report.accent}`}
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.045 }}
          >
            <div className="module-report-topline">
              <span className="module-report-icon"><Icon size={19} aria-hidden="true" /></span>
              <span className={`status-pill status-${slugify(report.category)}`}>{report.category}</span>
            </div>
            <h3>{report.title}</h3>
            <p>{report.description}</p>
            <div className="module-report-meta">
              <span><CalendarClock size={14} aria-hidden="true" /> {report.period}</span>
              <span><Clock3 size={14} aria-hidden="true" /> {formatDate(report.lastGenerated, true)}</span>
            </div>
            <div className="module-report-footer">
              <div className="module-format-list" aria-label="Available formats">
                {report.formats.map((format) => <span key={format}>{format}</span>)}
              </div>
              <button type="button" className="module-icon-button" aria-label={`Run ${report.title}`} onClick={() => onAction(`${report.title} is ready to configure`)}>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

function NotificationFeed({
  rows,
  readIds,
  onRead,
}: {
  rows: ModuleRow[];
  readIds: Set<string>;
  onRead: (id: string) => void;
}) {
  const visibleIds = new Set(rows.map((row) => row.id));
  const visibleNotifications = notifications.filter((notification) => visibleIds.has(notification.id));

  if (visibleNotifications.length === 0) {
    return <EmptyState text="You are all caught up for this view." />;
  }

  return (
    <div className="notice-feed">
      {visibleNotifications.map((notification) => {
        const Icon = notificationIcons[notification.kind];
        const isUnread = !readIds.has(notification.id);
        return (
          <article className={`notice-item notice-tone-${notification.tone} ${isUnread ? "notice-unread" : ""}`} key={notification.id}>
            <button type="button" className="notice-item-button" onClick={() => onRead(notification.id)} aria-label={`Mark ${notification.title} as read`}>
              <span className="notice-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="notice-copy">
                <span className="notice-title-line">
                  <strong>{notification.title}</strong>
                  {isUnread && <span className="notice-unread-dot" aria-label="Unread" />}
                </span>
                <span>{notification.description}</span>
                <small>{notification.relativeTime} · {notification.kind}</small>
              </span>
              <ChevronRight size={17} className="notice-chevron" aria-hidden="true" />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function SettingsView({
  rows,
  values,
  onToggle,
}: {
  rows: ModuleRow[];
  values: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const visibleIds = new Set(rows.map((row) => row.id));
  const items = SETTINGS_ITEMS.filter((item) => visibleIds.has(item.id));

  if (items.length === 0) {
    return <EmptyState text="Try a broader settings search or another category." />;
  }

  return (
    <div className="settings-grid">
      {items.map((item) => {
        const Icon = item.icon;
        const enabled = values[item.id];
        return (
          <article className="settings-card" key={item.id}>
            <span className="settings-icon"><Icon size={18} aria-hidden="true" /></span>
            <div className="settings-copy">
              <div className="settings-title-line">
                <h3>{item.title}</h3>
                {item.badge && <span className="settings-badge">{item.badge}</span>}
              </div>
              <p>{item.description}</p>
              <span>{item.category}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? "Disable" : "Enable"} ${item.title}`}
              className={`settings-toggle ${enabled ? "settings-toggle-on" : ""}`}
              onClick={() => onToggle(item.id)}
            >
              <span />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="data-empty data-empty-large">
      <Search size={22} aria-hidden="true" />
      <strong>No matching results</strong>
      <span>{text}</span>
    </div>
  );
}

function InsightPanel({ insight, onAction }: { insight: ModuleInsight; onAction: (message: string) => void }) {
  return (
    <aside className="panel-insight">
      <div className="panel-insight-heading">
        <span className="panel-insight-icon"><Sparkles size={16} aria-hidden="true" /></span>
        <span>{insight.eyebrow}</span>
      </div>
      <h2>{insight.title}</h2>
      <p>{insight.body}</p>
      <div className="panel-insight-metric">
        <strong>{insight.metric}</strong>
        <span>{insight.metricLabel}</span>
      </div>
      {typeof insight.progress === "number" && (
        <div className="panel-progress" aria-label={`${insight.progress}%`}>
          <span style={{ width: `${insight.progress}%` }} />
        </div>
      )}
      <div className="panel-insight-list">
        {insight.items.map((item) => (
          <div className="panel-insight-item" key={item.label}>
            <span>{item.label}</span>
            <strong className={`panel-tone-${item.tone ?? "slate"}`}>{item.value}</strong>
          </div>
        ))}
      </div>
      <button type="button" className="panel-insight-action" onClick={() => onAction(`${insight.action} opened`)}>
        {insight.action}<ArrowRight size={15} aria-hidden="true" />
      </button>
    </aside>
  );
}

function isModuleRoute(value: string): value is ModuleRoute {
  return value in CONFIGS;
}

export interface ModuleViewProps {
  route: string;
}

export function ModuleView({ route }: ModuleViewProps) {
  const normalizedRoute = route.toLowerCase().split("/")[0];
  const routeKey: ModuleRoute = isModuleRoute(normalizedRoute) ? normalizedRoute : "fleet";
  const config = CONFIGS[routeKey];
  const PageIcon = config.icon;
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => new Set(notifications.filter((item) => !item.unread).map((item) => item.id)),
  );
  const [settingValues, setSettingValues] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SETTINGS_ITEMS.map((item) => [item.id, item.defaultValue])),
  );

  useEffect(() => {
    setQuery("");
    setActiveFilter("all");
    setNotice(null);
  }, [routeKey]);

  const effectiveRows = useMemo(() => {
    if (routeKey !== "notifications") return config.rows;
    return config.rows.map((row) => ({
      ...row,
      status: readNotificationIds.has(String(row.id)) ? "Read" : "Unread",
    }));
  }, [config.rows, readNotificationIds, routeKey]);

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filter = config.filters.find((item) => item.value === activeFilter);
    return effectiveRows.filter((row) => {
      const matchesSearch = !search || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search));
      const matchesFilter = !filter?.match || filter.match(row);
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, config.filters, effectiveRows, query]);

  const showNotice = (message: string) => setNotice(message);

  const handlePrimaryAction = () => {
    if (routeKey === "notifications") {
      setReadNotificationIds(new Set(notifications.map((item) => item.id)));
    }
    setNotice(config.primaryPastTense);
  };

  const handleToggleSetting = (id: string) => {
    setSettingValues((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <motion.main
      className={`module-page module-page-${routeKey}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <header className="module-header">
        <div className="module-header-copy">
          <div className="module-eyebrow"><PageIcon size={15} aria-hidden="true" /> {config.eyebrow}</div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="module-actions">
          <button type="button" className="module-button module-button-secondary" onClick={() => showNotice(`${config.secondaryAction} opened`)}>
            {routeKey === "documents" ? <Download size={16} /> : <SlidersHorizontal size={16} />}
            {config.secondaryAction}
          </button>
          <button type="button" className="module-button module-button-primary" onClick={handlePrimaryAction}>
            {routeKey === "documents" ? <Upload size={16} /> : routeKey === "settings" ? <Check size={16} /> : <Plus size={16} />}
            {config.primaryAction}
          </button>
        </div>
      </header>

      <section className="module-kpis" aria-label={`${config.title} key metrics`}>
        {config.kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.article
              className={`module-kpi module-tone-${kpi.tone}`}
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * index }}
            >
              <span className="module-kpi-icon"><Icon size={18} aria-hidden="true" /></span>
              <div className="module-kpi-copy">
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.detail}</small>
              </div>
            </motion.article>
          );
        })}
      </section>

      <div className="filter-bar">
        <label className="filter-search">
          <Search size={17} aria-hidden="true" />
          <span className="data-visually-hidden">Search {config.title}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={config.searchPlaceholder} />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </label>
        <div className="filter-chips" role="group" aria-label="Filter results">
          {config.filters.map((filter) => (
            <button
              type="button"
              className={`filter-chip ${activeFilter === filter.value ? "filter-chip-active" : ""}`}
              key={filter.value}
              aria-pressed={activeFilter === filter.value}
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button type="button" className="filter-more" onClick={() => showNotice("Advanced filters opened")}>
          <Filter size={15} aria-hidden="true" /> More filters
        </button>
      </div>

      <div className="module-content-grid">
        <section className="module-data-panel">
          <div className="module-section-heading">
            <div>
              <h2>{config.sectionTitle}</h2>
              <p>{config.sectionCaption}</p>
            </div>
            <span className="module-record-count">{visibleRows.length} {visibleRows.length === 1 ? "result" : "results"}</span>
          </div>

          {config.view === "table" && (
            <ModuleDataTable rows={visibleRows} columns={config.columns} emptyText="Try a broader search or switch the selected filter." />
          )}
          {config.view === "reports" && <ReportsView rows={visibleRows} onAction={showNotice} />}
          {config.view === "notifications" && (
            <NotificationFeed
              rows={visibleRows}
              readIds={readNotificationIds}
              onRead={(id) => setReadNotificationIds((current) => new Set([...current, id]))}
            />
          )}
          {config.view === "settings" && (
            <SettingsView rows={visibleRows} values={settingValues} onToggle={handleToggleSetting} />
          )}
        </section>

        <InsightPanel insight={config.insight} onAction={showNotice} />
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            className="notice-toast"
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <span className="notice-toast-icon"><Check size={15} aria-hidden="true" /></span>
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default ModuleView;
