"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  ArchiveRestore,
  BarChart3,
  BatteryCharging,
  Bell,
  BookOpenCheck,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Command,
  CreditCard,
  FileSignature,
  FileBarChart,
  FileCheck2,
  Fuel,
  Gauge,
  Handshake,
  Headphones,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  MapPinned,
  Moon,
  Plus,
  Pencil,
  ReceiptIndianRupee,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Truck,
  Phone,
  TicketCheck,
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
import { EnterpriseModuleView, enterpriseRoutes } from "./EnterpriseModuleView";
import { supabase } from "../lib/supabase";
import { fleetoraApi } from "../lib/api";
import { AccessContext, type FleetoraRole } from "../lib/access";

type AppShellProps = { route: string };
type WorkspaceContext = { activeCompanyId: string; memberships: Array<{ company_id: string; branch_id?: string | null; role: string; companies?: { id: string; name: string; legal_name?: string | null } | null }>; branches: Array<{ id: string; name: string; code: string }> };
type PortalContext = { companyId: string; customerId: string | null; role: string; customer: { id: string; name: string; contact_name?: string | null; email?: string | null; phone?: string | null } | null };

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
      { label: "Trips", route: "trips", icon: Zap },
      { label: "GPS Tracking", route: "gps", icon: MapPinned },
    ],
  },
  {
    label: "Fleet operations",
    items: [
      { label: "Fleet", route: "fleet", icon: Truck },
      { label: "Drivers", route: "drivers", icon: UserRoundCheck },
      { label: "FASTag", route: "fastag", icon: TicketCheck },
      { label: "Workshop", route: "workshop", icon: Wrench },
      { label: "Tyres", route: "tyres", icon: Gauge },
      { label: "Batteries", route: "batteries", icon: BatteryCharging },
      { label: "Maintenance", route: "maintenance", icon: Wrench },
      { label: "Documents", route: "documents", icon: FileCheck2 },
    ],
  },
  {
    label: "Commercial",
    items: [
      { label: "Customers", route: "customers", icon: UsersRound },
      { label: "Brokers", route: "brokers", icon: Handshake },
      { label: "Vendors", route: "vendors", icon: Warehouse },
      { label: "Digital LR", route: "digital-lr", icon: FileSignature },
      { label: "Invoices", route: "invoices", icon: ReceiptIndianRupee },
      { label: "Customer Portal", route: "customer-portal", icon: UsersRound },
    ],
  },
  {
    label: "Finance & cost",
    items: [
      { label: "Finance", route: "finance", icon: CircleDollarSign },
      { label: "Accounting", route: "accounting", icon: BookOpenCheck },
      { label: "Expenses", route: "expenses", icon: CreditCard },
      { label: "Income", route: "income", icon: CircleDollarSign },
      { label: "Fuel", route: "fuel", icon: Fuel },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Reports", route: "reports", icon: FileBarChart },
      { label: "AI Assistant", route: "ai-assistant", icon: Sparkles, badge: "AI" },
      { label: "Analytics", route: "analytics", icon: BarChart3 },
      { label: "Notifications", route: "notifications", icon: Bell },
      { label: "Audit Logs", route: "audit-logs", icon: ShieldCheck },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Companies", route: "companies", icon: Building2 },
      { label: "Branches", route: "branches", icon: Warehouse },
      { label: "Roles", route: "roles", icon: ShieldCheck },
      { label: "Activity Logs", route: "activity-logs", icon: Activity },
      { label: "Recycle Bin", route: "recycle-bin", icon: ArchiveRestore },
      { label: "Settings", route: "settings", icon: Settings },
      { label: "Support", route: "support", icon: Headphones },
    ],
  },
];

