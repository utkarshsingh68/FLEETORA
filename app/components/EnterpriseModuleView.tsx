"use client";

import { motion } from "framer-motion";
import { Database, Plus, Search } from "lucide-react";

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
  const title = moduleNames[route] ?? "Fleetora module";

  return (
    <motion.main className={`module-page enterprise-page enterprise-page-${route}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <header className="module-header">
        <div className="module-header-copy">
          <div className="module-eyebrow"><Database size={15} /> Live workspace</div>
          <h1>{title}</h1>
          <p>This module will display only records from its connected backend service.</p>
        </div>
        <div className="module-actions">
          <button className="module-button module-button-primary" disabled title="Backend connection required"><Plus size={16} /> Add record</button>
        </div>
      </header>

      <section className="module-kpis" aria-label={`${title} metrics`}>
        {["Total records", "Active", "Needs attention", "Updated today"].map((label) => (
          <article className="module-kpi module-tone-blue" key={label}>
            <span className="module-kpi-icon"><Database size={18} /></span>
            <div className="module-kpi-copy"><span>{label}</span><strong>0</strong><small>No live records</small></div>
          </article>
        ))}
      </section>

      <div className="module-content-grid">
        <section className="module-data-panel">
          <div className="module-section-heading"><div><h2>Operational records</h2><p>Only database records will appear here.</p></div><span className="module-record-count">0 records</span></div>
          <div className="data-empty data-empty-large"><Search size={22} /><strong>No live data yet</strong><span>This module is ready for its backend connection. No demo records are included.</span></div>
        </section>
        <aside className="panel-insight">
          <div className="panel-insight-heading"><span className="panel-insight-icon"><Database size={16} /></span><span>Live data</span></div>
          <h2>Backend connection required</h2>
          <p>Insights will be calculated only from records stored in your workspace.</p>
          <div className="panel-insight-metric"><strong>0</strong><span>live records</span></div>
        </aside>
      </div>
    </motion.main>
  );
}
