"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Database, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { fleetoraApi } from "../lib/api";

export type LiveRecord = {
  id: string;
  name: string;
  reference: string | null;
  status: string;
  notes: string | null;
  amount: number | null;
  event_date: string | null;
  updated_at: string;
};

const labels: Record<string, string> = {
  trips: "Trip control", drivers: "Driver workforce", maintenance: "Maintenance control", documents: "Compliance vault",
  customers: "Customer accounts", vendors: "Vendor network", finance: "Finance desk", fuel: "Fuel intelligence",
  reports: "Reports studio", notifications: "Activity centre", settings: "Workspace settings", support: "Support centre",
  brokers: "Broker network", accounting: "Accounting", fastag: "FASTag control", gps: "GPS tracking", workshop: "Workshop",
  tyres: "Tyre lifecycle", batteries: "Battery management", "digital-lr": "Digital LR", invoices: "Invoices",
  expenses: "Expense management", income: "Income management", analytics: "Analytics studio", roles: "Roles & permissions",
  companies: "Company management", branches: "Branch management", "audit-logs": "Audit logs", "activity-logs": "Activity logs",
};

type FormValue = { name: string; reference: string; status: string; notes: string; amount: string; event_date: string };
const emptyForm: FormValue = { name: "", reference: "", status: "active", notes: "", amount: "", event_date: "" };

export function LiveModuleView({ route }: { route: string }) {
  const moduleKey = route.toLowerCase().split("/")[0];
  const title = labels[moduleKey] ?? "Fleetora module";
  const [records, setRecords] = useState<LiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValue>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRecords(await fleetoraApi<LiveRecord[]>(`/records/${encodeURIComponent(moduleKey)}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load records."); }
    finally { setLoading(false); }
  }, [moduleKey]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => records.filter((record) => Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()))), [query, records]);
  const active = records.filter((record) => record.status.toLowerCase() === "active").length;

  function create() { setEditingId(null); setForm(emptyForm); setError(null); setOpen(true); }
  function edit(record: LiveRecord) { setEditingId(record.id); setForm({ name: record.name, reference: record.reference ?? "", status: record.status, notes: record.notes ?? "", amount: record.amount === null ? "" : String(record.amount), event_date: record.event_date ?? "" }); setOpen(true); }
  async function save() {
    if (!form.name.trim()) return;
    setSaving(true); setError(null);
    const payload = { name: form.name.trim(), reference: form.reference.trim() || null, status: form.status.trim() || "active", notes: form.notes.trim() || null, amount: form.amount ? Number(form.amount) : null, event_date: form.event_date || null };
    try { await fleetoraApi(editingId ? `/records/${moduleKey}/${editingId}` : `/records/${moduleKey}`, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) }); setOpen(false); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this record."); }
    finally { setSaving(false); }
  }
  async function remove(record: LiveRecord) {
    if (!window.confirm(`Delete “${record.name}”?`)) return;
    try { await fleetoraApi<void>(`/records/${moduleKey}/${record.id}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete this record."); }
  }

  return <motion.main className={`module-page module-page-${moduleKey}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <header className="module-header"><div className="module-header-copy"><div className="module-eyebrow"><Database size={15} /> Live workspace</div><h1>{title}</h1><p>Create, update, search, and manage records stored securely in your workspace.</p></div><button className="module-button module-button-primary" onClick={create}><Plus size={16} /> Add record</button></header>
    <section className="module-kpis">{[
      ["Total records", records.length], ["Active", active], ["Needs attention", records.length - active], ["Updated today", records.filter((r) => new Date(r.updated_at).toDateString() === new Date().toDateString()).length],
    ].map(([label, value]) => <article className="module-kpi module-tone-blue" key={label}><span className="module-kpi-icon"><Database size={18} /></span><div className="module-kpi-copy"><span>{label}</span><strong>{loading ? "—" : value}</strong><small>Live database records</small></div></article>)}</section>
    <div className="filter-bar"><label className="filter-search"><Search size={17} /><span className="data-visually-hidden">Search records</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} />{query && <button onClick={() => setQuery("")}><X size={14} /></button>}</label></div>
    <div className="module-content-grid"><section className="module-data-panel"><div className="module-section-heading"><div><h2>Operational records</h2><p>Live data from Supabase</p></div><span className="module-record-count">{visible.length} records</span></div>{error && <div className="module-inline-error" role="alert">{error} <button onClick={() => void load()}>Retry</button></div>}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Reference</th><th>Status</th><th>Amount</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><strong>{record.name}</strong></td><td>{record.reference || "—"}</td><td><span className={`status-pill status-${record.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><span className="status-dot" />{record.status}</span></td><td>{record.amount === null ? "—" : `₹${Number(record.amount).toLocaleString("en-IN")}`}</td><td>{new Date(record.updated_at).toLocaleString("en-IN")}</td><td><div className="live-record-actions"><button className="data-icon-button" aria-label={`Edit ${record.name}`} onClick={() => edit(record)}><MoreHorizontal size={17} /></button><button className="data-icon-button live-delete-button" aria-label={`Delete ${record.name}`} onClick={() => void remove(record)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{!loading && !visible.length && <div className="data-empty data-empty-large"><Search size={22} /><strong>No records yet</strong><span>Add the first record for this module.</span></div>}</div></section><aside className="panel-insight"><div className="panel-insight-heading"><span className="panel-insight-icon"><Database size={16} /></span><span>Live data</span></div><h2>{records.length ? `${records.length} records available` : "Ready for your data"}</h2><p>Every entry is stored in Supabase with company-level access control.</p><div className="panel-insight-metric"><strong>{active}</strong><span>active records</span></div></aside></div>
    <AnimatePresence>{open && <div className="vehicle-modal-layer"><button className="modal-backdrop" aria-label="Close record editor" onClick={() => setOpen(false)} /><section className="vehicle-dialog" role="dialog" aria-modal="true" aria-labelledby="record-title"><div className="vehicle-dialog-header"><div><span className="module-eyebrow"><Database size={15} /> {title}</span><h2 id="record-title">{editingId ? "Edit record" : "Add record"}</h2><p>Save this entry to the live workspace.</p></div><button className="data-icon-button" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></div><div className="vehicle-form-grid"><label><span>Name or title</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label><span>Reference</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></label><label><span>Status</span><input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} /></label><label><span>Amount</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label><span>Date</span><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></label><label className="vehicle-form-wide"><span>Notes</span><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div>{error && <div className="vehicle-form-error">{error}</div>}<div className="vehicle-dialog-actions"><button className="module-button module-button-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="module-button module-button-primary" disabled={saving || !form.name.trim()} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Save changes" : "Add record"}</button></div></section></div>}</AnimatePresence>
  </motion.main>;
}
