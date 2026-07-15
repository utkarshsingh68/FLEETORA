"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  LoaderCircle,
  MailPlus,
  Plus,
  ReceiptIndianRupee,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { fleetoraApi } from "../lib/api";
import { supabase } from "../lib/supabase";

type Customer = { id: string; name: string; email?: string | null };
type PortalRequest = { id: string; customer_id: string; origin: string; destination: string; material_name: string | null; quantity_tonnes: number | null; pickup_date: string | null; status: string; customers?: { name: string } | null };
type Dispute = { id: string; customer_id: string; subject: string; description: string; status: string; resolution: string | null; customers?: { name: string } | null };
type PortalDocument = { id: string; customer_id: string; trip_id: string | null; invoice_id: string | null; document_type: "lr" | "pod" | "invoice" | "statement" | "other"; file_name: string; mime_type: string | null; size_bytes: number | null; created_at: string; customers?: { name: string } | null; trips?: { trip_number: string } | null; invoices?: { invoice_number: string } | null };
type PortalInvoice = { id: string; customer_id: string; trip_id: string | null; invoice_number: string; issue_date: string; due_date: string | null; amount: number; currency: string; status: string; customers?: { name: string } | null; trips?: { trip_number: string } | null; invoice_payments?: Array<{ id: string; status: string; amount: number; paid_at: string | null }> };
type PortalTrip = { id: string; customer_id: string | null; trip_number: string; origin: string; destination: string; status: string };
type UploadReservation = { document: PortalDocument; upload: { signedUrl: string; token?: string; path: string; expiresIn: number } };
type CheckoutResponse = { payment: { id: string; status: string; amount: number; currency: string }; invoice: { id: string; invoice_number: string }; checkout: { provider: "razorpay"; keyId: string; orderId: string; amount: number; currency: string } };
type PortalContext = { companyId: string; customerId: string | null; role: string; customer: Customer | null };
type InvitationResponse = { status: "invited" | "linked_existing"; email: string; message: string; customer: { id: string; name: string } };