const customerNavigation: { label: string; items: NavItem[] }[] = [
  {
    label: "Customer workspace",
    items: [{ label: "My transport portal", route: "customer-portal", icon: UsersRound }],
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

function Brand({ customerPortal = false }: { customerPortal?: boolean }) {
  return (
    <Link href={customerPortal ? "/customer-portal" : "/dashboard"} className="app-brand" aria-label={customerPortal ? "Fleetora customer portal" : "Fleetora dashboard"}>
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileName, setProfileName] = useState("Fleetora user");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [portalContext, setPortalContext] = useState<PortalContext | null>(null);
  const [accessResolved, setAccessResolved] = useState(false);
  const [accessError, setAccessError] = useState("");
  const isPortalCustomer = portalContext?.role === "customer";
  const visibleNavigation = isPortalCustomer ? customerNavigation : navigation;
  const activeLabel = isPortalCustomer ? "Customer portal" : routeLabels[route] ?? "Workspace";

  const commandItems = useMemo(() => {
    const items = visibleNavigation.flatMap((group) => group.items);
    if (!query.trim()) return items.slice(0, 8);
    const normalized = query.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [query, visibleNavigation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPortalCustomer && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
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
  }, [isPortalCustomer]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const portal = await fleetoraApi<PortalContext>("/portal/context", {}, { skipWorkspaceHeaders: true });
        if (cancelled) return;
        setPortalContext(portal);
        if (portal.role === "customer") {
          window.localStorage.setItem("fleetora-company-id", portal.companyId);
          window.localStorage.removeItem("fleetora-branch-id");
          if (route !== "customer-portal") {
            window.location.replace("/customer-portal");
            return;
          }
        } else {
          const context = await fleetoraApi<WorkspaceContext>("/workspace/context");
          if (cancelled) return;
          setWorkspace(context);
          if (!window.localStorage.getItem("fleetora-company-id")) window.localStorage.setItem("fleetora-company-id", context.activeCompanyId);
        }
        setAccessError("");
      } catch (cause) {
        if (!cancelled) setAccessError(cause instanceof Error ? cause.message : "Your account access could not be verified.");
      } finally {
        if (!cancelled) setAccessResolved(true);
      }
    })();
    return () => { cancelled = true; };
  }, [route]);

  function switchCompany(companyId: string) {
    window.localStorage.setItem("fleetora-company-id", companyId);
    window.localStorage.removeItem("fleetora-branch-id");
    window.location.reload();
  }

  function switchBranch(branchId: string) {
    if (branchId) window.localStorage.setItem("fleetora-branch-id", branchId); else window.localStorage.removeItem("fleetora-branch-id");
    window.location.reload();
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      setProfileEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle();
      const fullName = profile?.full_name || user.user_metadata?.full_name;
      if (typeof fullName === "string" && fullName.trim()) setProfileName(fullName.trim());
      if (typeof profile?.phone === "string") setProfilePhone(profile.phone);
    })();
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setProfileSaving(true);
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      window.location.assign("/login");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: profileName.trim(), phone: profilePhone.trim() || null, updated_at: new Date().toISOString() });
    setProfileSaving(false);
    if (error) {
      setToast(error.message);
      return;
    }
    setProfileOpen(false);
    setToast("Your profile was updated.");
  }

  async function logout() {
    setProfileMenuOpen(false);
    await supabase?.auth.signOut();
    window.location.assign("/login");
  }

  const profileInitials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FU";
  const activeRole = (workspace?.memberships.find(membership => membership.company_id === workspace.activeCompanyId)?.role ?? "viewer") as FleetoraRole;
  const customerInitials = portalContext?.customer?.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "CU";

  if (!accessResolved || (isPortalCustomer && route !== "customer-portal")) {
    return <div className="app-access-state"><LoaderCircle className="dashboard-spin" size={28} /><strong>Opening your secure workspace</strong><span>Checking account access...</span></div>;
  }

  if (accessError) {
    return <div className="app-access-state app-access-error" role="alert"><ShieldCheck size={28} /><strong>We could not verify your workspace</strong><span>{accessError}</span><div><button className="button secondary-button" onClick={() => window.location.reload()}>Try again</button><button className="button primary-button" onClick={() => void logout()}>Sign in again</button></div></div>;
  }

  return (
    <AccessContext.Provider value={isPortalCustomer ? "viewer" : activeRole}>
    <div className={`app-shell${dark ? " theme-dark" : ""}${isPortalCustomer ? " customer-shell" : ""}`}>
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
          <Brand customerPortal={isPortalCustomer} />
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        {isPortalCustomer ? (
          <div className="portal-customer-identity" aria-label="Customer account">
            <span className="company-avatar">{customerInitials}</span>
            <span className="company-copy"><strong>{portalContext?.customer?.name ?? "Customer account"}</strong><small>Secure customer workspace</small></span>
            <ShieldCheck size={15} />
          </div>
        ) : (
          <div className="company-switcher workspace-context-switcher">
            <span className="company-avatar">FW</span>
            <span className="company-copy"><select aria-label="Active company" value={workspace?.activeCompanyId ?? ""} onChange={event => switchCompany(event.target.value)}>{workspace?.memberships.map(membership => <option key={membership.company_id} value={membership.company_id}>{membership.companies?.name ?? "Fleetora Workspace"} · {membership.role}</option>)}</select>{workspace?.branches.length ? <select aria-label="Active branch" defaultValue={typeof window !== "undefined" ? window.localStorage.getItem("fleetora-branch-id") ?? "" : ""} onChange={event => switchBranch(event.target.value)}><option value="">All branches</option>{workspace.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select> : <small>Live account</small>}</span>
            <ChevronDown size={15} />
          </div>
        )}

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {visibleNavigation.map((group) => (
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
          <div className="health-row"><span><span className="health-dot" /> Backend</span><strong>Online</strong></div>
          <div className="health-track"><span /></div>
          <p>Connected to live services</p>
        </div>

        <div className="sidebar-profile-wrap">
          <button className="sidebar-profile" type="button" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
            <span className="profile-avatar">{profileInitials}</span>
            <span className="profile-copy"><strong>{profileName}</strong><small>{profileEmail || "Fleetora account"}</small></span>
            <ChevronDown size={15} />
          </button>
          {profileMenuOpen && (
            <div className="profile-menu">
              <button type="button" onClick={() => { setProfileOpen(true); setProfileMenuOpen(false); }}><Pencil size={15} /><span><strong>Edit profile</strong><small>Name and phone</small></span></button>
              <button className="profile-menu-danger" type="button" onClick={() => void logout()}><LogOut size={15} /><span><strong>Log out</strong><small>End this session</small></span></button>
            </div>
          )}
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-context">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="breadcrumb"><span>{isPortalCustomer ? portalContext?.customer?.name ?? "Customer account" : "Fleetora Workspace"}</span><b>/</b><strong>{activeLabel}</strong></div>
          </div>

          <div className="topbar-actions">
            {!isPortalCustomer && <button className="global-search" onClick={() => setCommandOpen(true)} aria-label="Search Fleetora">
              <Search size={16} />
              <span>Search anything…</span>
              <kbd><Command size={11} /> K</kbd>
            </button>}
            {!isPortalCustomer && <button className="button primary-button topbar-add" onClick={() => window.location.assign("/fleet?new=true")}><Plus size={16} /> <span>Add vehicle</span></button>}
            <button className="icon-button notification-button" aria-label="View notifications"><Bell size={18} /><span /></button>
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Use light theme" : "Use dark theme"}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="app-content">
          {route === "dashboard" ? (
            <DashboardView onQuickAdd={() => window.location.assign("/fleet?new=true")} />
          ) : enterpriseRoutes.has(route) ? (
            <EnterpriseModuleView route={route} />
          ) : (
            <ModuleView route={route} />
          )}
        </main>
      </div>

      <AnimatePresence>
        {!isPortalCustomer && (commandOpen || quickOpen) && (
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
        {!isPortalCustomer && commandOpen && (
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
        {!isPortalCustomer && quickOpen && <QuickAddForm onClose={() => setQuickOpen(false)} onComplete={setToast} />}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && (
          <>
            <motion.button className="modal-backdrop" aria-label="Close profile editor" onClick={() => setProfileOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" initial={{ opacity: 0, scale: .98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 6 }}>
              <div className="drawer-head"><div><span className="drawer-kicker">Your account</span><h2 id="profile-dialog-title">Edit profile</h2></div><button className="icon-button" onClick={() => setProfileOpen(false)} aria-label="Close"><X size={18} /></button></div>
              <form className="drawer-form" onSubmit={saveProfile}>
                <label><span>Full name</span><div className="profile-input-wrap"><Pencil size={15} /><input value={profileName} onChange={(event) => setProfileName(event.target.value)} required minLength={2} /></div></label>
                <label><span>Email address</span><div className="profile-input-wrap profile-input-disabled"><Mail size={15} /><input value={profileEmail} readOnly /></div><small>Email is managed by your authentication account.</small></label>
                <label><span>Phone number</span><div className="profile-input-wrap"><Phone size={15} /><input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} placeholder="+91 98765 43210" /></div></label>
                <div className="drawer-actions"><button type="button" className="button secondary-button" onClick={() => setProfileOpen(false)}>Cancel</button><button type="submit" className="button primary-button" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button></div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} role="status">
            <span><Check size={15} /></span><div><strong>Saved to Fleetora</strong><p>{toast}</p></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AccessContext.Provider>
  );
}
