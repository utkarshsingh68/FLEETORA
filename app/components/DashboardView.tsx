"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  IndianRupee,
  MapPin,
  Navigation,
  Plus,
  ReceiptText,
  Route,
  ShieldAlert,
  Truck,
  UserPlus,
  WalletCards,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Chart, Doughnut } from "react-chartjs-2";
import {
  companyProfile,
  dashboardKpis,
  documentExpiries,
  formatCompactINR,
  formatINR,
  monthlyPerformance,
  notifications,
  quickActions,
  recentTrips,
  tripStatusBreakdown,
} from "../lib/data";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const kpiIcons: Record<string, LucideIcon> = {
  revenue: IndianRupee,
  "active-trips": Navigation,
  "fleet-availability": Truck,
  receivables: Clock3,
};

const quickActionIcons: Record<string, LucideIcon> = {
  "create-trip": Route,
  "add-driver": UserPlus,
  "add-truck": Truck,
  "generate-invoice": ReceiptText,
};

const notificationIcons: Record<string, LucideIcon> = {
  trip: Route,
  document: FileText,
  payment: WalletCards,
  driver: UserPlus,
  maintenance: Wrench,
};

const displayKpis = dashboardKpis.slice(0, 4);
const displayTrips = recentTrips.slice(0, 5);
const displayExpiries = documentExpiries.slice(0, 4);
const displayNotifications = notifications.slice(0, 4);

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const toClassToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const revenueChartData: ChartData<"bar" | "line"> = {
  labels: monthlyPerformance.map((point) => point.month),
  datasets: [
    {
      type: "bar",
      label: "Revenue",
      data: monthlyPerformance.map((point) => point.revenue),
      backgroundColor: "rgba(47, 111, 237, 0.82)",
      borderColor: "#2f6fed",
      borderWidth: 0,
      borderRadius: 8,
      borderSkipped: false,
      barPercentage: 0.62,
      categoryPercentage: 0.76,
      maxBarThickness: 28,
      yAxisID: "y",
    },
    {
      type: "line",
      label: "Profit",
      data: monthlyPerformance.map((point) => point.profit),
      borderColor: "#18a67a",
      backgroundColor: "rgba(24, 166, 122, 0.14)",
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBorderWidth: 3,
      pointHoverBackgroundColor: "#ffffff",
      tension: 0.36,
      fill: false,
      yAxisID: "y1",
    },
  ],
};

const revenueChartOptions: ChartOptions<"bar" | "line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  animation: { duration: 650 },
  plugins: {
    legend: {
      align: "end",
      labels: {
        boxWidth: 9,
        boxHeight: 9,
        color: "#475569",
        font: { family: "Inter, ui-sans-serif, system-ui", size: 12, weight: 600 },
        padding: 18,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: "#0f172a",
      bodyColor: "#e2e8f0",
      bodyFont: { family: "Inter, ui-sans-serif, system-ui", size: 12 },
      borderColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      caretPadding: 8,
      cornerRadius: 10,
      padding: 12,
      titleColor: "#ffffff",
      titleFont: { family: "Inter, ui-sans-serif, system-ui", size: 12, weight: 700 },
      callbacks: {
        label: (context) => `${context.dataset.label}: ${formatINR(Number(context.raw))}`,
      },
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: {
        color: "#94a3b8",
        font: { family: "Inter, ui-sans-serif, system-ui", size: 11, weight: 500 },
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "rgba(148, 163, 184, 0.14)" },
      ticks: {
        color: "#94a3b8",
        font: { family: "Inter, ui-sans-serif, system-ui", size: 11 },
        maxTicksLimit: 5,
        callback: (value) => formatCompactINR(Number(value), 0),
      },
    },
    y1: {
      beginAtZero: true,
      border: { display: false },
      grid: { drawOnChartArea: false },
      position: "right",
      ticks: {
        color: "#94a3b8",
        font: { family: "Inter, ui-sans-serif, system-ui", size: 11 },
        maxTicksLimit: 5,
        callback: (value) => formatCompactINR(Number(value), 0),
      },
    },
  },
};

