import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErpService } from '../erp/erp.service';

type DataRow = Record<string, unknown>;
type InsightSeverity = 'critical' | 'warning' | 'info';
type IntelligenceInsight = { id: string; category: string; severity: InsightSeverity; title: string; description: string; entity?: string; value?: number };
type IntelligenceSnapshot = {
  period: { from: string; to: string };
  summary: Record<string, number>;
  partyBalances: Array<{ name: string; balance: number; debit: number; credit: number }>;
  topTrucks: Array<{ name: string; trips: number; revenue: number; cost: number; profit: number }>;
  fraudAlerts: IntelligenceInsight[];
  profitabilityAdvice: IntelligenceInsight[];
  maintenanceRisks: IntelligenceInsight[];
};

@Injectable()
export class IntelligenceService {
  constructor(private readonly config: ConfigService, private readonly erp: ErpService) {}

  async overview(companyId: string, token: string): Promise<IntelligenceSnapshot> {
    const today = new Date().toISOString().slice(0, 10);
    const from = `${today.slice(0, 7)}-01`;
    const [reportRaw, tripDetailsRaw, ledgerRaw, maintenanceRaw] = await Promise.all([
      this.erp.reportsSummary(companyId, token, from, today),
      this.erp.tripDetailReport(companyId, token, from, today),
      this.erp.ledger(companyId, token),
      this.erp.maintenance(companyId, token),
    ]);
    const report = (reportRaw ?? {}) as DataRow;
    const trips = Array.isArray(tripDetailsRaw) ? tripDetailsRaw as DataRow[] : [];
    const profitability = Array.isArray(report.profitability) ? report.profitability as DataRow[] : [];
    const ledger = Array.isArray(ledgerRaw) ? ledgerRaw as DataRow[] : [];
    const maintenance = Array.isArray(maintenanceRaw) ? maintenanceRaw as DataRow[] : [];
    const partyBalances = this.partyBalances(ledger);
    const topTrucks = profitability.filter(row => row.dimension === 'truck').map(row => ({ name: text(row.label, 'Unassigned'), trips: number(row.trips), revenue: number(row.revenue), cost: number(row.cost), profit: number(row.profit) })).sort((a, b) => b.profit - a.profit).slice(0, 10);
    const fraudAlerts = this.fraudAlerts(trips);
    const profitabilityAdvice = this.profitabilityAdvice(trips);
    const maintenanceRisks = this.maintenanceRisks(maintenance, today);
    const reportSummary = (report.summary ?? {}) as DataRow;
    return { period: { from, to: today }, summary: { trips: number(reportSummary.trips), revenue: number(reportSummary.revenue), cost: number(reportSummary.cost), profit: number(reportSummary.profit), fraudAlerts: fraudAlerts.length, maintenanceRisks: maintenanceRisks.length }, partyBalances, topTrucks, fraudAlerts, profitabilityAdvice, maintenanceRisks };
  }

  async ask(companyId: string, token: string, question: string) {
    const snapshot = await this.overview(companyId, token);
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) return { answer: this.localAnswer(question, snapshot), source: 'fleetora-rules', configured: false };
    try {
      return { answer: await this.groqAnswer(apiKey, question, snapshot), source: 'groq', configured: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Groq error';
      if (/401|invalid.*key|authentication/i.test(detail)) throw new ServiceUnavailableException('Fleetora AI key is invalid or unavailable.');
      return { answer: this.localAnswer(question, snapshot), source: 'fleetora-rules', configured: true };
    }
  }

  private partyBalances(rows: DataRow[]) {
    const balances = new Map<string, { name: string; debit: number; credit: number }>();
    for (const row of rows) {
      const customer = (row.customers ?? {}) as DataRow; const name = text(customer.name, 'Unassigned party');
      const current = balances.get(name) ?? { name, debit: 0, credit: 0 };
      if (row.entry_type === 'debit') current.debit += number(row.amount);
      if (row.entry_type === 'credit') current.credit += number(row.amount);
      balances.set(name, current);
    }
    return [...balances.values()].map(row => ({ ...row, balance: row.debit - row.credit })).sort((a, b) => b.balance - a.balance);
  }

