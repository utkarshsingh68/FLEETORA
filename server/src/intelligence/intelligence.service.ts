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
  documentRisks: IntelligenceInsight[];
  driverRisks: Array<{ driverId: string; name: string; score: number; level: string; trips: number; reasons: string[] }>;
  dailySummary: { date: string; trips: number; revenue: number; cost: number; profit: number; overdueVehicles: number; unpaidCustomers: number; message: string };
};

@Injectable()
export class IntelligenceService {
  constructor(private readonly config: ConfigService, private readonly erp: ErpService) {}

  async overview(companyId: string, token: string): Promise<IntelligenceSnapshot> {
    const today = new Date().toISOString().slice(0, 10);
    const from = `${today.slice(0, 7)}-01`;
    const [reportRaw, todayReportRaw, tripDetailsRaw, ledgerRaw, maintenanceRaw, documentsRaw, driversRaw, fuelRaw] = await Promise.all([
      this.erp.reportsSummary(companyId, token, from, today),
      this.erp.reportsSummary(companyId, token, today, today),
      this.erp.tripDetailReport(companyId, token, from, today),
      this.erp.ledger(companyId, token),
      this.erp.maintenance(companyId, token),
      this.erp.documents(companyId, token),
      this.erp.drivers(companyId, token, 500),
      this.erp.fuelEfficiency(companyId, token, from, today),
    ]);
    const report = (reportRaw ?? {}) as DataRow;
    const trips = Array.isArray(tripDetailsRaw) ? tripDetailsRaw as DataRow[] : [];
    const profitability = Array.isArray(report.profitability) ? report.profitability as DataRow[] : [];
    const ledger = Array.isArray(ledgerRaw) ? ledgerRaw as DataRow[] : [];
    const maintenance = Array.isArray(maintenanceRaw) ? maintenanceRaw as DataRow[] : [];
    const documents = Array.isArray(documentsRaw) ? documentsRaw as DataRow[] : [];
    const drivers = Array.isArray(driversRaw) ? driversRaw as DataRow[] : [];
    const fuel = (fuelRaw ?? {}) as DataRow;
    const partyBalances = this.partyBalances(ledger);
    const topTrucks = profitability.filter(row => row.dimension === 'truck').map(row => ({ name: text(row.label, 'Unassigned'), trips: number(row.trips), revenue: number(row.revenue), cost: number(row.cost), profit: number(row.profit) })).sort((a, b) => b.profit - a.profit).slice(0, 10);
    const fraudAlerts = this.fraudAlerts(trips);
    const profitabilityAdvice = this.profitabilityAdvice(trips);
    const maintenanceRisks = this.maintenanceRisks(maintenance, today);
    const documentRisks = this.documentRisks(documents, drivers, today);
    const driverRisks = this.driverRisks(drivers, trips, maintenance, documents, fuel, today);
    const reportSummary = (report.summary ?? {}) as DataRow;
    const todaySummary = ((todayReportRaw ?? {}) as DataRow).summary as DataRow ?? {};
    const overdueVehicles = new Set([...maintenanceRisks, ...documentRisks].filter(row => row.severity === 'critical').map(row => row.entity).filter(Boolean)).size;
    const unpaidCustomers = partyBalances.filter(row => row.balance > 0).length;
    const dailySummary = { date: today, trips: number(todaySummary.trips), revenue: number(todaySummary.revenue), cost: number(todaySummary.cost), profit: number(todaySummary.profit), overdueVehicles, unpaidCustomers, message: `Today: ${number(todaySummary.trips)} completed trips, ${money(number(todaySummary.revenue))} revenue, ${overdueVehicles} overdue vehicle${overdueVehicles === 1 ? '' : 's'}, and ${unpaidCustomers} customer${unpaidCustomers === 1 ? '' : 's'} with outstanding balances.` };
    return { period: { from, to: today }, summary: { trips: number(reportSummary.trips), revenue: number(reportSummary.revenue), cost: number(reportSummary.cost), profit: number(reportSummary.profit), fraudAlerts: fraudAlerts.length, maintenanceRisks: maintenanceRisks.length, documentRisks: documentRisks.length, highRiskDrivers: driverRisks.filter(row => row.score >= 45).length }, partyBalances, topTrucks, fraudAlerts, profitabilityAdvice, maintenanceRisks, documentRisks, driverRisks, dailySummary };
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

  private documentRisks(documents: DataRow[], drivers: DataRow[], today: string): IntelligenceInsight[] {
    const horizon = addDays(today, 30);
    const risks: IntelligenceInsight[] = documents.filter(row => text(row.expires_on) && text(row.expires_on) <= horizon).map(row => {
      const vehicle = (row.vehicles ?? {}) as DataRow; const driver = (row.drivers ?? {}) as DataRow; const expiry = text(row.expires_on); const expired = expiry < today; const entity = text(vehicle.registration_number) || text(driver.full_name) || 'Unassigned';
      return { id: `document-${text(row.id)}`, category: 'document', severity: expired ? 'critical' : 'warning', title: `${text(row.document_type, 'Document').toUpperCase()} ${expired ? 'expired' : 'expires soon'}`, description: `${entity} ${expired ? 'expired on' : 'expires on'} ${expiry}.`, entity } as IntelligenceInsight;
    });
    for (const driver of drivers) {
      const expiry = text(driver.license_expiry); if (!expiry || expiry > horizon) continue;
      const expired = expiry < today; risks.push({ id: `license-${text(driver.id)}`, category: 'document', severity: expired ? 'critical' : 'warning', title: `Driving licence ${expired ? 'expired' : 'expires soon'}`, description: `${text(driver.full_name, 'Driver')} ${expired ? 'expired on' : 'expires on'} ${expiry}.`, entity: text(driver.full_name) });
    }
    return risks.sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 50);
  }

