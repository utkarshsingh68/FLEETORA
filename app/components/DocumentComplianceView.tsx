"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarClock, FileCheck2, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import { fleetoraApi } from "../lib/api";

type Vehicle = { id: string; registration_number: string };
type Resources = { vehicles: Vehicle[]; drivers: Array<{ id: string; full_name: string }> };
type ComplianceDocument = { id: string; vehicle_id: string | null; driver_id: string | null; document_type: string; document_number: string | null; issued_on: string | null; expires_on: string | null; status: string };
type VehicleDocumentForm = { vehicle_id: string; registration_date: string; fitness_valid_upto: string; insurance_valid_upto: string; tax_valid_upto: string; permit_valid_upto: string; pucc_valid_upto: string; national_permit_valid_upto: string };
type DateField = Exclude<keyof VehicleDocumentForm, "vehicle_id">;
type FieldDefinition = { key: DateField; label: string; type: "rc" | "fitness" | "insurance" | "tax" | "permit" | "puc"; registration?: boolean; nationalPermit?: boolean };

const blank: VehicleDocumentForm = { vehicle_id: "", registration_date: "", fitness_valid_upto: "", insurance_valid_upto: "", tax_valid_upto: "", permit_valid_upto: "", pucc_valid_upto: "", national_permit_valid_upto: "" };
const fields: FieldDefinition[] = [
  { key: "registration_date", label: "Registration date", type: "rc", registration: true },
  { key: "fitness_valid_upto", label: "Fitness valid upto", type: "fitness" },
  { key: "insurance_valid_upto", label: "Insurance valid upto", type: "insurance" },
  { key: "tax_valid_upto", label: "Tax valid upto", type: "tax" },
  { key: "permit_valid_upto", label: "Permit valid upto", type: "permit" },
  { key: "pucc_valid_upto", label: "PUCC valid upto", type: "puc" },
  { key: "national_permit_valid_upto", label: "National permit valid upto", type: "permit", nationalPermit: true },
];
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };
const expiryState = (expiry: string | null) => !expiry ? "active" : expiry < today() ? "expired" : expiry <= addDays(today(), 30) ? "expiring" : "active";
const formatDate = (date: string | null | undefined) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN") : "Not entered";
const isNationalPermit = (document: ComplianceDocument) => document.document_type === "permit" && document.document_number === "National Permit";

