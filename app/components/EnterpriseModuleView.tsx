"use client";

import { LiveModuleView } from "./LiveModuleView";
import { TransportAccountingView, transportAccountingRoutes } from "./TransportAccountingView";

const moduleNames: Record<string, string> = {
  brokers: "Broker network",
  accounting: "Accounting",
  fastag: "FASTag control",
  gps: "GPS tracking",
  workshop: "Workshop",
  tyres: "Tyre lifecycle",
  batteries: "Battery management",
  "digital-lr": "Digital LR",
  invoices: "Invoices",
  expenses: "Expense management",
  income: "Income management",
  analytics: "Analytics studio",
  roles: "Roles & permissions",
  companies: "Company management",
  branches: "Branch management",
  "audit-logs": "Audit logs",
  "activity-logs": "Activity logs",
};

export const enterpriseRoutes = new Set(Object.keys(moduleNames));

export function EnterpriseModuleView({ route }: { route: string }) {
  return transportAccountingRoutes.has(route) ? <TransportAccountingView route={route} /> : <LiveModuleView route={route} />;
}
