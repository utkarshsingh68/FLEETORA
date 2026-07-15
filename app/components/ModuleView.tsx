"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Database, Gauge, MoreHorizontal, Plus, Search, Truck, Wrench, X } from "lucide-react";
import { fleetoraApi } from "../lib/api";
import { LiveModuleView } from "./LiveModuleView";

type VehicleStatus = "available" | "on_trip" | "maintenance" | "inactive";
type ApiVehicle = {
  id: string;
  registration_number: string;
  make_model: string | null;
  capacity_tonnes: number | null;
  status: VehicleStatus;
  current_location: string | null;
  updated_at: string;
};
type VehicleForm = {
  registration_number: string;
  make_model: string;
  capacity_tonnes: string;
  status: VehicleStatus;
  current_location: string;
};

const EMPTY_FORM: VehicleForm = { registration_number: "", make_model: "", capacity_tonnes: "", status: "available", current_location: "" };
const emptyModuleNames: Record<string, string> = {
  trips: "Trip control", drivers: "Driver workforce", maintenance: "Maintenance control", documents: "Compliance vault",
  customers: "Customer accounts", vendors: "Vendor network", finance: "Finance desk", fuel: "Fuel intelligence",
  reports: "Reports studio", notifications: "Activity centre", settings: "Workspace settings", support: "Support centre",
};
const statusLabel = (status: VehicleStatus) => status === "on_trip" ? "On trip" : status.charAt(0).toUpperCase() + status.slice(1);