export function DocumentComplianceView() {
  const [rows, setRows] = useState<ComplianceDocument[]>([]);
  const [resources, setResources] = useState<Resources>({ vehicles: [], drivers: [] });
  const [form, setForm] = useState<VehicleDocumentForm>(blank);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); try { const [documents, refs] = await Promise.all([fleetoraApi<ComplianceDocument[]>("/documents"), fleetoraApi<Resources>("/resources")]); setRows(documents); setResources(refs); setError(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load vehicle document dates."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const vehicleDocuments = useMemo(() => rows.filter(row => row.vehicle_id), [rows]);
  const classified = useMemo(() => vehicleDocuments.filter(row => row.expires_on).map(row => ({ ...row, expiryState: expiryState(row.expires_on) })), [vehicleDocuments]);
  const expired = classified.filter(row => row.expiryState === "expired").length;
  const expiring = classified.filter(row => row.expiryState === "expiring").length;

  const findDocument = useCallback((vehicleId: string, field: FieldDefinition) => vehicleDocuments.find(document => document.vehicle_id === vehicleId && document.document_type === field.type && (field.nationalPermit ? isNationalPermit(document) : field.type !== "permit" || !isNationalPermit(document))), [vehicleDocuments]);
  function add() { setForm(blank); setOpen(true); }
  function edit(vehicleId: string) { const value = (field: FieldDefinition) => { const document = findDocument(vehicleId, field); return field.registration ? document?.issued_on ?? "" : document?.expires_on ?? ""; }; setForm({ vehicle_id: vehicleId, registration_date: value(fields[0]), fitness_valid_upto: value(fields[1]), insurance_valid_upto: value(fields[2]), tax_valid_upto: value(fields[3]), permit_valid_upto: value(fields[4]), pucc_valid_upto: value(fields[5]), national_permit_valid_upto: value(fields[6]) }); setOpen(true); }

  async function save() {
    if (!form.vehicle_id) return;
    setSaving(true);
    try {
      await Promise.all(fields.map(async field => {
        const date = form[field.key];
        const existing = findDocument(form.vehicle_id, field);
        if (!date && !existing) return;
        const body = { vehicle_id: form.vehicle_id, driver_id: null, document_type: field.type, document_number: field.nationalPermit ? "National Permit" : existing?.document_number ?? null, issued_on: field.registration ? date || null : existing?.issued_on ?? null, expires_on: field.registration ? existing?.expires_on ?? null : date || null, status: field.registration ? "active" : expiryState(date || null) };
        await fleetoraApi(existing ? `/documents/${existing.id}` : "/documents", { method: existing ? "PATCH" : "POST", body: JSON.stringify(body) });
      }));
      setOpen(false);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save vehicle document dates."); } finally { setSaving(false); }
  }

  return <motion.main className="module-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <header className="module-header"><div className="module-header-copy"><div className="module-eyebrow"><FileCheck2 size={15} /> Compliance vault</div><h1>Vehicle document control</h1><p>Enter official validity dates once and receive automatic 30-day expiry warnings.</p></div><button className="module-button module-button-primary" onClick={add}><Plus size={16} /> Add vehicle documents</button></header>
    {error && <div className="module-inline-error" role="alert">{error}</div>}
    <section className="module-kpis">{[["Fleet vehicles", resources.vehicles.length, FileCheck2], ["Expired", expired, AlertTriangle], ["Expiring in 30 days", expiring, CalendarClock], ["Valid dates", Math.max(0, classified.length - expired - expiring), ShieldCheck]].map(([label, value, Icon]) => <article className="module-kpi module-tone-blue" key={String(label)}><span className="module-kpi-icon"><Icon size={18} /></span><div className="module-kpi-copy"><span>{String(label)}</span><strong>{loading ? "—" : String(value)}</strong><small>Live compliance records</small></div></article>)}</section>
    <section className="module-data-panel"><div className="module-section-heading"><div><h2>Vehicle document register</h2><p>Expired dates appear in red and upcoming renewals are highlighted automatically.</p></div><span className="module-record-count">{resources.vehicles.length} vehicles</span></div><div className="data-table-wrap"><table className="data-table vehicle-document-table"><thead><tr><th>Vehicle</th>{fields.map(field => <th key={field.key}>{field.label}</th>)}<th>Status</th><th>Action</th></tr></thead><tbody>{resources.vehicles.map(vehicle => { const values = fields.map(field => { const document = findDocument(vehicle.id, field); return field.registration ? document?.issued_on ?? null : document?.expires_on ?? null; }); const states = values.slice(1).filter(Boolean).map(value => expiryState(value)); const state = states.includes("expired") ? "expired" : states.includes("expiring") ? "expiring" : "active"; return <tr key={vehicle.id}><td><strong>{vehicle.registration_number}</strong></td>{values.map((date, index) => <td key={fields[index].key}>{formatDate(date)}</td>)}<td><span className={`status-pill status-${state}`}>{state}</span></td><td><button className="data-icon-button" onClick={() => edit(vehicle.id)} aria-label={`Edit documents for ${vehicle.registration_number}`}><Pencil size={16} /></button></td></tr>; })}</tbody></table>{!loading && !resources.vehicles.length && <div className="data-empty"><FileCheck2 size={22} /><strong>No vehicles registered</strong><span>Add a vehicle before recording its compliance dates.</span></div>}</div></section>
    <AnimatePresence>{open && <div className="vehicle-modal-layer"><button className="modal-backdrop" aria-label="Close" onClick={() => setOpen(false)} /><section className="vehicle-dialog transport-dialog" role="dialog" aria-modal="true"><div className="vehicle-dialog-header"><div><span className="module-eyebrow">Compliance vault</span><h2>Vehicle document details</h2><p>No upload required. Enter the official dates shown in mParivahan.</p></div><button className="data-icon-button" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></div><div className="vehicle-form-grid"><label className="vehicle-form-wide"><span>Vehicle registration number</span><select value={form.vehicle_id} onChange={event => setForm({ ...form, vehicle_id: event.target.value })}><option value="">Select vehicle</option>{resources.vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration_number}</option>)}</select></label>{fields.map(field => <label key={field.key}><span>{field.label}</span><input type="date" value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} /></label>)}</div><div className="vehicle-dialog-actions"><button className="module-button module-button-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="module-button module-button-primary" disabled={saving || !form.vehicle_id} onClick={() => void save()}>{saving ? "Saving..." : "Save vehicle documents"}</button></div></section></div>}</AnimatePresence>
  </motion.main>;
}