const tripStatusData: ChartData<"doughnut"> = {
  labels: tripStatusBreakdown.map((item) => item.label),
  datasets: [
    {
      data: tripStatusBreakdown.map((item) => item.value),
      backgroundColor: tripStatusBreakdown.map((item) => item.color),
      borderColor: "#ffffff",
      borderWidth: 4,
      hoverBorderWidth: 4,
      hoverOffset: 3,
      spacing: 1,
    },
  ],
};

const tripStatusOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "72%",
  animation: { animateRotate: true, duration: 700 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a",
      bodyColor: "#e2e8f0",
      borderColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      cornerRadius: 10,
      padding: 11,
      titleColor: "#ffffff",
      callbacks: {
        label: (context) => ` ${context.label}: ${context.formattedValue} trips`,
      },
    },
  },
};

const tripTotal = tripStatusBreakdown.reduce((sum, item) => sum + item.value, 0);

export interface DashboardViewProps {
  onQuickAdd: () => void;
}

export function DashboardView({ onQuickAdd }: DashboardViewProps) {
  const reduceMotion = useReducedMotion();
  const effectiveRevenueOptions = reduceMotion
    ? { ...revenueChartOptions, animation: false as const }
    : revenueChartOptions;
  const effectiveTripStatusOptions = reduceMotion
    ? { ...tripStatusOptions, animation: false as const }
    : tripStatusOptions;

  const reveal = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : delay },
  });

  return (
    <main className="dash-view">
      <motion.header className="dash-hero" {...reveal()}>
        <div className="dash-hero-main">
          <div className="dash-hero-copy">
            <div className="dash-eyebrow-row">
              <span className="dash-live-indicator" aria-label="Live operations online">
                <span className="dash-live-dot" aria-hidden="true" />
                Live operations
              </span>
              <span className="dash-hero-date">
                <CalendarDays size={14} aria-hidden="true" />
                Friday, 10 July 2026
              </span>
            </div>
            <h1 className="dash-title">Welcome back, Karan.</h1>
            <p className="dash-subtitle">
              {companyProfile.branch} is running smoothly. Here is today&apos;s fleet and financial pulse.
            </p>
          </div>

          <div className="dash-hero-actions" aria-label="Dashboard actions">
            <Link className="dash-button dash-button-secondary" href="/reports">
              <Download size={17} aria-hidden="true" />
              Export report
            </Link>
            <button
              className="dash-button dash-button-primary"
              onClick={onQuickAdd}
              type="button"
            >
              <Plus size={17} aria-hidden="true" />
              Create trip
            </button>
          </div>
        </div>

        <nav className="dash-command-row" aria-label="Quick actions">
          {quickActions.map((action) => {
            const Icon = quickActionIcons[action.id] ?? Activity;
            return (
              <Link
                className={`dash-command dash-command-${action.tone}`}
                href={action.href}
                key={action.id}
              >
                <span className="dash-command-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <span className="dash-command-copy">
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
                <ChevronRight className="dash-command-arrow" size={16} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </motion.header>

      <section className="dash-kpi-section" aria-labelledby="dash-kpi-title">
        <h2 className="dash-sr-only" id="dash-kpi-title">
          Key performance indicators
        </h2>
        <div className="kpi-grid">
          {displayKpis.map((kpi, index) => {
            const Icon = kpiIcons[kpi.id] ?? Activity;
            const improving = kpi.id === "receivables" ? kpi.direction === "down" : kpi.direction === "up";
            const TrendIcon = kpi.direction === "down" ? ArrowDownRight : ArrowUpRight;
            return (
              <motion.article
                className={`kpi-card kpi-tone-${kpi.tone}`}
                key={kpi.id}
                {...reveal(0.05 + index * 0.045)}
              >
                <div className="kpi-card-top">
                  <span className="kpi-label">{kpi.label}</span>
                  <span className="kpi-icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                </div>
                <strong className="kpi-value">{kpi.value}</strong>
                <div className="kpi-meta">
                  <span
                    className={`kpi-trend ${improving ? "kpi-trend-positive" : "kpi-trend-negative"}`}
                    aria-label={`${kpi.direction === "down" ? "Decreased" : "Increased"} ${kpi.change} percent`}
                  >
                    <TrendIcon size={14} aria-hidden="true" />
                    {kpi.change}%
                  </span>
                  <span className="kpi-comparison">{kpi.comparison}</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="dash-chart-grid" aria-label="Performance charts">
        <motion.article className="panel-card chart-revenue-panel" {...reveal(0.16)}>
          <div className="panel-header">
            <div className="panel-heading">
              <span className="panel-eyebrow">Financial performance</span>
              <h2>Revenue &amp; profit</h2>
              <p>Monthly earnings and operating profit across the last 12 months.</p>
            </div>
            <span className="panel-period">Aug 2025 — Jul 2026</span>
          </div>
          <div className="chart-metric-row" aria-label="Current month summary">
            <div className="chart-metric">
              <span>July revenue</span>
              <strong>{formatCompactINR(monthlyPerformance.at(-1)?.revenue ?? 0, 2)}</strong>
            </div>
            <div className="chart-metric">
              <span>Operating profit</span>
              <strong>{formatCompactINR(monthlyPerformance.at(-1)?.profit ?? 0, 2)}</strong>
            </div>
            <div className="chart-metric chart-metric-positive">
              <span>Profit margin</span>
              <strong>21.6%</strong>
            </div>
          </div>
          <p className="dash-sr-only" id="revenue-chart-description">
            Revenue increased from {formatCompactINR(monthlyPerformance[0].revenue, 2)} in August to {formatCompactINR(monthlyPerformance.at(-1)?.revenue ?? 0, 2)} in July. July profit was {formatCompactINR(monthlyPerformance.at(-1)?.profit ?? 0, 2)}.
          </p>
          <div className="chart-canvas chart-revenue-canvas">
            <Chart
              aria-describedby="revenue-chart-description"
              aria-label="Monthly revenue bars and profit line from August 2025 to July 2026"
              data={revenueChartData}
              options={effectiveRevenueOptions}
              role="img"
              type="bar"
            />
          </div>
        </motion.article>

        <motion.article className="panel-card chart-status-panel" {...reveal(0.2)}>
          <div className="panel-header">
            <div className="panel-heading">
              <span className="panel-eyebrow">Trip health</span>
              <h2>Trip status</h2>
              <p>Current monthly distribution.</p>
            </div>
            <Link className="panel-link" href="/trips">
              View trips <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="chart-doughnut-wrap">
            <div className="chart-doughnut-canvas">
              <Doughnut
                aria-label={`${tripTotal} trips: ${tripStatusBreakdown.map((item) => `${item.label} ${item.value}`).join(", ")}`}
                data={tripStatusData}
                options={effectiveTripStatusOptions}
                role="img"
              />
              <div className="chart-doughnut-center" aria-hidden="true">
                <strong>{tripTotal}</strong>
                <span>Total trips</span>
              </div>
            </div>
          </div>
          <ul className="chart-legend" aria-label="Trip status totals">
            {tripStatusBreakdown.map((item) => (
              <li className="chart-legend-item" key={item.label}>
                <span className="chart-legend-label">
                  <span
                    className="chart-legend-dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
                <span className="chart-legend-value">
                  <strong>{item.value}</strong>
                  <small>{item.percentage}%</small>
                </span>
              </li>
            ))}
          </ul>
        </motion.article>
      </section>

      <motion.section className="panel-card panel-trips" aria-labelledby="recent-trips-title" {...reveal(0.22)}>
        <div className="panel-header">
          <div className="panel-heading">
            <span className="panel-eyebrow">
              <span className="panel-live-dot" aria-hidden="true" />
              Live dispatch
            </span>
            <h2 id="recent-trips-title">Recent trips</h2>
            <p>Track movement, timing, and delivery health at a glance.</p>
          </div>
          <Link className="panel-link" href="/trips">
            View all trips <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <caption className="dash-sr-only">Five most recent Fleetora trips</caption>
            <thead>
              <tr>
                <th scope="col">Trip &amp; customer</th>
                <th scope="col">Route</th>
                <th scope="col">Truck &amp; driver</th>
                <th scope="col">Progress</th>
                <th scope="col">ETA</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="dash-sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {displayTrips.map((trip) => (
                <tr className="data-table-row" key={trip.id}>
                  <td>
                    <Link className="data-table-primary" href={`/trips/${trip.id}`}>
                      {trip.id}
                    </Link>
                    <span className="data-table-secondary">{trip.customer}</span>
                  </td>
                  <td>
                    <span className="data-table-route">
                      <MapPin size={14} aria-hidden="true" />
                      <span>
                        <strong>{trip.origin}</strong>
                        <small>{trip.destination}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="data-table-primary">{trip.vehicle}</span>
                    <span className="data-table-secondary">{trip.driver}</span>
                  </td>
                  <td>
                    <div className="data-table-progress-meta">
                      <span>{trip.progress}%</span>
                    </div>
                    <div
                      aria-label={`${trip.progress} percent complete`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={trip.progress}
                      className="data-table-progress"
                      role="progressbar"
                    >
                      <span style={{ width: `${trip.progress}%` }} />
                    </div>
                  </td>
                  <td>
                    <time className="data-table-date" dateTime={trip.eta}>
                      {dateTimeFormatter.format(new Date(trip.eta))}
                    </time>
                  </td>
                  <td>
                    <span className={`status-pill status-${toClassToken(trip.status)}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      aria-label={`Open trip ${trip.id}`}
                      className="data-table-action"
                      href={`/trips/${trip.id}`}
                    >
                      <ChevronRight size={17} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      <section className="dash-bottom-grid" aria-label="Compliance and recent activity">
        <motion.article className="panel-card panel-documents" {...reveal(0.24)}>
          <div className="panel-header">
            <div className="panel-heading">
              <span className="panel-eyebrow">Compliance watch</span>
              <h2>Documents expiring soon</h2>
              <p>Renew high-priority documents before they interrupt dispatch.</p>
            </div>
            <Link className="panel-link" href="/documents">
              Manage <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className="panel-list">
            {displayExpiries.map((document) => {
              const urgent = document.urgency === "Critical";
              return (
                <li className="panel-list-item" key={document.id}>
                  <span
                    className={`panel-list-icon ${urgent ? "panel-list-icon-critical" : "panel-list-icon-warning"}`}
                    aria-hidden="true"
                  >
                    {urgent ? <ShieldAlert size={18} /> : <FileText size={18} />}
                  </span>
                  <span className="panel-list-copy">
                    <strong>{document.documentType} · {document.asset}</strong>
                    <span>
                      {document.owner} · Expires {dateFormatter.format(new Date(`${document.expiryDate}T12:00:00+05:30`))}
                    </span>
                  </span>
                  <span className={`status-countdown status-${toClassToken(document.urgency)}`}>
                    {document.daysLeft} days
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="panel-callout">
            <CheckCircle2 size={17} aria-hidden="true" />
            <span><strong>94% fleet compliant</strong> · 47 of 50 vehicles are dispatch-ready.</span>
          </div>
        </motion.article>

        <motion.article className="panel-card panel-activity" {...reveal(0.27)}>
          <div className="panel-header">
            <div className="panel-heading">
              <span className="panel-eyebrow">Operations feed</span>
              <h2>Recent activity</h2>
              <p>Important updates from across your workspace.</p>
            </div>
            <Link className="panel-link" href="/notifications">
              View all <Bell size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className="panel-list panel-activity-list">
            {displayNotifications.map((item) => {
              const Icon = notificationIcons[item.kind] ?? CircleAlert;
              return (
                <li className={`panel-list-item panel-activity-item ${item.unread ? "panel-activity-unread" : ""}`} key={item.id}>
                  <span className={`panel-list-icon panel-list-icon-${item.tone}`} aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <Link className="panel-list-copy" href={item.href}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </Link>
                  <time className="panel-list-time" dateTime={item.timestamp}>
                    {item.relativeTime}
                  </time>
                </li>
              );
            })}
          </ul>
          <Link className="panel-wide-action" href="/notifications">
            Open notification center
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </motion.article>
      </section>
    </main>
  );
}