  private fraudAlerts(trips: DataRow[]): IntelligenceInsight[] {
    const alerts: IntelligenceInsight[] = [];
    for (const [rst, rows] of groupBy(trips.filter(row => text(row.rst_number)), row => text(row.rst_number))) if (rows.length > 1) alerts.push({ id: `duplicate-rst-${rst}`, category: 'duplicate', severity: 'critical', title: `Duplicate RST ${rst}`, description: `${rows.length} completed trips use the same RST number.`, entity: rst, value: rows.length });
    for (const [key, rows] of groupBy(trips, row => `${text(row.customer_id)}:${text(row.trip_number)}`)) if (rows.length > 1) alerts.push({ id: `duplicate-trip-${key}`, category: 'duplicate', severity: 'critical', title: `Repeated trip ${text(rows[0].trip_number)}`, description: `This party has ${rows.length} records with the same trip number.`, entity: text(rows[0].customer_name), value: rows.length });
    for (const trip of trips) {
      const gross = nullableNumber(trip.gross_weight); const tare = nullableNumber(trip.tare_weight); const net = number(trip.quantity_tonnes);
      if (gross !== null && tare !== null && tare > gross) alerts.push({ id: `tare-${text(trip.id)}`, category: 'weight', severity: 'critical', title: `Tare exceeds gross on trip ${text(trip.trip_number)}`, description: `Gross ${gross} t, tare ${tare} t.`, entity: text(trip.vehicle_registration) });
      if (gross !== null && tare !== null && Math.abs((gross - tare) - net) > 0.02) alerts.push({ id: `net-${text(trip.id)}`, category: 'weight', severity: 'warning', title: `Net-weight mismatch on trip ${text(trip.trip_number)}`, description: `Gross minus tare is ${(gross - tare).toFixed(2)} t, but saved net weight is ${net.toFixed(2)} t.`, entity: text(trip.rst_number) });
      const revenue = number(trip.freight_amount); const cost = number(trip.cost);
      if (revenue > 0 && cost / revenue >= 0.6) alerts.push({ id: `cost-${text(trip.id)}`, category: 'cost', severity: cost > revenue ? 'critical' : 'warning', title: `High trip cost on ${text(trip.trip_number)}`, description: `Recorded cost is ${Math.round(cost / revenue * 100)}% of freight revenue.`, entity: text(trip.vehicle_registration), value: cost });
    }
    for (const rows of groupBy(trips.filter(row => number(row.rate) > 0), row => `${text(row.customer_id)}:${text(row.origin)}:${text(row.destination)}`).values()) {
      if (rows.length < 3) continue; const average = rows.reduce((sum, row) => sum + number(row.rate), 0) / rows.length;
      for (const trip of rows) if (Math.abs(number(trip.rate) - average) / average >= 0.35) alerts.push({ id: `rate-${text(trip.id)}`, category: 'rate', severity: 'warning', title: `Unusual rate on trip ${text(trip.trip_number)}`, description: `Rate ${number(trip.rate).toFixed(2)} differs significantly from route average ${average.toFixed(2)}.`, entity: `${text(trip.origin)} → ${text(trip.destination)}`, value: number(trip.rate) });
    }
    return alerts.slice(0, 50);
  }