function EmptyConnectedModule({ route }: { route: string }) {
  const title = emptyModuleNames[route] ?? "Fleetora module";
  return (
    <motion.main className={`module-page module-page-${route}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <header className="module-header"><div className="module-header-copy"><div className="module-eyebrow"><Database size={15} /> Live workspace</div><h1>{title}</h1><p>This module will display only records from its connected backend service.</p></div><button className="module-button module-button-primary" disabled title="Backend connection required"><Plus size={16} /> Add record</button></header>
      <section className="module-kpis">{["Total records", "Active", "Needs attention", "Updated today"].map((label) => <article className="module-kpi module-tone-blue" key={label}><span className="module-kpi-icon"><Database size={18} /></span><div className="module-kpi-copy"><span>{label}</span><strong>0</strong><small>No live records</small></div></article>)}</section>
      <div className="module-content-grid"><section className="module-data-panel"><div className="module-section-heading"><div><h2>Operational records</h2><p>Only database records will appear here.</p></div><span className="module-record-count">0 records</span></div><div className="data-empty data-empty-large"><Search size={22} /><strong>No live data yet</strong><span>This module is ready for its backend connection. No demo records are included.</span></div></section><aside className="panel-insight"><div className="panel-insight-heading"><span className="panel-insight-icon"><Database size={16} /></span><span>Live data</span></div><h2>Backend connection required</h2><p>Insights will be calculated only from records stored in your workspace.</p><div className="panel-insight-metric"><strong>0</strong><span>live records</span></div></aside></div>
    </motion.main>
  );
}

function VehicleDialog({ value, editing, saving, error, onChange, onClose, onSave }: { value: VehicleForm; editing: boolean; saving: boolean; error: string | null; onChange: (value: VehicleForm) => void; onClose: () => void; onSave: () => void }) {
  return <div className="vehicle-modal-layer"><button className="modal-backdrop" aria-label="Close vehicle editor" onClick={onClose} /><section className="vehicle-dialog" role="dialog" aria-modal="true" aria-labelledby="vehicle-title"><div className="vehicle-dialog-header"><div><span className="module-eyebrow"><Truck size={15} /> Fleet asset</span><h2 id="vehicle-title">{editing ? "Edit vehicle" : "Add vehicle"}</h2><p>{editing ? "Update this live database record." : "Register a vehicle in your workspace."}</p></div><button className="data-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="vehicle-form-grid">
    <label><span>Registration number</span><input value={value.registration_number} onChange={(event) => onChange({ ...value, registration_number: event.target.value.toUpperCase() })} placeholder="MH 12 AB 1234" /></label>
    <label><span>Make and model</span><input value={value.make_model} onChange={(event) => onChange({ ...value, make_model: event.target.value })} placeholder="Tata Signa 4825.TK" /></label>
    <label><span>Capacity (tonnes)</span><input type="number" min="0" step="0.1" value={value.capacity_tonnes} onChange={(event) => onChange({ ...value, capacity_tonnes: event.target.value })} /></label>
    <label><span>Status</span><select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value as VehicleStatus })}><option value="available">Available</option><option value="on_trip">On trip</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></select></label>
    <label className="vehicle-form-wide"><span>Current location</span><input value={value.current_location} onChange={(event) => onChange({ ...value, current_location: event.target.value })} placeholder="Mumbai HQ" /></label>
  </div>{error && <div className="vehicle-form-error" role="alert">{error}</div>}<div className="vehicle-dialog-actions"><button className="module-button module-button-secondary" onClick={onClose}>Cancel</button><button className="module-button module-button-primary" disabled={saving || !value.registration_number.trim()} onClick={onSave}>{saving ? "Saving…" : editing ? "Save changes" : "Add vehicle"}</button></div></section></div>;
}

function FleetView() {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() { setLoading(true); setError(null); try { setVehicles(await fleetoraApi<ApiVehicle[]>("/vehicles?limit=100")); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load fleet records."); } finally { setLoading(false); } }
  useEffect(() => { void load(); if (new URLSearchParams(window.location.search).get("new") === "true") openNew(); }, []);
  function openNew() { setEditingId(null); setForm(EMPTY_FORM); setFormError(null); setDialogOpen(true); }
  function openEdit(vehicle: ApiVehicle) { setEditingId(vehicle.id); setForm({ registration_number: vehicle.registration_number, make_model: vehicle.make_model ?? "", capacity_tonnes: vehicle.capacity_tonnes === null ? "" : String(vehicle.capacity_tonnes), status: vehicle.status, current_location: vehicle.current_location ?? "" }); setFormError(null); setDialogOpen(true); }
  async function save() { setSaving(true); setFormError(null); const payload = { registration_number: form.registration_number.trim(), make_model: form.make_model.trim() || null, capacity_tonnes: form.capacity_tonnes ? Number(form.capacity_tonnes) : null, status: form.status, current_location: form.current_location.trim() || null }; try { await fleetoraApi(editingId ? `/vehicles/${editingId}` : "/vehicles", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) }); setDialogOpen(false); await load(); } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Could not save this vehicle."); } finally { setSaving(false); } }
  const visible = useMemo(() => vehicles.filter((vehicle) => Object.values(vehicle).some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()))), [query, vehicles]);
  const available = vehicles.filter((vehicle) => vehicle.status === "available").length;
  const onTrip = vehicles.filter((vehicle) => vehicle.status === "on_trip").length;
  const maintenance = vehicles.filter((vehicle) => vehicle.status === "maintenance").length;
  const capacity = vehicles.reduce((sum, vehicle) => sum + (Number(vehicle.capacity_tonnes) || 0), 0);

  return <motion.main className="module-page module-page-fleet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><header className="module-header"><div className="module-header-copy"><div className="module-eyebrow"><Truck size={15} /> Asset operations</div><h1>Fleet command</h1><p>Live vehicle readiness, capacity, location, and status.</p></div><button className="module-button module-button-primary" onClick={openNew}><Plus size={16} /> Add vehicle</button></header>
    <section className="module-kpis">{[
      { label: "Registered fleet", value: vehicles.length, detail: "Live database records", icon: Truck, tone: "blue" },
      { label: "Road ready", value: vehicles.length ? `${Math.round(available / vehicles.length * 100)}%` : "0%", detail: `${available} vehicles available`, icon: CheckCircle2, tone: "emerald" },
      { label: "On trip", value: onTrip, detail: "Vehicles currently moving", icon: Gauge, tone: "violet" },
      { label: "Maintenance", value: maintenance, detail: "Vehicles requiring service", icon: Wrench, tone: "amber" },
    ].map(({ icon: Icon, ...item }) => <article className={`module-kpi module-tone-${item.tone}`} key={item.label}><span className="module-kpi-icon"><Icon size={18} /></span><div className="module-kpi-copy"><span>{item.label}</span><strong>{loading ? "—" : item.value}</strong><small>{item.detail}</small></div></article>)}</section>
    <div className="filter-bar"><label className="filter-search"><Search size={17} /><span className="data-visually-hidden">Search fleet</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration, model, status, or location…" />{query && <button onClick={() => setQuery("")}><X size={14} /></button>}</label></div>
    <div className="module-content-grid"><section className="module-data-panel"><div className="module-section-heading"><div><h2>Vehicle register</h2><p>Live records from Supabase</p></div><span className="module-record-count">{visible.length} records</span></div>{error && <div className="module-inline-error" role="alert">{error} <button onClick={() => void load()}>Retry</button></div>}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>Vehicle</th><th>Capacity</th><th>Current location</th><th>Status</th><th>Last updated</th><th><span className="data-visually-hidden">Actions</span></th></tr></thead><tbody>{visible.map((vehicle) => <tr key={vehicle.id}><td><span className="data-primary-cell"><strong>{vehicle.registration_number}</strong><small>{vehicle.make_model || "Model not specified"}</small></span></td><td>{vehicle.capacity_tonnes === null ? "—" : `${vehicle.capacity_tonnes} T`}</td><td>{vehicle.current_location || "Not updated"}</td><td><span className={`status-pill status-${vehicle.status.replace("_", "-")}`}><span className="status-dot" />{statusLabel(vehicle.status)}</span></td><td>{new Date(vehicle.updated_at).toLocaleString("en-IN")}</td><td><button className="data-icon-button" aria-label={`Edit ${vehicle.registration_number}`} onClick={() => openEdit(vehicle)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table>{!loading && !visible.length && <div className="data-empty data-empty-large"><Search size={22} /><strong>No fleet records</strong><span>Add your first vehicle or change your search.</span></div>}</div></section><aside className="panel-insight"><div className="panel-insight-heading"><span className="panel-insight-icon"><Database size={16} /></span><span>Live capacity</span></div><h2>{vehicles.length ? "Fleet readiness" : "Your fleet workspace is ready"}</h2><p>Calculated only from vehicles stored in your database.</p><div className="panel-insight-metric"><strong>{capacity.toLocaleString("en-IN")} T</strong><span>registered payload capacity</span></div></aside></div>
    <AnimatePresence>{dialogOpen && <VehicleDialog value={form} editing={Boolean(editingId)} saving={saving} error={formError} onChange={setForm} onClose={() => setDialogOpen(false)} onSave={() => void save()} />}</AnimatePresence>
  </motion.main>;
}

export function ModuleView({ route }: { route: string }) { return route.toLowerCase().split("/")[0] === "fleet" ? <FleetView /> : <LiveModuleView route={route} />; }
export default ModuleView;
