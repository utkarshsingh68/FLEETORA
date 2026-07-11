"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BatteryCharging,
  BookOpenCheck,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileSignature,
  Filter,
  Gauge,
  Handshake,
  IndianRupee,
  MapPinned,
  Plus,
  ReceiptIndianRupee,
  Search,
  ShieldCheck,
  Tags,
  TicketCheck,
  UsersRound,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

type EnterpriseRoute =
  | "brokers"
  | "accounting"
  | "fastag"
  | "gps"
  | "workshop"
  | "tyres"
  | "batteries"
  | "digital-lr"
  | "invoices"
  | "expenses"
  | "income"
  | "analytics"
  | "roles"
  | "companies"
  | "branches"
  | "audit-logs"
  | "activity-logs";

type RecordRow = {
  id: string;
  primary: string;
  secondary: string;
  detail: string;
  owner: string;
  value: string;
  status: string;
};

type EnterpriseConfig = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  primaryAction: string;
  columns: [string, string, string, string, string, string];
  kpis: Array<{ label: string; value: string; detail: string; tone: string }>;
  insight: { title: string; body: string; metric: string; label: string };
  records: RecordRow[];
};

const configs: Record<EnterpriseRoute, EnterpriseConfig> = {
  brokers: {
    title: "Broker network",
    eyebrow: "Capacity marketplace",
    description: "Manage contracted brokers, market vehicles, lane rates, advances, and settlement exposure.",
    icon: Handshake,
    primaryAction: "Add broker",
    columns: ["Broker", "Lane", "Open loads", "Contact", "Payable", "Status"],
    kpis: [
      { label: "Active brokers", value: "38", detail: "+4 this quarter", tone: "blue" },
      { label: "Market vehicles", value: "17", detail: "Available today", tone: "emerald" },
      { label: "Broker payable", value: "₹18.4L", detail: "Across 31 trips", tone: "amber" },
      { label: "On-time delivery", value: "94.8%", detail: "+2.1% vs last month", tone: "violet" },
    ],
    insight: { title: "Broker reliability", body: "Western Roadlines leads the network on documentation and on-time delivery.", metric: "4.7/5", label: "Network quality score" },
    records: [
      { id: "BR-1042", primary: "Western Roadlines", secondary: "Mumbai", detail: "Mumbai → Ahmedabad", owner: "8 loads · R. Shah", value: "₹4.82L", status: "Active" },
      { id: "BR-1038", primary: "Shree Balaji Transport", secondary: "Pune", detail: "Pune → Bengaluru", owner: "5 loads · S. Patil", value: "₹3.15L", status: "Active" },
      { id: "BR-1029", primary: "North Star Carriers", secondary: "Delhi", detail: "Delhi → Jaipur", owner: "2 loads · A. Singh", value: "₹1.28L", status: "Review" },
      { id: "BR-1017", primary: "Deccan Freight Link", secondary: "Hyderabad", detail: "Hyderabad → Chennai", owner: "4 loads · M. Rao", value: "₹2.74L", status: "Active" },
      { id: "BR-1009", primary: "Gujarat Cargo Movers", secondary: "Surat", detail: "Surat → Nagpur", owner: "1 load · P. Desai", value: "₹86K", status: "On hold" },
      { id: "BR-1004", primary: "Eastern Highway Co.", secondary: "Kolkata", detail: "Kolkata → Ranchi", owner: "3 loads · D. Sen", value: "₹1.94L", status: "Active" },
    ],
  },
  accounting: {
    title: "Accounting",
    eyebrow: "Books & compliance",
    description: "Run vouchers, journals, ledgers, GST reconciliation, bank matching, and financial close.",
    icon: BookOpenCheck,
    primaryAction: "Create voucher",
    columns: ["Voucher", "Account", "Type", "Date / owner", "Amount", "Status"],
    kpis: [
      { label: "Cash balance", value: "₹12.8L", detail: "6 cash accounts", tone: "emerald" },
      { label: "Bank balance", value: "₹1.42Cr", detail: "4 connected banks", tone: "blue" },
      { label: "GST payable", value: "₹8.65L", detail: "Due 20 Jul", tone: "amber" },
      { label: "Unreconciled", value: "23", detail: "₹4.2L value", tone: "red" },
    ],
    insight: { title: "Month-end readiness", body: "Bank reconciliation is 91% complete. Resolve nine high-value exceptions before close.", metric: "91%", label: "Reconciliation completed" },
    records: [
      { id: "JV-2607-184", primary: "Diesel expense accrual", secondary: "Journal voucher", detail: "Fuel expense", owner: "10 Jul · Priya Nair", value: "₹2.46L", status: "Posted" },
      { id: "RV-2607-092", primary: "Tata Steel receipt", secondary: "Receipt voucher", detail: "HDFC current account", owner: "10 Jul · Neha Joshi", value: "₹6.80L", status: "Reconciled" },
      { id: "PV-2607-077", primary: "Highway toll payment", secondary: "Payment voucher", detail: "FASTag clearing", owner: "09 Jul · Priya Nair", value: "₹78.4K", status: "Posted" },
      { id: "CN-2607-014", primary: "Freight rate adjustment", secondary: "Credit note", detail: "Customer adjustments", owner: "09 Jul · Arjun Mehta", value: "₹42K", status: "Approval" },
      { id: "JV-2607-169", primary: "Driver advance allocation", secondary: "Journal voucher", detail: "Employee advances", owner: "08 Jul · Priya Nair", value: "₹1.12L", status: "Posted" },
    ],
  },
  fastag: {
    title: "FASTag control",
    eyebrow: "Toll intelligence",
    description: "Monitor tag balances, toll transactions, exceptions, issuer health, and route-level toll cost.",
    icon: TicketCheck,
    primaryAction: "Recharge tags",
    columns: ["Vehicle / tag", "Issuer", "Last plaza", "Transaction", "Balance", "Status"],
    kpis: [
      { label: "Active tags", value: "47", detail: "94% fleet coverage", tone: "blue" },
      { label: "Combined balance", value: "₹2.84L", detail: "Avg ₹6,043 per tag", tone: "emerald" },
      { label: "Toll this month", value: "₹7.92L", detail: "+3.4% vs Jun", tone: "violet" },
      { label: "Low balance", value: "6", detail: "Auto-recharge queued", tone: "amber" },
    ],
    insight: { title: "Toll leakage watch", body: "Two duplicate plaza charges need review. Potential recovery is ₹7,840.", metric: "₹7.8K", label: "Recoverable exceptions" },
    records: [
      { id: "FT-MH12AB4821", primary: "MH 12 AB 4821", secondary: "NETC 3418 8842", detail: "ICICI Bank", owner: "Khalapur Toll · 10:42", value: "₹8,420", status: "Healthy" },
      { id: "FT-MH04KL1907", primary: "MH 04 KL 1907", secondary: "NETC 2921 4478", detail: "HDFC Bank", owner: "Vashi Plaza · 09:18", value: "₹1,240", status: "Low balance" },
      { id: "FT-GJ05RT7740", primary: "GJ 05 RT 7740", secondary: "NETC 7140 3082", detail: "Axis Bank", owner: "Charoti Plaza · 08:56", value: "₹6,780", status: "Healthy" },
      { id: "FT-MH14PQ2290", primary: "MH 14 PQ 2290", secondary: "NETC 5084 9917", detail: "ICICI Bank", owner: "Talegaon Plaza · 07:22", value: "₹920", status: "Low balance" },
      { id: "FT-KA01MN6632", primary: "KA 01 MN 6632", secondary: "NETC 8891 1044", detail: "SBI", owner: "Attibele Plaza · 06:48", value: "₹12,650", status: "Healthy" },
    ],
  },
  gps: {
    title: "GPS tracking",
    eyebrow: "Live control tower",
    description: "Track fleet position, movement, geofence events, route deviation, idling, and signal health.",
    icon: MapPinned,
    primaryAction: "Open live map",
    columns: ["Vehicle", "Current location", "Movement", "Driver / ping", "Trip", "Status"],
    kpis: [
      { label: "Vehicles online", value: "46/50", detail: "92% signal health", tone: "emerald" },
      { label: "Moving", value: "24", detail: "Avg 52 km/h", tone: "blue" },
      { label: "Idling", value: "7", detail: "2 above 30 min", tone: "amber" },
      { label: "Route deviations", value: "3", detail: "1 high priority", tone: "red" },
    ],
    insight: { title: "Control tower alert", body: "MH 12 AB 4821 deviated 8.4 km near Vadodara. Driver acknowledged the route update.", metric: "8.4 km", label: "Largest active deviation" },
    records: [
      { id: "GPS-4821", primary: "MH 12 AB 4821", secondary: "Ashok Leyland 3520", detail: "NH48 · Vadodara", owner: "64 km/h · 22 sec ago", value: "TR-2026-1042", status: "Moving" },
      { id: "GPS-1907", primary: "MH 04 KL 1907", secondary: "Tata Signa 4018", detail: "Talegaon MIDC", owner: "0 km/h · 41 sec ago", value: "TR-2026-1039", status: "Idling" },
      { id: "GPS-7740", primary: "GJ 05 RT 7740", secondary: "BharatBenz 3528", detail: "Surat bypass", owner: "48 km/h · 18 sec ago", value: "TR-2026-1036", status: "Moving" },
      { id: "GPS-2290", primary: "MH 14 PQ 2290", secondary: "Eicher Pro 6028", detail: "Pune workshop", owner: "Offline · 46 min ago", value: "No active trip", status: "Offline" },
      { id: "GPS-6632", primary: "KA 01 MN 6632", secondary: "Volvo FM 420", detail: "Hosur Road", owner: "57 km/h · 12 sec ago", value: "TR-2026-1032", status: "Moving" },
    ],
  },
  workshop: {
    title: "Workshop",
    eyebrow: "Service operations",
    description: "Control job cards, technicians, bays, parts, labour, estimates, and vehicle release.",
    icon: Wrench,
    primaryAction: "Open job card",
    columns: ["Job card", "Vehicle", "Work order", "Technician / bay", "Estimate", "Status"],
    kpis: [
      { label: "Open job cards", value: "14", detail: "5 due today", tone: "blue" },
      { label: "Bays occupied", value: "8/10", detail: "80% utilization", tone: "amber" },
      { label: "Parts waiting", value: "3", detail: "2 critical orders", tone: "red" },
      { label: "Avg turnaround", value: "18.6h", detail: "−2.4h this month", tone: "emerald" },
    ],
    insight: { title: "Workshop throughput", body: "Preventive jobs are completing 22% faster after the new bay scheduling workflow.", metric: "22%", label: "Turnaround improvement" },
    records: [
      { id: "JC-2607-118", primary: "Engine oil service", secondary: "JC-2607-118", detail: "MH 12 AB 4821", owner: "A. Sawant · Bay 03", value: "₹28,500", status: "In progress" },
      { id: "JC-2607-116", primary: "Brake liner replacement", secondary: "JC-2607-116", detail: "MH 04 KL 1907", owner: "R. Kadam · Bay 06", value: "₹42,800", status: "Parts waiting" },
      { id: "JC-2607-112", primary: "Electrical diagnostics", secondary: "JC-2607-112", detail: "GJ 05 RT 7740", owner: "S. More · Bay 01", value: "₹16,200", status: "Quality check" },
      { id: "JC-2607-109", primary: "Clutch overhaul", secondary: "JC-2607-109", detail: "MH 14 PQ 2290", owner: "V. Jadhav · Bay 08", value: "₹78,400", status: "Approval" },
      { id: "JC-2607-104", primary: "Scheduled inspection", secondary: "JC-2607-104", detail: "KA 01 MN 6632", owner: "P. Kumar · Bay 02", value: "₹9,600", status: "Completed" },
    ],
  },
  tyres: {
    title: "Tyre lifecycle",
    eyebrow: "Asset performance",
    description: "Track tyre purchase, fitment, rotation, tread depth, retreading, cost per kilometre, and scrap.",
    icon: Gauge,
    primaryAction: "Add tyre",
    columns: ["Tyre", "Position / vehicle", "Make & size", "Distance", "Cost / km", "Status"],
    kpis: [
      { label: "Tyres in service", value: "284", detail: "Across 50 vehicles", tone: "blue" },
      { label: "Due rotation", value: "18", detail: "Within 1,000 km", tone: "amber" },
      { label: "Retread stock", value: "12", detail: "₹3.6L recovered value", tone: "emerald" },
      { label: "Avg cost / km", value: "₹1.84", detail: "−₹0.11 vs Q1", tone: "violet" },
    ],
    insight: { title: "Tyre economy", body: "Michelin X Multi units are delivering 14% lower cost per kilometre on long-haul lanes.", metric: "14%", label: "Best fleet saving" },
    records: [
      { id: "TY-882104", primary: "TY-882104", secondary: "Front left", detail: "MH 12 AB 4821 · Michelin 295/80R22.5", owner: "68,420 km", value: "₹1.62/km", status: "Healthy" },
      { id: "TY-881972", primary: "TY-881972", secondary: "Rear outer right", detail: "MH 04 KL 1907 · Apollo 11R20", owner: "54,880 km", value: "₹1.94/km", status: "Rotate soon" },
      { id: "TY-881746", primary: "TY-881746", secondary: "Rear inner left", detail: "GJ 05 RT 7740 · Bridgestone 295/80", owner: "82,210 km", value: "₹1.72/km", status: "Retread due" },
      { id: "TY-881501", primary: "TY-881501", secondary: "Spare", detail: "KA 01 MN 6632 · CEAT 11R20", owner: "12,040 km", value: "₹2.08/km", status: "Healthy" },
      { id: "TY-880998", primary: "TY-880998", secondary: "Unassigned", detail: "JK Tyre 10.00R20", owner: "96,700 km", value: "₹2.41/km", status: "Scrap review" },
    ],
  },
  batteries: {
    title: "Battery management",
    eyebrow: "Lifecycle & warranty",
    description: "Manage battery fitment, warranty, health readings, replacements, vendor claims, and lifecycle cost.",
    icon: BatteryCharging,
    primaryAction: "Add battery",
    columns: ["Battery", "Vehicle", "Make / capacity", "Installed", "Warranty", "Status"],
    kpis: [
      { label: "Active batteries", value: "54", detail: "4 auxiliary units", tone: "blue" },
      { label: "Warranty active", value: "46", detail: "85% coverage", tone: "emerald" },
      { label: "Weak health", value: "5", detail: "Testing scheduled", tone: "amber" },
      { label: "Claims open", value: "2", detail: "₹31K recoverable", tone: "violet" },
    ],
    insight: { title: "Failure prevention", body: "Five units show low cranking voltage. Replacing two early could prevent roadside downtime.", metric: "11.5V", label: "Lowest health reading" },
    records: [
      { id: "BAT-71492", primary: "Exide Xpress XP1800", secondary: "BAT-71492", detail: "MH 12 AB 4821", owner: "12 Feb 2025", value: "7 months left", status: "Healthy" },
      { id: "BAT-70881", primary: "Amaron Hi Life", secondary: "BAT-70881", detail: "MH 04 KL 1907", owner: "04 Nov 2024", value: "4 months left", status: "Weak" },
      { id: "BAT-70544", primary: "Tata Green TG180", secondary: "BAT-70544", detail: "GJ 05 RT 7740", owner: "22 Aug 2024", value: "Claim raised", status: "Warranty claim" },
      { id: "BAT-70119", primary: "Exide Xpress XP1500", secondary: "BAT-70119", detail: "KA 01 MN 6632", owner: "17 Jun 2025", value: "16 months left", status: "Healthy" },
      { id: "BAT-69982", primary: "Amaron Pro Ride", secondary: "BAT-69982", detail: "MH 14 PQ 2290", owner: "03 Apr 2024", value: "Expired", status: "Replace" },
    ],
  },
  "digital-lr": {
    title: "Digital LR",
    eyebrow: "Paperless consignment",
    description: "Create, approve, share, track, and archive legally structured lorry receipts with e-signatures.",
    icon: FileSignature,
    primaryAction: "Create LR",
    columns: ["LR number", "Consignor / consignee", "Route", "Vehicle / date", "Freight", "Status"],
    kpis: [
      { label: "LRs this month", value: "1,042", detail: "+8.7% vs Jun", tone: "blue" },
      { label: "Digitally signed", value: "96.2%", detail: "1,002 documents", tone: "emerald" },
      { label: "POD pending", value: "41", detail: "12 beyond SLA", tone: "amber" },
      { label: "Paper saved", value: "8,336", detail: "Sheets this year", tone: "violet" },
    ],
    insight: { title: "Paperless adoption", body: "Three branches are now fully digital. Nagpur is 18 LRs away from 100% adoption.", metric: "96.2%", label: "Digital completion" },
    records: [
      { id: "LR-2607-1042", primary: "LR-2607-1042", secondary: "Tata Steel Ltd.", detail: "Mumbai → Ahmedabad", owner: "MH 12 AB 4821 · 10 Jul", value: "₹84,600", status: "In transit" },
      { id: "LR-2607-1039", primary: "LR-2607-1039", secondary: "Asian Paints Ltd.", detail: "Pune → Bengaluru", owner: "MH 04 KL 1907 · 10 Jul", value: "₹72,400", status: "Signed" },
      { id: "LR-2607-1036", primary: "LR-2607-1036", secondary: "Reliance Retail", detail: "Surat → Nagpur", owner: "GJ 05 RT 7740 · 09 Jul", value: "₹61,800", status: "POD pending" },
      { id: "LR-2607-1032", primary: "LR-2607-1032", secondary: "Bosch India", detail: "Bengaluru → Chennai", owner: "KA 01 MN 6632 · 09 Jul", value: "₹49,200", status: "Delivered" },
      { id: "LR-2607-1028", primary: "LR-2607-1028", secondary: "UltraTech Cement", detail: "Nashik → Indore", owner: "MH 15 CD 1184 · 08 Jul", value: "₹77,900", status: "In transit" },
    ],
  },
  invoices: {
    title: "Invoices",
    eyebrow: "Billing operations",
    description: "Generate GST-compliant invoices, manage e-invoicing, credit notes, collections, and reconciliation.",
    icon: ReceiptIndianRupee,
    primaryAction: "Create invoice",
    columns: ["Invoice", "Customer", "Trip / issue date", "Due date", "Amount", "Status"],
    kpis: [
      { label: "Billed this month", value: "₹1.28Cr", detail: "184 invoices", tone: "blue" },
      { label: "Collected", value: "₹92.4L", detail: "72.2% collection", tone: "emerald" },
      { label: "Outstanding", value: "₹35.6L", detail: "47 invoices", tone: "amber" },
      { label: "Overdue", value: "₹8.9L", detail: "12 invoices", tone: "red" },
    ],
    insight: { title: "Collections forecast", body: "₹18.2L is expected within seven days based on customer payment patterns.", metric: "₹18.2L", label: "Expected this week" },
    records: [
      { id: "INV-2607-184", primary: "INV-2607-184", secondary: "Tata Steel Ltd.", detail: "TR-2026-1042 · 10 Jul", owner: "25 Jul 2026", value: "₹84,600", status: "Sent" },
      { id: "INV-2607-181", primary: "INV-2607-181", secondary: "Asian Paints Ltd.", detail: "TR-2026-1039 · 10 Jul", owner: "24 Jul 2026", value: "₹72,400", status: "Paid" },
      { id: "INV-2607-177", primary: "INV-2607-177", secondary: "Reliance Retail", detail: "TR-2026-1036 · 09 Jul", owner: "09 Jul 2026", value: "₹61,800", status: "Overdue" },
      { id: "INV-2607-172", primary: "INV-2607-172", secondary: "Bosch India", detail: "TR-2026-1032 · 09 Jul", owner: "23 Jul 2026", value: "₹49,200", status: "Partial" },
      { id: "INV-2607-168", primary: "INV-2607-168", secondary: "UltraTech Cement", detail: "TR-2026-1028 · 08 Jul", owner: "22 Jul 2026", value: "₹77,900", status: "Draft" },
    ],
  },
  expenses: {
    title: "Expense management",
    eyebrow: "Cost governance",
    description: "Capture, approve, allocate, audit, and reimburse trip, fleet, branch, and administrative expenses.",
    icon: CircleDollarSign,
    primaryAction: "Add expense",
    columns: ["Expense", "Category", "Allocation", "Submitted by", "Amount", "Status"],
    kpis: [
      { label: "Expenses this month", value: "₹48.6L", detail: "Fuel is 61%", tone: "amber" },
      { label: "Pending approval", value: "₹3.4L", detail: "19 requests", tone: "red" },
      { label: "Budget utilized", value: "72.8%", detail: "10 days remaining", tone: "blue" },
      { label: "Savings found", value: "₹1.2L", detail: "Duplicate prevention", tone: "emerald" },
    ],
    insight: { title: "Cost exception", body: "Loading charges on the Pune lane are 13% above the negotiated benchmark.", metric: "+13%", label: "Lane cost variance" },
    records: [
      { id: "EXP-2607-842", primary: "HPCL diesel purchase", secondary: "Fuel", detail: "TR-2026-1042", owner: "Rahul Verma · 10 Jul", value: "₹48,600", status: "Approved" },
      { id: "EXP-2607-839", primary: "Driver trip advance", secondary: "Allowance", detail: "TR-2026-1039", owner: "Amit Pawar · 10 Jul", value: "₹12,000", status: "Paid" },
      { id: "EXP-2607-831", primary: "Emergency tyre repair", secondary: "Maintenance", detail: "MH 12 AB 4821", owner: "Karan Singh · 09 Jul", value: "₹18,500", status: "Approval" },
      { id: "EXP-2607-824", primary: "Warehouse loading", secondary: "Trip expense", detail: "TR-2026-1036", owner: "Mahesh Rao · 09 Jul", value: "₹9,800", status: "Approved" },
      { id: "EXP-2607-812", primary: "Branch office internet", secondary: "Administration", detail: "Pune branch", owner: "Sneha Kulkarni · 08 Jul", value: "₹6,400", status: "Rejected" },
    ],
  },
  income: {
    title: "Income management",
    eyebrow: "Revenue control",
    description: "Track freight income, accessorial charges, recoveries, claims, other income, and receipt allocation.",
    icon: IndianRupee,
    primaryAction: "Record income",
    columns: ["Receipt", "Source", "Reference", "Received by", "Amount", "Status"],
    kpis: [
      { label: "Income this month", value: "₹1.36Cr", detail: "+9.4% vs Jun", tone: "emerald" },
      { label: "Freight revenue", value: "₹1.28Cr", detail: "94.1% of income", tone: "blue" },
      { label: "Other income", value: "₹8.1L", detail: "Claims & recoveries", tone: "violet" },
      { label: "Unallocated", value: "₹2.6L", detail: "7 receipts", tone: "amber" },
    ],
    insight: { title: "Revenue quality", body: "Accessorial recovery improved after automated detention-charge calculations.", metric: "+₹2.4L", label: "Additional recovery" },
    records: [
      { id: "RCPT-2607-092", primary: "Tata Steel remittance", secondary: "Freight receipt", detail: "INV-2607-142", owner: "HDFC · Neha Joshi", value: "₹6.80L", status: "Allocated" },
      { id: "RCPT-2607-089", primary: "Asian Paints remittance", secondary: "Freight receipt", detail: "INV-2607-139", owner: "ICICI · Neha Joshi", value: "₹4.72L", status: "Allocated" },
      { id: "RCPT-2607-087", primary: "Insurance claim recovery", secondary: "Claims income", detail: "CLM-2606-018", owner: "SBI · Priya Nair", value: "₹1.28L", status: "Reconciled" },
      { id: "RCPT-2607-082", primary: "Detention recovery", secondary: "Accessorial", detail: "TR-2026-0982", owner: "HDFC · Priya Nair", value: "₹42K", status: "Allocated" },
      { id: "RCPT-2607-078", primary: "Unknown bank credit", secondary: "Unidentified", detail: "UTR N18400291", owner: "Axis · Auto import", value: "₹88K", status: "Unallocated" },
    ],
  },
  analytics: {
    title: "Analytics studio",
    eyebrow: "Decision intelligence",
    description: "Explore revenue, profitability, utilization, fuel, customer, lane, and operational performance.",
    icon: BarChart3,
    primaryAction: "Create analysis",
    columns: ["Analysis", "Scope", "Period", "Owner", "Key result", "Status"],
    kpis: [
      { label: "Revenue growth", value: "+12.4%", detail: "Trailing 12 months", tone: "emerald" },
      { label: "Profit margin", value: "21.6%", detail: "+1.8 pts YoY", tone: "blue" },
      { label: "Fleet utilization", value: "84.2%", detail: "+3.7 pts this quarter", tone: "violet" },
      { label: "Cost / km", value: "₹38.42", detail: "−₹1.26 vs Jun", tone: "amber" },
    ],
    insight: { title: "Best growth opportunity", body: "Mumbai–Ahmedabad industrial loads show 8.2% higher contribution margin than fleet average.", metric: "+8.2%", label: "Lane margin advantage" },
    records: [
      { id: "AN-042", primary: "Lane profitability", secondary: "Finance + trips", detail: "Top 25 lanes", owner: "Jul 2026 · Karan Singh", value: "+4.8% margin", status: "Live" },
      { id: "AN-039", primary: "Customer revenue concentration", secondary: "CRM + finance", detail: "All customers", owner: "FY 2026–27 · Priya Nair", value: "42% top five", status: "Live" },
      { id: "AN-037", primary: "Fuel economy cohort", secondary: "Fuel + fleet", detail: "Heavy trucks", owner: "Q2 2026 · Arjun Mehta", value: "4.6 km/L", status: "Live" },
      { id: "AN-031", primary: "Driver performance index", secondary: "Drivers + GPS", detail: "100 drivers", owner: "Jun 2026 · Sneha Kulkarni", value: "87.4 score", status: "Scheduled" },
      { id: "AN-028", primary: "Workshop downtime", secondary: "Maintenance", detail: "All workshops", owner: "Q2 2026 · Karan Singh", value: "−12.6%", status: "Archived" },
    ],
  },
  roles: {
    title: "Roles & permissions",
    eyebrow: "Access governance",
    description: "Control role templates, granular permissions, data scope, approvals, and segregation of duties.",
    icon: ShieldCheck,
    primaryAction: "Create role",
    columns: ["Role", "Scope", "Users", "Permission level", "Updated", "Status"],
    kpis: [
      { label: "Role templates", value: "11", detail: "8 standard · 3 custom", tone: "blue" },
      { label: "Active users", value: "64", detail: "Across 6 branches", tone: "emerald" },
      { label: "Permission rules", value: "186", detail: "14 approval controls", tone: "violet" },
      { label: "Access reviews", value: "5", detail: "Due this month", tone: "amber" },
    ],
    insight: { title: "Least privilege", body: "Three dormant users still hold finance export permission and should be reviewed.", metric: "3 users", label: "Access review required" },
    records: [
      { id: "ROLE-OWNER", primary: "Company Admin", secondary: "System role", detail: "Company-wide", owner: "4 users", value: "Full control", status: "Protected" },
      { id: "ROLE-DISPATCH", primary: "Dispatcher", secondary: "System role", detail: "Assigned branches", owner: "18 users", value: "Operations write", status: "Active" },
      { id: "ROLE-FLEET", primary: "Fleet Manager", secondary: "System role", detail: "Fleet & workshop", owner: "7 users", value: "Fleet write", status: "Active" },
      { id: "ROLE-ACCT", primary: "Accountant", secondary: "System role", detail: "Finance & reports", owner: "9 users", value: "Finance write", status: "Active" },
      { id: "ROLE-BRANCH", primary: "Branch Manager", secondary: "Custom role", detail: "Single branch", owner: "6 users", value: "Branch admin", status: "Review" },
    ],
  },
  companies: {
    title: "Company management",
    eyebrow: "Enterprise structure",
    description: "Manage legal entities, GST registrations, books, fiscal settings, branding, and operating policies.",
    icon: Building2,
    primaryAction: "Add company",
    columns: ["Company", "Registration", "Head office", "Operations", "Revenue", "Status"],
    kpis: [
      { label: "Legal entities", value: "3", detail: "2 active · 1 holding", tone: "blue" },
      { label: "GST registrations", value: "8", detail: "Across 6 states", tone: "emerald" },
      { label: "Consolidated fleet", value: "68", detail: "50 owned · 18 market", tone: "violet" },
      { label: "Compliance tasks", value: "7", detail: "Due in 30 days", tone: "amber" },
    ],
    insight: { title: "Group governance", body: "All entities are compliant. One Maharashtra GST amendment is awaiting approval.", metric: "98%", label: "Group compliance score" },
    records: [
      { id: "CO-001", primary: "NorthStar Logistics Pvt. Ltd.", secondary: "27AAECF2847D1Z8", detail: "Mumbai, Maharashtra", owner: "6 branches · 50 vehicles", value: "₹18.4Cr", status: "Active" },
      { id: "CO-002", primary: "NorthStar Warehousing LLP", secondary: "27AAVFN8821B1ZP", detail: "Pune, Maharashtra", owner: "2 warehouses · 46 staff", value: "₹4.2Cr", status: "Active" },
      { id: "CO-003", primary: "NorthStar Holdings Pvt. Ltd.", secondary: "29AAHCN4408K1Z4", detail: "Bengaluru, Karnataka", owner: "Holding company", value: "₹22.8Cr", status: "Inactive" },
    ],
  },
  branches: {
    title: "Branch management",
    eyebrow: "Operating network",
    description: "Configure branch teams, fleet allocation, cash books, territories, approvals, and performance targets.",
    icon: Warehouse,
    primaryAction: "Add branch",
    columns: ["Branch", "Territory", "Manager", "Fleet / staff", "Monthly revenue", "Status"],
    kpis: [
      { label: "Active branches", value: "6", detail: "Across 5 states", tone: "blue" },
      { label: "Branch staff", value: "64", detail: "9 open positions", tone: "emerald" },
      { label: "Allocated fleet", value: "50", detail: "100% assigned", tone: "violet" },
      { label: "Target attainment", value: "92.4%", detail: "4 branches on target", tone: "amber" },
    ],
    insight: { title: "Top branch", body: "Mumbai HQ leads revenue and fleet utilization, while Nagpur has the best cost per kilometre.", metric: "₹4.8Cr", label: "Mumbai monthly revenue" },
    records: [
      { id: "BR-MUM", primary: "Mumbai HQ", secondary: "Maharashtra West", detail: "Karan Singh", owner: "18 vehicles · 22 staff", value: "₹4.8Cr", status: "Active" },
      { id: "BR-PUN", primary: "Pune Branch", secondary: "Maharashtra South", detail: "Sneha Kulkarni", owner: "10 vehicles · 12 staff", value: "₹2.9Cr", status: "Active" },
      { id: "BR-NAG", primary: "Nagpur Branch", secondary: "Central India", detail: "Amit Deshmukh", owner: "8 vehicles · 9 staff", value: "₹2.2Cr", status: "Active" },
      { id: "BR-AHM", primary: "Ahmedabad Branch", secondary: "Gujarat", detail: "Rakesh Shah", owner: "7 vehicles · 8 staff", value: "₹1.9Cr", status: "Active" },
      { id: "BR-BLR", primary: "Bengaluru Branch", secondary: "Karnataka", detail: "Maya Rao", owner: "7 vehicles · 8 staff", value: "₹2.1Cr", status: "Review" },
      { id: "BR-DEL", primary: "Delhi Desk", secondary: "North India", detail: "Ankit Singh", owner: "Market fleet · 5 staff", value: "₹88L", status: "Active" },
    ],
  },
  "audit-logs": {
    title: "Audit logs",
    eyebrow: "Security & compliance",
    description: "Review immutable changes to financial, operational, access, and master data with full attribution.",
    icon: ShieldCheck,
    primaryAction: "Export audit log",
    columns: ["Event", "Resource", "Change", "Actor", "Timestamp", "Risk"],
    kpis: [
      { label: "Events today", value: "1,284", detail: "Across all modules", tone: "blue" },
      { label: "Sensitive changes", value: "17", detail: "All reviewed", tone: "amber" },
      { label: "Access changes", value: "6", detail: "2 admin grants", tone: "violet" },
      { label: "Policy alerts", value: "0", detail: "No active violations", tone: "emerald" },
    ],
    insight: { title: "Audit posture", body: "No unreviewed high-risk changes. The latest finance export was authorized by two approvers.", metric: "100%", label: "High-risk reviews complete" },
    records: [
      { id: "AUD-90882", primary: "Invoice updated", secondary: "INV-2607-184", detail: "due_date: 20 Jul → 25 Jul", owner: "Priya Nair", value: "10 Jul · 12:44", status: "Low" },
      { id: "AUD-90879", primary: "Permission granted", secondary: "ROLE-ACCT", detail: "reports.export_pdf", owner: "Karan Singh", value: "10 Jul · 12:31", status: "High" },
      { id: "AUD-90871", primary: "Trip freight changed", secondary: "TR-2026-1042", detail: "₹82,000 → ₹84,600", owner: "Arjun Mehta", value: "10 Jul · 12:12", status: "Medium" },
      { id: "AUD-90864", primary: "Vehicle status changed", secondary: "MH 14 PQ 2290", detail: "available → maintenance", owner: "Karan Singh", value: "10 Jul · 11:58", status: "Low" },
      { id: "AUD-90856", primary: "Bank export generated", secondary: "FIN-EXPORT-209", detail: "184 payment rows", owner: "Neha Joshi", value: "10 Jul · 11:42", status: "Medium" },
    ],
  },
  "activity-logs": {
    title: "Activity logs",
    eyebrow: "Operational timeline",
    description: "Follow user actions, automations, background jobs, notifications, imports, and system integrations.",
    icon: Activity,
    primaryAction: "Configure events",
    columns: ["Activity", "Module", "Context", "Initiated by", "Timestamp", "Status"],
    kpis: [
      { label: "Activities today", value: "3,842", detail: "64 active users", tone: "blue" },
      { label: "Automations", value: "1,207", detail: "31% of activity", tone: "violet" },
      { label: "Jobs completed", value: "99.7%", detail: "3 retries pending", tone: "emerald" },
      { label: "Integration errors", value: "2", detail: "FASTag sync retrying", tone: "amber" },
    ],
    insight: { title: "System throughput", body: "Document reminders and payment nudges generated 476 automated actions today.", metric: "476", label: "Automated communications" },
    records: [
      { id: "ACT-44182", primary: "Trip dispatched", secondary: "Trips", detail: "TR-2026-1042 assigned", owner: "Arjun Mehta", value: "12:46:22", status: "Success" },
      { id: "ACT-44179", primary: "Document alert sent", secondary: "Notifications", detail: "Insurance expiry · MH 14 PQ 2290", owner: "Automation", value: "12:45:04", status: "Success" },
      { id: "ACT-44171", primary: "FASTag transactions synced", secondary: "FASTag", detail: "47 tags · 182 transactions", owner: "Scheduled job", value: "12:40:00", status: "Retry" },
      { id: "ACT-44164", primary: "Invoice exported", secondary: "Invoices", detail: "INV-2607-184 · PDF", owner: "Priya Nair", value: "12:36:47", status: "Success" },
      { id: "ACT-44155", primary: "GPS geofence entered", secondary: "GPS", detail: "MH 12 AB 4821 · Ahmedabad DC", owner: "GPS integration", value: "12:31:18", status: "Success" },
    ],
  },
};