  private driverRisks(drivers: DataRow[], trips: DataRow[], maintenance: DataRow[], documents: DataRow[], fuel: DataRow, today: string) {
    const horizon = addDays(today, 30); const fuelVehicles = Array.isArray(fuel.vehicles) ? fuel.vehicles as DataRow[] : [];
    const mileageValues = fuelVehicles.map(row => nullableNumber(row.km_per_litre)).filter((value): value is number => value !== null && value > 0);
    const fleetMileage = mileageValues.length ? mileageValues.reduce((sum, value) => sum + value, 0) / mileageValues.length : null;
    return drivers.map(driver => {
      const driverId = text(driver.id); const driverTrips = trips.filter(row => text(row.driver_id) === driverId); const vehicleIds = new Set(driverTrips.map(row => text(row.vehicle_id)).filter(Boolean)); const reasons: string[] = []; let score = 0;
      const licenceExpiry = text(driver.license_expiry); if (licenceExpiry && licenceExpiry < today) { score += 40; reasons.push('Driving licence is expired'); } else if (licenceExpiry && licenceExpiry <= horizon) { score += 20; reasons.push('Driving licence expires within 30 days'); }
      const documentViolations = documents.filter(row => text(row.driver_id) === driverId && text(row.expires_on) && text(row.expires_on) <= horizon).length; if (documentViolations) { score += Math.min(30, documentViolations * 15); reasons.push(`${documentViolations} document expiry warning${documentViolations === 1 ? '' : 's'}`); }
      const breakdowns = maintenance.filter(row => row.breakdown === true && vehicleIds.has(text(row.vehicle_id))).length; if (breakdowns) { score += Math.min(30, breakdowns * 15); reasons.push(`${breakdowns} breakdown${breakdowns === 1 ? '' : 's'} on assigned vehicles`); }
      const exceptions = driverTrips.filter(row => ['delayed', 'cancelled'].includes(text(row.status))).length; if (exceptions) { score += Math.min(20, exceptions * 5); reasons.push(`${exceptions} delayed or cancelled trip${exceptions === 1 ? '' : 's'}`); }
      const revenue = driverTrips.reduce((sum, row) => sum + number(row.freight_amount), 0); const cost = driverTrips.reduce((sum, row) => sum + number(row.cost), 0); if (revenue > 0 && cost / revenue >= 0.6) { score += 15; reasons.push(`Trip costs are ${Math.round(cost / revenue * 100)}% of revenue`); }
      const mileages = fuelVehicles.filter(row => vehicleIds.has(text(row.vehicle_id))).map(row => nullableNumber(row.km_per_litre)).filter((value): value is number => value !== null && value > 0); const mileage = mileages.length ? mileages.reduce((sum, value) => sum + value, 0) / mileages.length : null; if (fleetMileage && mileage && mileage < fleetMileage * 0.75) { score += 20; reasons.push(`Fuel efficiency is below fleet average (${mileage.toFixed(1)} km/L)`); }
      score = Math.min(100, score); const level = score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 20 ? 'medium' : 'low';
      return { driverId, name: text(driver.full_name, 'Unnamed driver'), score, level, trips: driverTrips.length, reasons: reasons.length ? reasons : ['No significant risk signals detected'] };
    }).sort((a, b) => b.score - a.score);
  }

