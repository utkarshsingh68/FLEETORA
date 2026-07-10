"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell,
  BookOpenCheck,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Command,
  CreditCard,
  FileBarChart,
  FileCheck2,
  Fuel,
  Headphones,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  ReceiptIndianRupee,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Truck,
  UserRoundCheck,
  UsersRound,
  Warehouse,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DashboardView } from "./DashboardView";
import { ModuleView } from "./ModuleView";

type AppShellProps = { route: string };

type NavItem = {
  label: string;
  route: string;
  icon: LucideIcon;
  badge?: string;
};

const navigation: { label: string; items: NavItem[] }[] = [
  {
    label: "Command center",
    items: [
      { label: "Dashboard", route: "dashboard", icon: LayoutDashboard },
      { label: "Fleet", route: "fleet", icon: Truck },
      { label: "Drivers", route: "drivers", icon: UserRoundCheck },
      { label: "Trips", route: "trips", icon: Zap, badge: "24" },
      { label: "Customers", route: "customers", icon: UsersRound },
      { label: "Vendors", route: "vendors", icon: Warehouse },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Finance", route: "finance", icon: CircleDollarSign },
      { label: "Fuel", route: "fuel", icon: Fuel },
      { label: "Maintenance", route: "maintenance", icon: Wrench },
      { label: "Documents", route: "documents", icon: FileCheck2, badge: "7" },
      { label: "Reports", route: "reports", icon: FileBarChart },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Notifications", route: "notifications", icon: Bell, badge: "9" },
      { label: "Settings", route: "settings", icon: Settings },
      { label: "Support", route: "support", icon: Headphones },
    ],
  },
];

const routeLabels = Object.fromEntries(
  navigation.flatMap((group) => group.items.map((item) => [item.route, item.label])),
);

const quickAddSchema = z.object({
  kind: z.enum(["Trip", "Truck", "Driver", "Invoice"]),
  reference: z.string().trim().min(2, "Add a short reference"),
  owner: z.string().trim().min(2, "Choose an owner"),
});

type QuickAddValues = z.infer<typeof quickAddSchema>;

function Brand() {
  return (
    <Link href="/dashboard" className="app-brand" aria-label="Fleetora dashboard">
      <span className="app-brand-mark"><Truck size={19} strokeWidth={2.1} /></span>
      <span className="app-brand-copy">
        <strong>Fleetora</strong>
        <small>Transport OS</small>
      </span>
    </Link>
  );
}

function QuickAddForm({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickAddValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { kind: "Trip", reference: "", owner: "" },
  });

  const submit = (values: QuickAddValues) => {
    onComplete(`${values.kind} “${values.reference}” is ready to review.`);
    reset();
    onClose();
  };

  return (
    <motion.div
      className="quick-drawer"
      initial={{ x: 28, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 28, opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
    >
      <div className="drawer-head">
        <div>
          <span className="drawer-kicker">Quick create</span>
          <h2 id="quick-add-title">Add to your workspace</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close quick add">
          <X size={19} />
        </button>
      </div>
      <form className="drawer-form" onSubmit={handleSubmit(submit)}>
        <label>
          <span>Record type</span>
          <select {...register("kind")}>
            <option>Trip</option>
            <option>Truck</option>
            <option>Driver</option>
            <option>Invoice</option>
          </select>
        </label>
        <label>
          <span>Reference</span>
          <input {...register("reference")} placeholder="e.g. Pune express load" autoFocus />
          {errors.reference && <small className="form-error">{errors.reference.message}</small>}
        </label>
        <label>
          <span>Owner or assignee</span>
          <input {...register("owner")} placeholder="e.g. Arjun Mehta" />
          {errors.owner && <small className="form-error">{errors.owner.message}</small>}
        </label>
        <div className="drawer-summary">
          <ShieldCheck size={18} />
          <p>You can add commercial details and documents after saving.</p>
        </div>
        <div className="drawer-actions">
          <button type="button" className="button secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary-button"><Plus size={17} /> Create record</button>
        </div>
      </form>
    </motion.div>
  );
}

export function AppShell({ route }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const activeLabel = routeLabels[route] ?? "Workspace";

  const commandItems = useMemo(() => {
    const items = navigation.flatMap((group) => group.items);
    if (!query.trim()) return items.slice(0, 8);
    const normalized = query.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setQuickOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className={`app-shell${dark ? " theme-dark" : ""}`}>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            className="sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <aside className={`app-sidebar${mobileOpen ? " is-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <button className="company-switcher" type="button">
          <span className="company-avatar">NL</span>
          <span className="company-copy"><strong>NorthStar Logistics</strong><small>Mumbai HQ</small></span>
          <ChevronDown size={15} />
        </button>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.route === route;
                return (
                  <Link
                    href={`/${item.route}`}
                    className={`nav-item${active ? " active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    key={item.route}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {item.badge && <small>{item.badge}</small>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-health">
          <div className="health-row"><span><span className="health-dot" /> System health</span><strong>99.99%</strong></div>
          <div className="health-track"><span /></div>
          <p>All services operational</p>
        </div>

        <button className="sidebar-profile" type="button">
          <span className="profile-avatar">AM</span>
          <span className="profile-copy"><strong>Arjun Mehta</strong><small>Operations admin</small></span>
          <ChevronDown size={15} />
        </button>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-context">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="breadcrumb"><span>NorthStar Logistics</span><b>/</b><strong>{activeLabel}</strong></div>
          </div>

          <div className="topbar-actions">
            <button className="global-search" onClick={() => setCommandOpen(true)} aria-label="Search Fleetora">
              <Search size={16} />
              <span>Search anything…</span>
              <kbd><Command size={11} /> K</kbd>
            </button>
            <button className="button primary-button topbar-add" onClick={() => setQuickOpen(true)}><Plus size={16} /> <span>Quick add</span></button>
            <button className="icon-button notification-button" aria-label="View notifications"><Bell size={18} /><span /></button>
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Use light theme" : "Use dark theme"}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="app-content">
          {route === "dashboard" ? (
            <DashboardView onQuickAdd={() => setQuickOpen(true)} />
          ) : (
            <ModuleView route={route} />
          )}
        </main>
      </div>

      <AnimatePresence>
        {(commandOpen || quickOpen) && (
          <motion.button
            className="modal-backdrop"
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setCommandOpen(false); setQuickOpen(false); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commandOpen && (
          <motion.div
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
          >
            <div className="command-input"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, trips, trucks, drivers…" autoFocus /><kbd>ESC</kbd></div>
            <div className="command-results">
              <span className="command-label">Navigate</span>
              {commandItems.length ? commandItems.map((item) => {
                const Icon = item.icon;
                return <Link href={`/${item.route}`} key={item.route} onClick={() => setCommandOpen(false)}><span className="command-icon"><Icon size={17} /></span><span><strong>{item.label}</strong><small>Open {item.label.toLowerCase()} workspace</small></span><b>↵</b></Link>;
              }) : <div className="command-empty">No workspace matched “{query}”.</div>}
            </div>
            <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickOpen && <QuickAddForm onClose={() => setQuickOpen(false)} onComplete={setToast} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} role="status">
            <span><Check size={15} /></span><div><strong>Saved to Fleetora</strong><p>{toast}</p></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