export const enterpriseRoutes = new Set<string>(Object.keys(configs));

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function EnterpriseModuleView({ route }: { route: string }) {
  const config = configs[route as EnterpriseRoute] ?? configs.analytics;
  const Icon = config.icon;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(config.records);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pageSize = 5;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery = !q || Object.values(record).some((value) => value.toLowerCase().includes(q));
      const normalizedStatus = record.status.toLowerCase();
      const matchesFilter = filter === "all" || (filter === "active" ? /active|healthy|success|live|posted|paid|signed|moving|completed|allocated|protected|reconciled/.test(normalizedStatus) : !/active|healthy|success|live|posted|paid|signed|moving|completed|allocated|protected|reconciled/.test(normalizedStatus));
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, records]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportCsv() {
    const rows = [config.columns, ...filtered.map((record) => [record.primary, record.secondary, record.detail, record.owner, record.value, record.status])];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fleetora-${route}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(`${config.title} exported as CSV`);
  }

  function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const primary = String(form.get("primary") ?? "New record");
    const reference = String(form.get("reference") ?? "Manual entry");
    setRecords((current) => [{ id: `NEW-${Date.now()}`, primary, secondary: reference, detail: "New ERP record", owner: "Created just now", value: "—", status: "Draft" }, ...current]);
    setCreating(false);
    setPage(1);
    setToast(`${primary} created successfully`);
  }

  return (
    <motion.main className={`module-page enterprise-page enterprise-page-${route}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <header className="module-header">
        <div className="module-header-copy">
          <div className="module-eyebrow"><Icon size={15} /> {config.eyebrow}</div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="module-actions">
          <button className="module-button module-button-secondary" onClick={exportCsv}><Download size={16} /> Export CSV</button>
          <button className="module-button module-button-primary" onClick={() => setCreating(true)}><Plus size={16} /> {config.primaryAction}</button>
        </div>
      </header>

      <section className="module-kpis" aria-label={`${config.title} metrics`}>
        {config.kpis.map((kpi, index) => (
          <motion.article className={`module-kpi module-tone-${kpi.tone}`} key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}>
            <span className="module-kpi-icon"><Icon size={18} /></span>
            <div className="module-kpi-copy"><span>{kpi.label}</span><strong>{kpi.value}</strong><small>{kpi.detail}</small></div>
          </motion.article>
        ))}
      </section>

      <div className="filter-bar">
        <label className="filter-search"><Search size={17} /><span className="data-visually-hidden">Search</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Search ${config.title.toLowerCase()}…`} />{query && <button onClick={() => setQuery("")}><X size={14} /></button>}</label>
        <div className="filter-chips">
          {[{ id: "all", label: "All records" }, { id: "active", label: "Healthy / active" }, { id: "attention", label: "Needs attention" }].map((item) => <button key={item.id} className={`filter-chip ${filter === item.id ? "filter-chip-active" : ""}`} onClick={() => { setFilter(item.id); setPage(1); }}>{item.label}</button>)}
        </div>
        <button className="filter-more" onClick={() => setToast("Advanced filters are ready for configuration")}><Filter size={15} /> More filters</button>
      </div>

      <div className="module-content-grid">
        <section className="module-data-panel">
          <div className="module-section-heading"><div><h2>Operational records</h2><p>Live working set with search, filters, export, and pagination.</p></div><span className="module-record-count">{filtered.length} records</span></div>
          <div className="data-table-wrap">
            <table className="data-table enterprise-table">
              <thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td><span className="data-primary-cell"><strong>{record.primary}</strong><small>{record.id}</small></span></td>
                    <td className="data-muted">{record.secondary}</td>
                    <td>{record.detail}</td>
                    <td className="data-muted">{record.owner}</td>
                    <td><strong>{record.value}</strong></td>
                    <td><span className={`status-pill status-${slug(record.status)}`}><span className="status-dot" />{record.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <div className="data-empty data-empty-large"><Search size={22} /><strong>No matching records</strong><span>Change the search or selected filter.</span></div>}
          </div>
          <footer className="enterprise-pagination"><span>Page {page} of {pageCount}</span><div><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} /> Previous</button><button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next <ChevronRight size={15} /></button></div></footer>
        </section>

        <aside className="panel-insight">
          <div className="panel-insight-heading"><span className="panel-insight-icon"><BarChart3 size={16} /></span><span>Fleetora intelligence</span></div>
          <h2>{config.insight.title}</h2><p>{config.insight.body}</p>
          <div className="panel-insight-metric"><strong>{config.insight.metric}</strong><span>{config.insight.label}</span></div>
          <div className="panel-insight-list"><div className="panel-insight-item"><span>Records in view</span><strong>{filtered.length}</strong></div><div className="panel-insight-item"><span>Healthy / active</span><strong className="panel-tone-emerald">{records.filter((record) => /active|healthy|success|live|posted|paid|moving|completed/.test(record.status.toLowerCase())).length}</strong></div><div className="panel-insight-item"><span>Needs attention</span><strong className="panel-tone-amber">{records.filter((record) => /review|low|pending|approval|retry|weak|overdue/.test(record.status.toLowerCase())).length}</strong></div></div>
          <button className="panel-insight-action" onClick={() => setToast("Detailed analysis opened")}>Open detailed analysis <ChevronRight size={15} /></button>
        </aside>
      </div>

      <AnimatePresence>
        {creating && <><motion.button className="modal-backdrop" aria-label="Close" onClick={() => setCreating(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.form className="enterprise-create-dialog" onSubmit={createRecord} initial={{ opacity: 0, scale: .97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }}><div className="enterprise-dialog-head"><div><span>Create ERP record</span><h2>{config.primaryAction}</h2></div><button type="button" onClick={() => setCreating(false)}><X size={18} /></button></div><label><span>Name or title</span><input name="primary" required autoFocus placeholder={`Enter ${config.title.toLowerCase()} name`} /></label><label><span>Reference</span><input name="reference" required placeholder="Reference, code, or assignment" /></label><div className="drawer-summary"><ShieldCheck size={18} /><p>Role permissions and audit attribution are applied when this record is saved.</p></div><div className="drawer-actions"><button type="button" className="button secondary-button" onClick={() => setCreating(false)}>Cancel</button><button type="submit" className="button primary-button"><Check size={16} /> Create record</button></div></motion.form></>}
      </AnimatePresence>

      <AnimatePresence>{toast && <motion.div className="notice-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span className="notice-toast-icon"><Check size={15} /></span><span>{toast}</span><button onClick={() => setToast(null)}><X size={14} /></button></motion.div>}</AnimatePresence>
    </motion.main>
  );
}
