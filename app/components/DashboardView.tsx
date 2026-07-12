"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Building2, CalendarDays, ChevronRight, Clock3,
  IndianRupee, MapPin, Navigation, Plus, RefreshCw, Route, Truck,
  type LucideIcon,
} from "lucide-react";
import { fleetoraApi } from "../lib/api";
import { supabase } from "../lib/supabase";

const formatCompactINR = (value: number, maximumFractionDigits = 1) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits,
}).format(value);

type DashboardKpis = { vehicles: number; runningTrips: number; customers: number; receivable: number };
type ApiTrip = {
  id: string;
  trip_number: string;
  origin: string;
  destination: string;
  status: string;
  freight_amount: number | string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
};

const quickActions: Array<{ label: string; description: string; href: string; icon: LucideIcon; tone: string }> = [
  { label: "Add vehicle", description: "Register fleet capacity", href: "/fleet?new=true", icon: Truck, tone: "violet" },
];

const statusTone: Record<string, string> = {
  in_transit: "in-transit", delivered: "delivered", delayed: "delayed",
  loading: "loading", scheduled: "scheduled", cancelled: "inactive",
};

const readableStatus = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export interface DashboardViewProps { onQuickAdd: () => void }

export function DashboardView({ onQuickAdd }: DashboardViewProps) {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [trips, setTrips] = useState<ApiTrip[]>([]);
  const [name, setName] = useState("there");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [liveKpis, liveTrips, session] = await Promise.all([
        fleetoraApi<DashboardKpis>("/dashboard/kpis"),
        fleetoraApi<ApiTrip[]>("/trips?limit=8"),
        supabase?.auth.getSession(),
      ]);
      setKpis(liveKpis);
      setTrips(liveTrips);
      const metadataName = session?.data.session?.user.user_metadata?.full_name;
      if (typeof metadataName === "string" && metadataName.trim()) setName(metadataName.trim().split(" ")[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fleetora could not load your live data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  const cards = useMemo(() => [
    { label: "Fleet vehicles", value: String(kpis?.vehicles ?? 0), icon: Truck, tone: "blue", note: "Registered vehicles" },
    { label: "Trips in transit", value: String(kpis?.runningTrips ?? 0), icon: Navigation, tone: "emerald", note: "Live operations" },
    { label: "Customers", value: String(kpis?.customers ?? 0), icon: Building2, tone: "violet", note: "Active accounts" },
    { label: "Receivables", value: formatCompactINR(Number(kpis?.receivable ?? 0), 1), icon: IndianRupee, tone: "amber", note: "Outstanding invoices" },
  ], [kpis]);

  const statusCounts = useMemo(() => trips.reduce<Record<string, number>>((counts, trip) => {
    counts[trip.status] = (counts[trip.status] ?? 0) + 1;
    return counts;
  }, {}), [trips]);

  return (
    <main className="dash-view">
      <header className="dash-hero">
        <div className="dash-hero-main">
          <div className="dash-hero-copy">
            <div className="dash-eyebrow-row">
              <span className="dash-live-indicator"><span className="dash-live-dot" />Live database</span>
              <span className="dash-hero-date"><CalendarDays size={14} />{new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</span>
            </div>
            <h1 className="dash-title">Welcome back, {name}.</h1>
            <p className="dash-subtitle">Your operational overview is loaded securely from Fleetora&apos;s live workspace.</p>
          </div>
          <div className="dash-hero-actions">
            <button className="dash-button dash-button-secondary" onClick={() => void loadDashboard()} type="button" disabled={loading}>
              <RefreshCw size={16} className={loading ? "dashboard-spin" : ""} />Refresh
            </button>
            <button className="dash-button dash-button-primary" onClick={onQuickAdd} type="button"><Plus size={17} />Add vehicle</button>
          </div>
        </div>
        <nav className="dash-command-row" aria-label="Quick actions">
          {quickActions.map(({ icon: Icon, ...action }) => (
            <Link className={`dash-command dash-command-${action.tone}`} href={action.href} key={action.label}>
              <span className="dash-command-icon"><Icon size={17} /></span>
              <span className="dash-command-copy"><strong>{action.label}</strong><small>{action.description}</small></span>
              <ChevronRight className="dash-command-arrow" size={16} />
            </Link>
          ))}
        </nav>
      </header>

      {error && (
        <section className="dashboard-live-error" role="alert">
          <Activity size={19} /><div><strong>Live data unavailable</strong><span>{error}</span></div>
          <button onClick={() => void loadDashboard()} type="button">Try again</button>
        </section>
      )}

      <section className="dash-kpi-section" aria-label="Live key performance indicators">
        <div className="kpi-grid">
          {cards.map(({ icon: Icon, ...card }) => (
            <article className={`kpi-card kpi-tone-${card.tone} ${loading ? "dashboard-skeleton" : ""}`} key={card.label}>
              <div className="kpi-card-top"><span className="kpi-label">{card.label}</span><span className="kpi-icon"><Icon size={19} /></span></div>
              <strong className="kpi-value">{loading ? "—" : card.value}</strong>
              <div className="kpi-meta"><span className="kpi-comparison">{card.note}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="dash-chart-grid" aria-label="Live trip overview">
        <article className="panel-card chart-revenue-panel">
          <div className="panel-header"><div className="panel-heading"><span className="panel-eyebrow">Real workspace</span><h2>Operational readiness</h2><p>Live records replace sample financial charts until your team adds transactions.</p></div></div>
          <div className="dashboard-readiness-grid">
            {cards.slice(0, 3).map((card) => <div key={card.label}><strong>{loading ? "—" : card.value}</strong><span>{card.label}</span></div>)}
          </div>
          {!loading && !trips.length && <div className="dashboard-empty"><Route size={24} /><strong>No trips yet</strong><span>Trip creation will appear here after its backend workflow is connected.</span></div>}
        </article>
        <article className="panel-card chart-status-panel">
          <div className="panel-header"><div className="panel-heading"><span className="panel-eyebrow">Live trip health</span><h2>Status breakdown</h2><p>Calculated from current database records.</p></div></div>
          <div className="dashboard-status-list">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div className="dashboard-status-row" key={status}><span className={`status-pill status-${statusTone[status] ?? "scheduled"}`}>{readableStatus(status)}</span><strong>{count}</strong></div>
            ))}
            {!loading && !Object.keys(statusCounts).length && <p className="dashboard-muted">No trip status data available yet.</p>}
          </div>
        </article>
      </section>

      <section className="panel-card panel-trips" aria-labelledby="recent-trips-title">
        <div className="panel-header"><div className="panel-heading"><span className="panel-eyebrow">Database records</span><h2 id="recent-trips-title">Recent trips</h2><p>Latest transport activity from Supabase.</p></div><Link className="panel-link" href="/trips">View all <ArrowRight size={14} /></Link></div>
        <div className="data-table-wrap">
          <table className="data-table"><thead><tr><th>Trip</th><th>Route</th><th>Freight</th><th>Schedule</th><th>Status</th><th /></tr></thead>
            <tbody>{trips.map((trip) => (
              <tr key={trip.id}><td><Link className="data-table-primary" href={`/trips/${trip.id}`}>{trip.trip_number}</Link><span className="data-table-secondary">Live record</span></td>
                <td><span className="data-table-route"><MapPin size={14} /><span><strong>{trip.origin}</strong><small>{trip.destination}</small></span></span></td>
                <td>{formatCompactINR(Number(trip.freight_amount), 1)}</td>
                <td>{trip.scheduled_end_at ? dateFormatter.format(new Date(trip.scheduled_end_at)) : "Not scheduled"}</td>
                <td><span className={`status-pill status-${statusTone[trip.status] ?? "scheduled"}`}>{readableStatus(trip.status)}</span></td>
                <td><Link className="data-table-action" href={`/trips/${trip.id}`}><ChevronRight size={17} /></Link></td></tr>
            ))}</tbody>
          </table>
          {!loading && !trips.length && <div className="dashboard-table-empty"><Clock3 size={20} /><span>No trip records found.</span></div>}
        </div>
      </section>
    </main>
  );
}