type RazorpayResult = { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (result: RazorpayResult) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number | string, currency = "INR") => `${currency} ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const documentMimes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const extensionMimes: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
const fileMime = (file: File) => file.type || extensionMimes[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";

function PortalModal({ title, children, saving, valid, saveLabel = "Save", onClose, onSave }: { title: string; children: React.ReactNode; saving: boolean; valid: boolean; saveLabel?: string; onClose: () => void; onSave: () => void }) {
  return <div className="vehicle-modal-layer"><button className="modal-backdrop" aria-label="Close" onClick={onClose} /><section className="vehicle-dialog transport-dialog" role="dialog" aria-modal="true"><div className="vehicle-dialog-header"><div><span className="module-eyebrow">Secure customer workspace</span><h2>{title}</h2></div><button className="data-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}<div className="vehicle-dialog-actions"><button className="module-button module-button-secondary" onClick={onClose}>Cancel</button><button className="module-button module-button-primary" disabled={saving || !valid} onClick={onSave}>{saving ? "Saving..." : saveLabel}</button></div></section></div>;
}

async function ensureRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-fleetora-razorpay="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Payment checkout could not be loaded.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.fleetoraRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment checkout could not be loaded."));
    document.head.appendChild(script);
  });
  if (!window.Razorpay) throw new Error("Payment checkout is unavailable.");
}

export function CustomerPortalView() {
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<PortalTrip[]>([]);
  const [context, setContext] = useState<PortalContext | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [request, setRequest] = useState({ customer_id: "", origin: "", destination: "", material_name: "", quantity_tonnes: "", pickup_date: today(), notes: "" });
  const [dispute, setDispute] = useState({ customer_id: "", subject: "", description: "" });
  const [documentForm, setDocumentForm] = useState<{ customer_id: string; trip_id: string; invoice_id: string; document_type: PortalDocument["document_type"]; file: File | null }>({ customer_id: "", trip_id: "", invoice_id: "", document_type: "pod", file: null });
  const [invite, setInvite] = useState({ customer_id: "", email: "" });

  async function load() {
    try {
      const portalContext = await fleetoraApi<PortalContext>("/portal/context");
      const [requestRows, disputeRows, documentRows, invoiceRows, customerRows, tripRows] = await Promise.all([
        fleetoraApi<PortalRequest[]>("/portal/requests"),
        fleetoraApi<Dispute[]>("/portal/disputes"),
        fleetoraApi<PortalDocument[]>("/portal/documents?limit=250"),
        fleetoraApi<PortalInvoice[]>("/portal/invoices?limit=250"),
        portalContext.role === "customer" ? Promise.resolve(portalContext.customer ? [portalContext.customer] : []) : fleetoraApi<Customer[]>("/customers?limit=500").catch(() => []),
        portalContext.role === "customer" ? Promise.resolve([]) : fleetoraApi<PortalTrip[]>("/trips?limit=500").catch(() => []),
      ]);
      setRequests(requestRows);
      setDisputes(disputeRows);
      setDocuments(documentRows);
      setInvoices(invoiceRows);
      setCustomers(customerRows);
      setTrips(tripRows);
      setContext(portalContext);
      if (portalContext.customerId) {
        setRequest(current => ({ ...current, customer_id: current.customer_id || portalContext.customerId || "" }));
        setDispute(current => ({ ...current, customer_id: current.customer_id || portalContext.customerId || "" }));
        setDocumentForm(current => ({ ...current, customer_id: current.customer_id || portalContext.customerId || "" }));
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the customer portal.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const outstandingFor = (invoice: PortalInvoice) => Math.max(0, Number(invoice.amount) - (invoice.invoice_payments ?? []).filter(payment => payment.status === "captured").reduce((sum, payment) => sum + Number(payment.amount), 0));
  const outstanding = useMemo(() => invoices.filter(invoice => invoice.status !== "paid" && invoice.status !== "void").reduce((sum, invoice) => sum + outstandingFor(invoice), 0), [invoices]);

  async function saveRequest() {
    setSaving(true);
    try {
      await fleetoraApi("/portal/requests", { method: "POST", body: JSON.stringify({ ...request, quantity_tonnes: Number(request.quantity_tonnes || 0) }) });
      setRequestOpen(false); setNotice("Transport request submitted."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit the request."); }
    finally { setSaving(false); }
  }

  async function saveDispute() {
    setSaving(true);
    try {
      await fleetoraApi("/portal/disputes", { method: "POST", body: JSON.stringify(dispute) });
      setDisputeOpen(false); setNotice("Dispute submitted for review."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit the dispute."); }
    finally { setSaving(false); }
  }

  async function uploadDocument() {
    if (!documentForm.file) return;
    setSaving(true);
    let reservation: UploadReservation | null = null;
    try {
      const mimeType = fileMime(documentForm.file);
      if (!documentMimes.has(mimeType)) throw new Error("Choose a PDF, JPG, PNG, WebP, or XLSX document.");
      if (documentForm.file.size > 10_485_760) throw new Error("The selected document is larger than 10 MB.");
      reservation = await fleetoraApi<UploadReservation>("/portal/documents", { method: "POST", body: JSON.stringify({ customer_id: documentForm.customer_id, trip_id: documentForm.trip_id || undefined, invoice_id: documentForm.invoice_id || undefined, document_type: documentForm.document_type, file_name: documentForm.file.name, mime_type: mimeType, size_bytes: documentForm.file.size }) });
      if (!supabase || !reservation.upload.token) throw new Error("Secure storage is not configured for uploads.");
      const uploaded = await supabase.storage.from("customer-documents").uploadToSignedUrl(
        reservation.upload.path,
        reservation.upload.token,
        documentForm.file,
        { contentType: mimeType },
      );
      if (uploaded.error) throw new Error("The document record was created, but the file upload failed.");
      setDocumentOpen(false); setDocumentForm({ customer_id: "", trip_id: "", invoice_id: "", document_type: "pod", file: null }); setNotice("Document uploaded securely."); await load();
    } catch (cause) {
      if (reservation?.document.id) await fleetoraApi(`/portal/documents/${reservation.document.id}`, { method: "DELETE" }).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Could not upload the document.");
    } finally { setSaving(false); }
  }

  async function inviteCustomer() {
    setSaving(true);
    setError(null);
    try {
      const result = await fleetoraApi<InvitationResponse>("/portal/invitations", {
        method: "POST",
        body: JSON.stringify(invite),
      });
      setInviteOpen(false);
      setInvite({ customer_id: "", email: "" });
      setNotice(result.message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not invite the customer.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadDocument(documentRow: PortalDocument) {
    try {
      const result = await fleetoraApi<{ url: string }>(`/portal/documents/${documentRow.id}/download`);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open the document."); }
  }

  async function payInvoice(invoice: PortalInvoice) {
    setPayingInvoice(invoice.id); setError(null);
    try {
      const checkout = await fleetoraApi<CheckoutResponse>("/payments/create", { method: "POST", body: JSON.stringify({ invoice_id: invoice.id, idempotency_key: crypto.randomUUID() }) });
      await ensureRazorpay();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Payment checkout is unavailable.");
      new Razorpay({
        key: checkout.checkout.keyId,
        order_id: checkout.checkout.orderId,
        amount: checkout.checkout.amount,
        currency: checkout.checkout.currency,
        name: "Fleetora",
        description: `Invoice ${checkout.invoice.invoice_number}`,
        handler: () => { setNotice("Payment submitted. Confirmation will appear after secure verification."); window.setTimeout(() => void load(), 1800); },
        modal: { ondismiss: () => setPayingInvoice(null) },
        theme: { color: "#2563eb" },
      }).open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start payment checkout.");
    } finally { setPayingInvoice(null); }
  }

  const customerOptions: Customer[] = context?.customer ? [context.customer] : customers.length ? customers : Array.from(new Map([...requests.map(row => [row.customer_id, row.customers?.name]), ...disputes.map(row => [row.customer_id, row.customers?.name])].filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))).entries()).map(([id, name]) => ({ id, name }));
  const customerTrips = documentForm.customer_id ? trips.filter(trip => trip.customer_id === documentForm.customer_id) : [];
  const customerInvoices = documentForm.customer_id ? invoices.filter(invoice => invoice.customer_id === documentForm.customer_id) : [];
  const canInviteCustomers = context?.role === "owner" || context?.role === "admin";

  return <motion.main className="module-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <header className="module-header"><div className="module-header-copy"><div className="module-eyebrow"><Users size={15} /> Customer self-service</div><h1>Customer portal</h1><p>Request transport, download LR/POD/invoices, track account activity, raise disputes and pay securely.</p></div><div className="module-actions">{canInviteCustomers && <button className="module-button module-button-secondary" onClick={() => setInviteOpen(true)}><MailPlus size={16} /> Invite customer</button>}{context?.role !== "customer" && <button className="module-button module-button-secondary" onClick={() => setDocumentOpen(true)}><Upload size={16} /> Upload document</button>}<button className="module-button module-button-secondary" onClick={() => setDisputeOpen(true)}><AlertTriangle size={16} /> Raise dispute</button><button className="module-button module-button-primary" onClick={() => setRequestOpen(true)}><Plus size={16} /> Request transport</button></div></header>
    {error && <div className="module-inline-error" role="alert">{error}</div>}
    {notice && <div className="module-inline-success" role="status"><CheckCircle2 size={16} /> {notice}</div>}
    <section className="portal-service-grid">
      <article className="module-kpi module-tone-blue"><span className="module-kpi-icon"><Truck size={18} /></span><div className="module-kpi-copy"><span>Transport requests</span><strong>{requests.length}</strong><small>Live customer demand</small></div></article>
      <article className="module-kpi module-tone-blue"><span className="module-kpi-icon"><FileText size={18} /></span><div className="module-kpi-copy"><span>Documents</span><strong>{documents.length}</strong><small>Private signed downloads</small></div></article>
      <article className="module-kpi module-tone-blue"><span className="module-kpi-icon"><ReceiptIndianRupee size={18} /></span><div className="module-kpi-copy"><span>Outstanding invoices</span><strong>{money(outstanding)}</strong><small>{invoices.filter(row => row.status !== "paid" && row.status !== "void").length} payable</small></div></article>
      <article className="module-kpi module-tone-blue"><span className="module-kpi-icon"><AlertTriangle size={18} /></span><div className="module-kpi-copy"><span>Open disputes</span><strong>{disputes.filter(row => row.status !== "resolved").length}</strong><small>Customer support</small></div></article>
    </section>
    <div className="report-panels"><section className="module-data-panel"><div className="module-section-heading"><div><h2>Customer documents</h2><p>LR, POD, invoices and statements with expiring signed access</p></div><span className="module-record-count">{documents.length} files</span></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Document</th><th>Customer</th><th>Reference</th><th>Date</th><th>Download</th></tr></thead><tbody>{documents.map(row => <tr key={row.id}><td><strong>{row.file_name}</strong><small className="data-cell-note">{row.document_type.toUpperCase()}</small></td><td>{row.customers?.name ?? "My account"}</td><td>{row.trips?.trip_number ?? row.invoices?.invoice_number ?? "-"}</td><td>{new Date(row.created_at).toLocaleDateString("en-IN")}</td><td><button className="module-button module-button-secondary" onClick={() => void downloadDocument(row)}><Download size={14} /> Open</button></td></tr>)}</tbody></table>{!documents.length && <div className="data-empty"><FileText size={22} /><strong>No documents available</strong></div>}</div></section>
      <section className="module-data-panel"><div className="module-section-heading"><div><h2>Invoices and payments</h2><p>Webhook-verified online payments</p></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Amount</th><th>Status</th><th>Payment</th></tr></thead><tbody>{invoices.map(row => <tr key={row.id}><td><strong>{row.invoice_number}</strong><small className="data-cell-note">{row.trips?.trip_number ?? "General"}</small></td><td>{row.customers?.name ?? "My account"}</td><td>{row.due_date ? new Date(row.due_date).toLocaleDateString("en-IN") : "-"}</td><td>{money(row.amount, row.currency)}</td><td><span className={`status-pill status-${row.status}`}>{row.status}</span></td><td>{["sent","partial","overdue"].includes(row.status) ? <button className="module-button module-button-primary" disabled={payingInvoice === row.id} onClick={() => void payInvoice(row)}>{payingInvoice === row.id ? <LoaderCircle className="spin" size={14} /> : <CreditCard size={14} />} Pay</button> : <span className="module-record-count">{row.status === "paid" ? "Paid" : "Unavailable"}</span>}</td></tr>)}</tbody></table>{!invoices.length && <div className="data-empty"><ReceiptIndianRupee size={22} /><strong>No invoices available</strong></div>}</div></section></div>
    <div className="report-panels"><section className="module-data-panel"><div className="module-section-heading"><div><h2>Transport requests</h2><p>Customer-originated demand awaiting dispatch</p></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Route</th><th>Material</th><th>Pickup</th><th>Status</th></tr></thead><tbody>{requests.map(row => <tr key={row.id}><td><strong>{row.customers?.name ?? "My account"}</strong></td><td>{row.origin} - {row.destination}</td><td>{row.material_name ?? "-"}<small className="data-cell-note">{row.quantity_tonnes ? `${row.quantity_tonnes} t` : ""}</small></td><td>{row.pickup_date ?? "-"}</td><td><span className={`status-pill status-${row.status}`}>{row.status}</span></td></tr>)}</tbody></table></div></section><section className="module-data-panel"><div className="module-section-heading"><div><h2>Disputes</h2><p>Questions and resolutions linked to the account</p></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Subject</th><th>Status</th><th>Resolution</th></tr></thead><tbody>{disputes.map(row => <tr key={row.id}><td>{row.customers?.name ?? "My account"}</td><td><strong>{row.subject}</strong></td><td>{row.status}</td><td>{row.resolution ?? "Pending"}</td></tr>)}</tbody></table></div></section></div>
    <AnimatePresence>
      {requestOpen && <PortalModal title="Request transport" saving={saving} valid={Boolean(request.customer_id && request.origin && request.destination)} onClose={() => setRequestOpen(false)} onSave={() => void saveRequest()}><div className="vehicle-form-grid"><label><span>Customer</span><select value={request.customer_id} onChange={event => setRequest({ ...request, customer_id: event.target.value })}><option value="">Select customer</option>{customerOptions.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>{([['origin','Origin'],['destination','Destination'],['material_name','Material'],['quantity_tonnes','Weight (tonnes)'],['pickup_date','Pickup date'],['notes','Notes']] as const).map(([key,label]) => <label key={key}><span>{label}</span><input type={key === "pickup_date" ? "date" : key === "quantity_tonnes" ? "number" : "text"} value={request[key]} onChange={event => setRequest({ ...request, [key]: event.target.value })} /></label>)}</div></PortalModal>}
      {disputeOpen && <PortalModal title="Raise dispute" saving={saving} valid={Boolean(dispute.customer_id && dispute.subject && dispute.description)} onClose={() => setDisputeOpen(false)} onSave={() => void saveDispute()}><div className="vehicle-form-grid"><label><span>Customer</span><select value={dispute.customer_id} onChange={event => setDispute({ ...dispute, customer_id: event.target.value })}><option value="">Select customer</option>{customerOptions.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label><span>Subject</span><input value={dispute.subject} onChange={event => setDispute({ ...dispute, subject: event.target.value })} /></label><label className="vehicle-form-wide"><span>Description</span><textarea value={dispute.description} onChange={event => setDispute({ ...dispute, description: event.target.value })} /></label></div></PortalModal>}
      {documentOpen && <PortalModal title="Upload customer document" saving={saving} valid={Boolean(documentForm.customer_id && documentForm.file)} onClose={() => setDocumentOpen(false)} onSave={() => void uploadDocument()}>
        <div className="vehicle-form-grid">
          <label><span>Customer</span><select value={documentForm.customer_id} onChange={event => setDocumentForm({ ...documentForm, customer_id: event.target.value, trip_id: "", invoice_id: "" })}><option value="">Select customer</option>{customerOptions.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label><span>Document type</span><select value={documentForm.document_type} onChange={event => setDocumentForm({ ...documentForm, document_type: event.target.value as PortalDocument["document_type"] })}>{["lr","pod","invoice","statement","other"].map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></label>
          <label><span>Trip (optional)</span><select disabled={!documentForm.customer_id} value={documentForm.trip_id} onChange={event => setDocumentForm({ ...documentForm, trip_id: event.target.value })}><option value="">No trip link</option>{customerTrips.map(trip => <option key={trip.id} value={trip.id}>{trip.trip_number} · {trip.origin} - {trip.destination}</option>)}</select></label>
          <label><span>Invoice (optional)</span><select disabled={!documentForm.customer_id} value={documentForm.invoice_id} onChange={event => setDocumentForm({ ...documentForm, invoice_id: event.target.value })}><option value="">No invoice link</option>{customerInvoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · {money(invoice.amount, invoice.currency)}</option>)}</select></label>
          <label className="vehicle-form-wide"><span>PDF or image (maximum 10 MB)</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => setDocumentForm({ ...documentForm, file: event.target.files?.[0] ?? null })} /></label>
          {documentForm.customer_id && !customerTrips.length && !customerInvoices.length && <p className="vehicle-form-wide data-cell-note">This customer has no trips or invoices yet. The document can still be saved to the customer account.</p>}
        </div>
      </PortalModal>}
      {inviteOpen && <PortalModal title="Invite customer to portal" saving={saving} valid={Boolean(invite.customer_id && invite.email)} saveLabel="Send invitation" onClose={() => setInviteOpen(false)} onSave={() => void inviteCustomer()}>
        <div className="vehicle-form-grid">
          <label className="vehicle-form-wide"><span>Customer</span><select value={invite.customer_id} onChange={event => { const customer = customerOptions.find(option => option.id === event.target.value); setInvite({ customer_id: event.target.value, email: customer?.email ?? "" }); }}><option value="">Select customer</option>{customerOptions.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label className="vehicle-form-wide"><span>Portal email</span><input type="email" autoComplete="email" placeholder="customer@company.com" value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })} /></label>
          <p className="vehicle-form-wide data-cell-note">If this email already has a Fleetora account, access is linked immediately. Otherwise, Supabase sends a secure password setup invitation.</p>
        </div>
      </PortalModal>}
    </AnimatePresence>
  </motion.main>;
}