  private localAnswer(question: string, snapshot: IntelligenceSnapshot) {
    const normalized = question.toLowerCase(); const party = snapshot.partyBalances.find(row => normalized.includes(row.name.toLowerCase()));
    if (party && /(owe|owes|outstanding|balance|udhar)/.test(normalized)) return `${party.name} currently owes ${money(party.balance)}. Trip debits are ${money(party.debit)} and recorded payments are ${money(party.credit)}.`;
    if (/(highest|largest|most|top).*(outstanding|balance|owe|udhar)/.test(normalized)) { const highest = snapshot.partyBalances[0]; return highest ? `${highest.name} has the highest outstanding balance at ${money(highest.balance)}. Trip debits are ${money(highest.debit)} and recorded payments are ${money(highest.credit)}.` : 'There are no party-ledger balances available.'; }
    if (/(truck|vehicle).*(earned|profit|best|top)/.test(normalized) || /(earned|profit|best|top).*(truck|vehicle)/.test(normalized)) { const top = snapshot.topTrucks[0]; return top ? `${top.name} has the highest profit this month: ${money(top.profit)} from ${top.trips} completed trips and ${money(top.revenue)} revenue.` : 'There are no completed truck-profitability records for this month.'; }
    if (/weight|gross|tare|rst|fraud|duplicate|unusual/.test(normalized)) return snapshot.fraudAlerts.length ? snapshot.fraudAlerts.slice(0, 5).map(alert => `• ${alert.title}: ${alert.description}`).join('\n') : 'No weight, duplicate RST, unusual-rate, or high-cost alerts were detected this month.';
    if (/driver.*risk|risk.*driver/.test(normalized)) return snapshot.driverRisks.slice(0, 5).map(row => `${row.name}: ${row.score}/100 (${row.level}) - ${row.reasons.join(', ')}`).join('\n');
    if (/document|licen[cs]e|expiry|expire/.test(normalized)) return snapshot.documentRisks.length ? snapshot.documentRisks.slice(0, 5).map(risk => `${risk.title}: ${risk.description}`).join('\n') : 'No document expiry risks were found for the next 30 days.';
    if (/today|daily|owner summary/.test(normalized)) return snapshot.dailySummary.message;
    if (/maintenance|service|repair|breakdown/.test(normalized)) return snapshot.maintenanceRisks.length ? snapshot.maintenanceRisks.slice(0, 5).map(risk => `• ${risk.title}: ${risk.description}`).join('\n') : 'No open maintenance risks were found.';
    if (/profit|rate|route|empty|cost/.test(normalized)) return snapshot.profitabilityAdvice.length ? snapshot.profitabilityAdvice.slice(0, 5).map(item => `• ${item.title}: ${item.description}`).join('\n') : 'No profitability recommendations are available yet. Complete more trips with costs and distances to improve the analysis.';
    return `This month's Fleetora summary: ${snapshot.summary.trips} completed trips, ${money(snapshot.summary.revenue)} revenue, ${money(snapshot.summary.cost)} cost, and ${money(snapshot.summary.profit)} profit. Ask about a party balance, top truck, unusual weights, profitability, or maintenance.`;
  }

  private async groqAnswer(apiKey: string, question: string, snapshot: IntelligenceSnapshot) {
    const tools = [tool('get_party_balances', 'Get read-only party outstanding balances.'), tool('get_top_trucks', 'Get truck revenue, cost, and profit rankings for this month.'), tool('get_fraud_alerts', 'Get duplicate, weight, rate, and high-cost alerts.'), tool('get_profitability_advice', 'Get route, empty-running, and pricing recommendations.'), tool('get_maintenance_risks', 'Get overdue and upcoming maintenance risks.'), tool('get_document_risks', 'Get expired and expiring compliance documents.'), tool('get_driver_risks', 'Get driver risk scores and reasons.'), tool('get_daily_summary', 'Get today owner summary.'), tool('get_month_summary', 'Get the current month operational and financial summary.')];
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
    if (name === 'get_party_balances') return snapshot.partyBalances; if (name === 'get_top_trucks') return snapshot.topTrucks; if (name === 'get_fraud_alerts') return snapshot.fraudAlerts; if (name === 'get_profitability_advice') return snapshot.profitabilityAdvice; if (name === 'get_maintenance_risks') return snapshot.maintenanceRisks; if (name === 'get_document_risks') return snapshot.documentRisks; if (name === 'get_driver_risks') return snapshot.driverRisks; if (name === 'get_daily_summary') return snapshot.dailySummary; return { period: snapshot.period, summary: snapshot.summary };
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
function addDays(date: string, days: number) { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function groupBy<T>(rows: T[], key: (row: T) => string) { const groups = new Map<string, T[]>(); for (const row of rows) { const value = key(row); groups.set(value, [...(groups.get(value) ?? []), row]); } return groups; }
function tool(name: string, description: string) { return { type: 'function', name, description, strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } }; }
function responseText(response: DataRow) { const output = Array.isArray(response.output) ? response.output as DataRow[] : []; for (const item of output) if (item.type === 'message' && Array.isArray(item.content)) for (const part of item.content as DataRow[]) if (part.type === 'output_text' && typeof part.text === 'string') return part.text; return ''; }