  private profitabilityAdvice(trips: DataRow[]): IntelligenceInsight[] {
    const advice: IntelligenceInsight[] = [];
    for (const [route, rows] of groupBy(trips, row => `${text(row.origin)} → ${text(row.destination)}`)) {
      const revenue = rows.reduce((sum, row) => sum + number(row.freight_amount), 0); const cost = rows.reduce((sum, row) => sum + number(row.cost), 0); const weight = rows.reduce((sum, row) => sum + number(row.quantity_tonnes), 0); const empty = rows.reduce((sum, row) => sum + number(row.empty_distance_km), 0); const loaded = rows.reduce((sum, row) => sum + number(row.distance_km), 0);
      if (revenue - cost < 0) advice.push({ id: `loss-${route}`, category: 'profitability', severity: 'critical', title: `Loss-making route: ${route}`, description: `${rows.length} trips produced a loss of ${money(cost - revenue)}.`, entity: route, value: revenue - cost });
      if (empty + loaded > 0 && empty / (empty + loaded) >= 0.3) advice.push({ id: `empty-${route}`, category: 'utilization', severity: 'warning', title: `High empty running: ${route}`, description: `${Math.round(empty / (empty + loaded) * 100)}% of recorded distance is empty running.`, entity: route });
      if (weight > 0 && cost > 0) advice.push({ id: `rate-${route}`, category: 'pricing', severity: 'info', title: `Suggested minimum rate: ${route}`, description: `For a 15% operating margin, target at least ${money(cost * 1.15 / weight)} per tonne based on this month's costs.`, entity: route, value: cost * 1.15 / weight });
    }
    return advice.sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 30);
  }

  private maintenanceRisks(rows: DataRow[], today: string): IntelligenceInsight[] {
    const horizon = new Date(`${today}T00:00:00Z`); horizon.setUTCDate(horizon.getUTCDate() + 30);
    return rows.filter(row => !['completed', 'cancelled'].includes(text(row.status))).map(row => {
      const vehicle = (row.vehicles ?? {}) as DataRow; const due = text(row.due_on); const overdue = text(row.status) === 'overdue' || Boolean(due && due < today); const dueSoon = Boolean(due && due <= horizon.toISOString().slice(0, 10)); const critical = overdue || row.breakdown === true || text(row.priority) === 'critical';
      return { id: `maintenance-${text(row.id)}`, category: 'maintenance', severity: critical ? 'critical' : dueSoon || text(row.priority) === 'high' ? 'warning' : 'info', title: `${text(row.maintenance_type, 'Maintenance')} · ${text(vehicle.registration_number, 'Unassigned vehicle')}`, description: overdue ? `Overdue since ${due || 'the scheduled date'}.` : dueSoon ? `Due on ${due}.` : `Status: ${text(row.status, 'scheduled')}. Priority: ${text(row.priority, 'normal')}.`, entity: text(vehicle.registration_number) } as IntelligenceInsight;
    }).sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 30);
  }

  private localAnswer(question: string, snapshot: IntelligenceSnapshot) {
    const normalized = question.toLowerCase(); const party = snapshot.partyBalances.find(row => normalized.includes(row.name.toLowerCase()));
    if (party && /(owe|owes|outstanding|balance|udhar)/.test(normalized)) return `${party.name} currently owes ${money(party.balance)}. Trip debits are ${money(party.debit)} and recorded payments are ${money(party.credit)}.`;
    if (/(highest|largest|most|top).*(outstanding|balance|owe|udhar)/.test(normalized)) { const highest = snapshot.partyBalances[0]; return highest ? `${highest.name} has the highest outstanding balance at ${money(highest.balance)}. Trip debits are ${money(highest.debit)} and recorded payments are ${money(highest.credit)}.` : 'There are no party-ledger balances available.'; }
    if (/(truck|vehicle).*(earned|profit|best|top)/.test(normalized) || /(earned|profit|best|top).*(truck|vehicle)/.test(normalized)) { const top = snapshot.topTrucks[0]; return top ? `${top.name} has the highest profit this month: ${money(top.profit)} from ${top.trips} completed trips and ${money(top.revenue)} revenue.` : 'There are no completed truck-profitability records for this month.'; }
    if (/weight|gross|tare|rst|fraud|duplicate|unusual/.test(normalized)) return snapshot.fraudAlerts.length ? snapshot.fraudAlerts.slice(0, 5).map(alert => `• ${alert.title}: ${alert.description}`).join('\n') : 'No weight, duplicate RST, unusual-rate, or high-cost alerts were detected this month.';
    if (/maintenance|service|repair|breakdown/.test(normalized)) return snapshot.maintenanceRisks.length ? snapshot.maintenanceRisks.slice(0, 5).map(risk => `• ${risk.title}: ${risk.description}`).join('\n') : 'No open maintenance risks were found.';
    if (/profit|rate|route|empty|cost/.test(normalized)) return snapshot.profitabilityAdvice.length ? snapshot.profitabilityAdvice.slice(0, 5).map(item => `• ${item.title}: ${item.description}`).join('\n') : 'No profitability recommendations are available yet. Complete more trips with costs and distances to improve the analysis.';
    return `This month's Fleetora summary: ${snapshot.summary.trips} completed trips, ${money(snapshot.summary.revenue)} revenue, ${money(snapshot.summary.cost)} cost, and ${money(snapshot.summary.profit)} profit. Ask about a party balance, top truck, unusual weights, profitability, or maintenance.`;
  }

  private async groqAnswer(apiKey: string, question: string, snapshot: IntelligenceSnapshot) {
    const tools = [tool('get_party_balances', 'Get read-only party outstanding balances.'), tool('get_top_trucks', 'Get truck revenue, cost, and profit rankings for this month.'), tool('get_fraud_alerts', 'Get duplicate, weight, rate, and high-cost alerts.'), tool('get_profitability_advice', 'Get route, empty-running, and pricing recommendations.'), tool('get_maintenance_risks', 'Get overdue and upcoming maintenance risks.'), tool('get_month_summary', 'Get the current month operational and financial summary.')];
    const model = this.config.get<string>('GROQ_MODEL') || 'openai/gpt-oss-20b';
    let response = await this.groqRequest(apiKey, { model, instructions: 'You are Fleetora AI, a concise transport operations analyst. Use only supplied read-only tools. Never invent records or claim to change data. Show INR amounts clearly and say when data is insufficient.', input: question, tools });
    for (let turn = 0; turn < 4; turn += 1) {
      const calls = Array.isArray(response.output) ? (response.output as DataRow[]).filter(item => item.type === 'function_call') : [];
      if (!calls.length) return responseText(response) || this.localAnswer(question, snapshot);
      response = await this.groqRequest(apiKey, { model, previous_response_id: response.id, input: calls.map(call => ({ type: 'function_call_output', call_id: text(call.call_id), output: JSON.stringify(this.toolResult(text(call.name), snapshot)) })), tools });
    }
    return responseText(response) || this.localAnswer(question, snapshot);
  }

  private toolResult(name: string, snapshot: IntelligenceSnapshot): unknown {
    if (name === 'get_party_balances') return snapshot.partyBalances; if (name === 'get_top_trucks') return snapshot.topTrucks; if (name === 'get_fraud_alerts') return snapshot.fraudAlerts; if (name === 'get_profitability_advice') return snapshot.profitabilityAdvice; if (name === 'get_maintenance_risks') return snapshot.maintenanceRisks; return { period: snapshot.period, summary: snapshot.summary };
  }

  private async groqRequest(apiKey: string, body: Record<string, unknown>): Promise<DataRow> {
    const response = await fetch('https://api.groq.com/openai/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Groq request failed (${response.status}): ${await response.text()}`);
    return response.json() as Promise<DataRow>;
  }
}

function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function number(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function nullableNumber(value: unknown) { return value === null || value === undefined || value === '' ? null : number(value); }
function money(value: number) { return `INR ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
function severityRank(value: InsightSeverity) { return value === 'critical' ? 0 : value === 'warning' ? 1 : 2; }
function groupBy<T>(rows: T[], key: (row: T) => string) { const groups = new Map<string, T[]>(); for (const row of rows) { const value = key(row); groups.set(value, [...(groups.get(value) ?? []), row]); } return groups; }
function tool(name: string, description: string) { return { type: 'function', name, description, strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } }; }
function responseText(response: DataRow) { const output = Array.isArray(response.output) ? response.output as DataRow[] : []; for (const item of output) if (item.type === 'message' && Array.isArray(item.content)) for (const part of item.content as DataRow[]) if (part.type === 'output_text' && typeof part.text === 'string') return part.text; return ''; }
