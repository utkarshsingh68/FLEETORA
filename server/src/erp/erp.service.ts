import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ErpService {
  constructor(private readonly db: SupabaseService) {}

  vehicles(companyId: string, token: string, limit = 25) {
    return this.db.select('vehicles', token, { company_id: `eq.${companyId}`, order: 'created_at.desc', limit: Math.min(limit, 100) });
  }

  trips(companyId: string, token: string, limit = 25, status?: string) {
    return this.db.select('trips', token, { select: '*,customers(name),vehicles(registration_number),drivers(full_name)', company_id: `eq.${companyId}`, status: status ? `eq.${status}` : undefined, order: 'created_at.desc', limit: Math.min(limit, 100) });
  }

  customers(companyId: string, token: string, limit = 25) {
    return this.db.select('customers', token, { company_id: `eq.${companyId}`, order: 'created_at.desc', limit: Math.min(limit, 100) });
  }

  drivers(companyId: string, token: string, limit = 100) {
    return this.db.select('drivers', token, { company_id: `eq.${companyId}`, order: 'created_at.desc', limit: Math.min(limit, 100) });
  }

  async resources(companyId: string, token: string) {
    const [vehicles, drivers, customers] = await Promise.all([
      this.vehicles(companyId, token, 100), this.drivers(companyId, token, 100), this.customers(companyId, token, 100),
    ]);
    return { vehicles, drivers, customers };
  }

  createVehicle(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('vehicles', token, { ...body, company_id: companyId });
  }

  updateVehicle(companyId: string, token: string, vehicleId: string, body: Record<string, unknown>) {
    const { id: _id, company_id: _companyId, created_at: _createdAt, ...changes } = body;
    return this.db.update('vehicles', token, { id: `eq.${vehicleId}`, company_id: `eq.${companyId}` }, changes);
  }

  createDriver(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('drivers', token, this.clean(body, ['full_name', 'phone', 'license_number', 'license_expiry', 'emergency_contact', 'salary', 'status'], companyId));
  }

  updateDriver(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('drivers', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['full_name', 'phone', 'license_number', 'license_expiry', 'emergency_contact', 'salary', 'status']));
  }

  createCustomer(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('customers', token, this.clean(body, ['name', 'contact_name', 'email', 'phone', 'credit_limit', 'payment_terms_days', 'status'], companyId));
  }

  updateCustomer(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('customers', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['name', 'contact_name', 'email', 'phone', 'credit_limit', 'payment_terms_days', 'status']));
  }

  moduleRecords(companyId: string, token: string, module: string, limit = 100) {
    return this.db.select('module_records', token, { company_id: `eq.${companyId}`, module: `eq.${module}`, order: 'updated_at.desc', limit: Math.min(limit, 100) });
  }

  createModuleRecord(companyId: string, token: string, module: string, body: Record<string, unknown>) {
    return this.db.insert('module_records', token, this.cleanModuleRecord({ ...body, company_id: companyId, module }));
  }

  updateModuleRecord(companyId: string, token: string, module: string, id: string, body: Record<string, unknown>) {
    return this.db.update('module_records', token, { id: `eq.${id}`, company_id: `eq.${companyId}`, module: `eq.${module}` }, this.cleanModuleRecord(body));
  }

  deleteModuleRecord(companyId: string, token: string, module: string, id: string) {
    return this.db.delete('module_records', token, { id: `eq.${id}`, company_id: `eq.${companyId}`, module: `eq.${module}` });
  }

  private cleanModuleRecord(body: Record<string, unknown>) {
    const allowed = ['company_id', 'module', 'name', 'reference', 'status', 'notes', 'amount', 'event_date', 'metadata'];
    return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  }

  createTrip(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('trips', token, this.clean(body, ['trip_number', 'customer_id', 'vehicle_id', 'driver_id', 'origin', 'destination', 'scheduled_start_at', 'scheduled_end_at', 'actual_start_at', 'actual_end_at', 'status', 'rate_type', 'rate', 'quantity_tonnes', 'distance_km', 'notes'], companyId));
  }

  updateTrip(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('trips', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['trip_number', 'customer_id', 'vehicle_id', 'driver_id', 'origin', 'destination', 'scheduled_start_at', 'scheduled_end_at', 'actual_start_at', 'actual_end_at', 'status', 'rate_type', 'rate', 'quantity_tonnes', 'distance_km', 'notes']));
  }

  fuelEntries(companyId: string, token: string) {
    return this.db.select('fuel_entries', token, { select: '*,vehicles(registration_number),trips(trip_number)', company_id: `eq.${companyId}`, order: 'filled_at.desc', limit: 100 });
  }

  createFuel(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('fuel_entries', token, this.clean(body, ['vehicle_id', 'trip_id', 'filled_at', 'litres', 'amount', 'odometer_km', 'station_name', 'payment_mode', 'receipt_path', 'notes'], companyId));
  }

  updateFuel(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('fuel_entries', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['vehicle_id', 'trip_id', 'filled_at', 'litres', 'amount', 'odometer_km', 'station_name', 'payment_mode', 'receipt_path', 'notes']));
  }

  expenses(companyId: string, token: string) {
    return this.db.select('operational_expenses', token, { select: '*,vehicles(registration_number),trips(trip_number)', company_id: `eq.${companyId}`, order: 'expense_date.desc', limit: 100 });
  }

  createExpense(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('operational_expenses', token, this.clean(body, ['vehicle_id', 'trip_id', 'category', 'amount', 'payment_mode', 'expense_date', 'receipt_path', 'notes'], companyId));
  }

  updateExpense(companyId: string, token: string, id: string, body: Record<string, unknown>) {
    return this.db.update('operational_expenses', token, { id: `eq.${id}`, company_id: `eq.${companyId}` }, this.clean(body, ['vehicle_id', 'trip_id', 'category', 'amount', 'payment_mode', 'expense_date', 'receipt_path', 'notes']));
  }

  ledger(companyId: string, token: string) {
    return this.db.select('party_ledger', token, { select: '*,customers(name),trips(trip_number)', company_id: `eq.${companyId}`, order: 'entry_date.desc', limit: 500 });
  }

  recordPayment(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('party_ledger', token, this.clean({ ...body, entry_type: 'credit' }, ['customer_id', 'entry_date', 'entry_type', 'amount', 'payment_mode', 'reference', 'notes'], companyId));
  }

  async reports(companyId: string, token: string) {
    const [trips, fuel, expenses, ledger, vehicles, drivers, customers] = await Promise.all([
      this.trips(companyId, token, 100), this.fuelEntries(companyId, token), this.expenses(companyId, token),
      this.ledger(companyId, token), this.vehicles(companyId, token, 100), this.drivers(companyId, token, 100), this.customers(companyId, token, 100),
    ]);
    return { trips, fuel, expenses, ledger, vehicles, drivers, customers };
  }

  deleteOperational(table: 'fuel_entries' | 'operational_expenses', companyId: string, token: string, id: string) {
    return this.db.delete(table, token, { id: `eq.${id}`, company_id: `eq.${companyId}` });
  }

  private clean(body: Record<string, unknown>, allowed: string[], companyId?: string) {
    const value = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    return companyId ? { ...value, company_id: companyId } : value;
  }

  async dashboard(companyId: string, token: string) {
    const [vehicles, trips, customers, invoices] = await Promise.all([
      this.db.select<Record<string, unknown>>('vehicles', token, { company_id: `eq.${companyId}` }),
      this.db.select<{ status: string }>('trips', token, { company_id: `eq.${companyId}`, status: 'eq.in_transit' }),
      this.db.select<Record<string, unknown>>('customers', token, { company_id: `eq.${companyId}` }),
      this.db.select<{ amount: number; status: string }>('invoices', token, { company_id: `eq.${companyId}`, status: 'in.(sent,partial,overdue)' }),
    ]);
    return {
      vehicles: vehicles.length,
      runningTrips: trips.length,
      customers: customers.length,
      receivable: invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
    };
  }
}
