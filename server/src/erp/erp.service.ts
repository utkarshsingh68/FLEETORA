import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PaginatedTripsQueryDto } from './erp.dto';

type TripPaginationResponse = {
  data: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class ErpService {
  constructor(private readonly db: SupabaseService) {}

  vehicles(companyId: string, token: string, limit = 25) {
    return this.db.select('vehicles', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: Math.min(limit, 500) });
  }

  trips(companyId: string, token: string, limit = 25, status?: string) {
    return this.db.select('trips', token, { select: '*,customers(name),vehicles(registration_number),drivers(full_name)', company_id: `eq.${companyId}`, deleted_at: 'is.null', status: status ? `eq.${status}` : undefined, order: 'created_at.desc', limit: Math.min(limit, 500) });
  }

  /**
   * Fetches one exact-count page through a database function rather than
   * loading every trip into Node. The function also performs cross-table
   * customer, vehicle, driver, invoice, and LR document searches securely.
   */
  paginatedTrips(companyId: string, token: string, query: PaginatedTripsQueryDto) {
    const requestedSize = query.pageSize ?? 25;
    const pageSize = requestedSize <= 25 ? 25 : requestedSize <= 50 ? 50 : 100;
    const page = Math.min(Math.max(query.page ?? 1, 1), 1_000_000);

    return this.db.rpc<TripPaginationResponse>('fleetora_paginate_trips', token, {
      p_company_id: companyId,
      p_page: page,
      p_page_size: pageSize,
      p_search: query.search?.trim() || null,
      p_status: query.status ?? null,
      p_vehicle_id: query.vehicleId ?? null,
      p_driver_id: query.driverId ?? null,
      p_customer_id: query.customerId ?? null,
      p_material: query.material?.trim() || null,
      p_payment_status: query.paymentStatus ?? null,
      p_date_from: query.dateFrom ?? null,
      p_date_to: query.dateTo ?? null,
      p_sort: query.sort ?? 'newest',
    });
  }

  customers(companyId: string, token: string, limit = 25) {
    return this.db.select('customers', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: Math.min(limit, 500) });
  }

  drivers(companyId: string, token: string, limit = 100) {
    return this.db.select('drivers', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: Math.min(limit, 500) });
  }

  async resources(companyId: string, token: string) {
    const [vehicles, drivers, customers] = await Promise.all([
      this.vehicles(companyId, token, 100), this.drivers(companyId, token, 100), this.customers(companyId, token, 100),
    ]);
    return { vehicles, drivers, customers };
  }

  createVehicle(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert(
      'vehicles',
      token,
      this.clean(body, ['registration_number', 'make_model', 'capacity_tonnes', 'status', 'current_location', 'assigned_driver_id'], companyId),
    );
  }

  updateVehicle(companyId: string, token: string, vehicleId: string, body: Record<string, unknown>) {
    return this.db.update(
      'vehicles',
      token,
      { id: `eq.${vehicleId}`, company_id: `eq.${companyId}` },
      this.clean(body, ['registration_number', 'make_model', 'capacity_tonnes', 'status', 'current_location', 'assigned_driver_id']),
    );
  }

  deleteVehicle(companyId: string, token: string, id: string, actorId?: string) {
    return this.softDelete('vehicles', companyId, token, id, actorId);
  }

  createDriver(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('drivers', token, this.clean(body, ['full_name', 'phone', 'license_number', 'license_expiry', 'emergency_contact', 'salary', 'status'], companyId));
  }

  updateDriver(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('drivers', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['full_name', 'phone', 'license_number', 'license_expiry', 'emergency_contact', 'salary', 'status']));
  }

  deleteDriver(companyId: string, token: string, id: string, actorId?: string) {
    return this.softDelete('drivers', companyId, token, id, actorId);
  }

  documents(companyId: string, token: string) {
    return this.db.select('documents', token, { select: '*,vehicles(registration_number),drivers(full_name)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'expires_on.asc.nullslast', limit: 500 });
  }

  createDocument(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('documents', token, this.clean(body, ['vehicle_id', 'driver_id', 'document_type', 'document_number', 'issued_on', 'expires_on', 'storage_path', 'status'], companyId));
  }

  updateDocument(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('documents', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['vehicle_id', 'driver_id', 'document_type', 'document_number', 'issued_on', 'expires_on', 'storage_path', 'status']));
  }

  deleteDocument(companyId: string, token: string, id: string, actorId?: string) {
    return this.softDelete('documents', companyId, token, id, actorId);
  }

  createCustomer(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('customers', token, this.clean(body, ['name', 'contact_name', 'email', 'phone', 'credit_limit', 'payment_terms_days', 'status'], companyId));
  }

  updateCustomer(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('customers', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['name', 'contact_name', 'email', 'phone', 'credit_limit', 'payment_terms_days', 'status']));
  }

  deleteCustomer(companyId: string, token: string, id: string, actorId?: string) {
    return this.softDelete('customers', companyId, token, id, actorId);
  }

  moduleRecords(companyId: string, token: string, module: string, limit = 100) {
    return this.db.select('module_records', token, { company_id: `eq.${companyId}`, module: `eq.${module}`, deleted_at: 'is.null', order: 'updated_at.desc', limit: Math.min(limit, 500) });
  }

  createModuleRecord(companyId: string, token: string, module: string, body: Record<string, unknown>) {
    return this.db.insert('module_records', token, this.cleanModuleRecord({ ...body, company_id: companyId, module }));
  }

  updateModuleRecord(companyId: string, token: string, module: string, id: string, body: Record<string, unknown>) {
    return this.db.update('module_records', token, { id: `eq.${id}`, company_id: `eq.${companyId}`, module: `eq.${module}` }, this.cleanModuleRecord(body));
  }

  deleteModuleRecord(companyId: string, token: string, module: string, id: string, actorId?: string) {
    return this.db.update('module_records', token, { id: `eq.${id}`, company_id: `eq.${companyId}`, module: `eq.${module}` }, { deleted_at: new Date().toISOString(), deleted_by: actorId ?? null });
  }

  private cleanModuleRecord(body: Record<string, unknown>) {
    const allowed = ['company_id', 'module', 'name', 'reference', 'status', 'notes', 'amount', 'event_date', 'metadata'];
    return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  }

  createTrip(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('trips', token, this.clean(body, ['trip_number', 'rst_number', 'customer_id', 'vehicle_id', 'driver_id', 'origin', 'destination', 'material_name', 'scheduled_start_at', 'scheduled_end_at', 'actual_start_at', 'actual_end_at', 'status', 'rate_type', 'rate', 'gross_weight', 'tare_weight', 'quantity_tonnes', 'distance_km', 'empty_distance_km', 'notes'], companyId));
  }

  updateTrip(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('trips', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['trip_number', 'rst_number', 'customer_id', 'vehicle_id', 'driver_id', 'origin', 'destination', 'material_name', 'scheduled_start_at', 'scheduled_end_at', 'actual_start_at', 'actual_end_at', 'status', 'rate_type', 'rate', 'gross_weight', 'tare_weight', 'quantity_tonnes', 'distance_km', 'empty_distance_km', 'notes']));
  }

  async deleteTrip(companyId: string, token: string, id: string, actorId?: string) {
    await this.db.update('party_ledger', token, { trip_id: `eq.${id}`, company_id: `eq.${companyId}`, entry_type: 'eq.debit' }, { deleted_at: new Date().toISOString(), deleted_by: actorId ?? null });
    return this.softDelete('trips', companyId, token, id, actorId);
  }

  fuelEntries(companyId: string, token: string) {
    return this.db.select('fuel_entries', token, { select: '*,vehicles(registration_number),trips(trip_number)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'filled_at.desc', limit: 500 });
  }

  createFuel(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('fuel_entries', token, this.clean(body, ['vehicle_id', 'trip_id', 'filled_at', 'litres', 'amount', 'odometer_km', 'station_name', 'payment_mode', 'receipt_path', 'notes'], companyId));
  }

  updateFuel(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('fuel_entries', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['vehicle_id', 'trip_id', 'filled_at', 'litres', 'amount', 'odometer_km', 'station_name', 'payment_mode', 'receipt_path', 'notes']));
  }

  expenses(companyId: string, token: string) {
    return this.db.select('operational_expenses', token, { select: '*,vehicles(registration_number),trips(trip_number)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'expense_date.desc', limit: 500 });
  }

  createExpense(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('operational_expenses', token, this.clean(body, ['vehicle_id', 'trip_id', 'category', 'amount', 'payment_mode', 'expense_date', 'receipt_path', 'notes'], companyId));
  }

  updateExpense(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('operational_expenses', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['vehicle_id', 'trip_id', 'category', 'amount', 'payment_mode', 'expense_date', 'receipt_path', 'notes']));
  }

  ledger(companyId: string, token: string) {
    return this.db.select('party_ledger', token, { select: '*,customers(name),trips(trip_number,rst_number,material_name,destination,rate,gross_weight,tare_weight,quantity_tonnes)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'entry_date.desc', limit: 2000 });
  }

  recordPayment(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('party_ledger', token, this.clean({ ...body, entry_type: 'credit' }, ['customer_id', 'entry_date', 'entry_type', 'amount', 'payment_mode', 'reference', 'notes'], companyId));
  }

  updateLedgerEntry(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('party_ledger', token, { id: `eq.${id}`, company_id: `eq.${companyId}`, entry_type: 'eq.credit' }, this.clean(body, ['customer_id', 'entry_date', 'amount', 'payment_mode', 'reference', 'notes']));
  }

  deleteLedgerEntry(companyId: string, token: string, id: string, actorId?: string) {
    return this.db.update('party_ledger', token, { id: `eq.${id}`, company_id: `eq.${companyId}`, entry_type: 'eq.credit' }, { deleted_at: new Date().toISOString(), deleted_by: actorId ?? null });
  }

  async reports(companyId: string, token: string) {
    const [trips, fuel, expenses, ledger, vehicles, drivers, customers] = await Promise.all([
      this.trips(companyId, token, 100), this.fuelEntries(companyId, token), this.expenses(companyId, token),
      this.ledger(companyId, token), this.vehicles(companyId, token, 100), this.drivers(companyId, token, 100), this.customers(companyId, token, 100),
    ]);
    return { trips, fuel, expenses, ledger, vehicles, drivers, customers };
  }

  profitability(companyId: string, token: string, from: string, to: string) {
    return this.db.rpc<Record<string, unknown>>('fleetora_profitability_report', token, { p_company_id: companyId, p_from: from, p_to: to });
  }

  /**
   * Server-side reporting endpoint. The aggregation is performed by Postgres
   * through the reporting RPC, so it is not affected by PostgREST's default
   * row limit and does not transfer every trip/expense to the API server.
   */
  reportsSummary(companyId: string, token: string, from: string, to: string) {
    return this.profitability(companyId, token, from, to);
  }

  tripDetailReport(companyId: string, token: string, from: string, to: string) {
    return this.db.rpc<Record<string, unknown>[]>('fleetora_trip_detail_report', token, {
      p_company_id: companyId,
      p_from: from,
      p_to: to,
    });
  }

  fuelEfficiency(companyId: string, token: string, from: string, to: string) {
    return this.db.rpc<Record<string, unknown>>('fleetora_fuel_efficiency_report', token, {
      p_company_id: companyId,
      p_from: from,
      p_to: to,
    });
  }

  async workspaceContext(userId: string, token: string, activeCompanyId: string) {
    const [memberships, branches] = await Promise.all([
      this.db.select('company_members', token, { select: 'company_id,branch_id,role,companies(id,name,legal_name,currency,timezone)', user_id: `eq.${userId}`, order: 'created_at.asc', limit: 100 }),
      this.db.select('branches', token, { company_id: `eq.${activeCompanyId}`, order: 'name.asc', limit: 100 }),
    ]);
    return { activeCompanyId, memberships, branches };
  }

  maintenance(companyId: string, token: string) {
    return this.db.select('maintenance_records', token, { select: '*,vehicles(registration_number),mechanics(full_name)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: 500 });
  }
  mechanics(companyId: string, token: string) {
    return this.db.select('mechanics', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'full_name.asc', limit: 500 });
  }
  createMaintenance(companyId: string, token: string, body: Record<string, unknown>) {
    const cost = Number(body.labor_cost ?? 0) + Number(body.parts_cost ?? 0);
    return this.db.insert('maintenance_records', token, this.clean({ ...body, cost }, ['vehicle_id','mechanic_id','job_number','maintenance_type','status','priority','approval_status','due_on','completed_on','odometer_km','due_odometer_km','labor_cost','parts_cost','cost','vendor_name','breakdown','downtime_started_at','downtime_ended_at','notes'], companyId));
  }
  updateMaintenance(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    const cost = body.labor_cost !== undefined || body.parts_cost !== undefined ? Number(body.labor_cost ?? 0) + Number(body.parts_cost ?? 0) : undefined;
    return this.db.update('maintenance_records', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean({ ...body, ...(cost === undefined ? {} : { cost }) }, ['vehicle_id','mechanic_id','job_number','maintenance_type','status','priority','approval_status','approved_by','approved_at','due_on','completed_on','odometer_km','due_odometer_km','labor_cost','parts_cost','cost','vendor_name','breakdown','downtime_started_at','downtime_ended_at','notes']));
  }
  approveMaintenance(companyId: string, token: string, id: string, actorId: string, approved: boolean) {
    return this.db.update('maintenance_records', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, { approval_status: approved ? 'approved' : 'rejected', approved_by: actorId, approved_at: new Date().toISOString() });
  }

  parts(companyId: string, token: string) { return this.db.select('inventory_parts', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'name.asc', limit: 1000 }); }
  createPart(companyId: string, token: string, body: Record<string, unknown>) { return this.db.insert('inventory_parts', token, this.clean(body, ['branch_id','sku','name','category','unit','quantity','reorder_level','unit_cost','vendor_name'], companyId)); }
  updatePart(companyId: string, token: string, id: string, body: Record<string, unknown>) { return this.db.update('inventory_parts', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['branch_id','sku','name','category','unit','quantity','reorder_level','unit_cost','vendor_name'])); }

  tyres(companyId: string, token: string) { return this.db.select('tyre_assets', token, { select: '*,vehicles(registration_number)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: 1000 }); }
  createTyre(companyId: string, token: string, body: Record<string, unknown>) { return this.db.insert('tyre_assets', token, this.clean(body, ['vehicle_id','serial_number','brand','position','purchase_date','purchase_cost','installed_odometer_km','removed_odometer_km','status'], companyId)); }
  updateTyre(companyId: string, token: string, id: string, body: Record<string, unknown>) { return this.db.update('tyre_assets', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['vehicle_id','serial_number','brand','position','purchase_date','purchase_cost','installed_odometer_km','removed_odometer_km','status'])); }

  portalRequests(companyId: string, token: string) { return this.db.select('portal_requests', token, { select: '*,customers(name)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: 1000 }); }
  createPortalRequest(companyId: string, token: string, userId: string, body: Record<string, unknown>) { return this.db.insert('portal_requests', token, this.clean({ ...body, requested_by: userId }, ['customer_id','requested_by','origin','destination','material_name','quantity_tonnes','pickup_date','notes','status'], companyId)); }
  updatePortalRequest(companyId: string, token: string, id: string, body: Record<string, unknown>) { return this.db.update('portal_requests', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['origin','destination','material_name','quantity_tonnes','pickup_date','notes','status'])); }
  disputes(companyId: string, token: string) { return this.db.select('customer_disputes', token, { select: '*,customers(name),trips(trip_number),invoices(invoice_number)', company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: 1000 }); }
  createDispute(companyId: string, token: string, userId: string, body: Record<string, unknown>) { return this.db.insert('customer_disputes', token, this.clean({ ...body, raised_by: userId }, ['customer_id','trip_id','invoice_id','raised_by','subject','description','status','resolution'], companyId)); }
  updateDispute(companyId: string, token: string, id: string, body: Record<string, unknown>) { return this.db.update('customer_disputes', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['subject','description','status','resolution'])); }

  reportSchedules(companyId: string, token: string) { return this.db.select('report_schedules', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', order: 'created_at.desc', limit: 500 }); }
  createReportSchedule(companyId: string, token: string, body: Record<string, unknown>) { return this.db.insert('report_schedules', token, this.clean(body, ['name','report_type','format','frequency','recipients','next_run_at','status'], companyId)); }
  auditEvents(companyId: string, token: string, limit = 250) { return this.db.select('audit_events', token, { company_id: `eq.${companyId}`, order: 'created_at.desc', limit: Math.min(limit, 1000) }); }

  recycleBin(companyId: string, token: string) {
    return Promise.all(['vehicles','drivers','customers','trips','fuel_entries','operational_expenses','maintenance_records','inventory_parts','tyre_assets','portal_requests','customer_disputes'].map(async table => ({ table, records: await this.db.select(table, token, { company_id: `eq.${companyId}`, deleted_at: 'not.is.null', order: 'deleted_at.desc', limit: 100 }) })));
  }
  restore(companyId: string, token: string, table: string, id: string) {
    const allowed = new Set(['vehicles','drivers','customers','trips','fuel_entries','operational_expenses','maintenance_records','inventory_parts','tyre_assets','portal_requests','customer_disputes','module_records']);
    if (!allowed.has(table)) throw new Error('Unsupported recycle-bin entity');
    return this.db.update(table, token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, { deleted_at: null, deleted_by: null });
  }

  deleteOperational(table: string, companyId: string, token: string, id: string, actorId?: string) {
    return this.softDelete(table, companyId, token, id, actorId);
  }

  private softDelete(table: string, companyId: string, token: string, id: string, actorId?: string) {
    return this.db.update(table, token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, { deleted_at: new Date().toISOString(), deleted_by: actorId ?? null });
  }

  private clean(body: Record<string, unknown>, allowed: string[], companyId?: string) {
    const value = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    return companyId ? { ...value, company_id: companyId } : value;
  }

  async dashboard(companyId: string, token: string) {
    const [vehicles, trips, customers, invoices] = await Promise.all([
      this.db.select<Record<string, unknown>>('vehicles', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null' }),
      this.db.select<{ status: string }>('trips', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', status: 'eq.in_transit' }),
      this.db.select<Record<string, unknown>>('customers', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null' }),
      this.db.select<{ amount: number; status: string }>('invoices', token, { company_id: `eq.${companyId}`, deleted_at: 'is.null', status: 'in.(sent,partial,overdue)' }),
    ]);
    return {
      vehicles: vehicles.length,
      runningTrips: trips.length,
      customers: customers.length,
      receivable: invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
    };
  }
}
