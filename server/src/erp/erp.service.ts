import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ErpService {
  constructor(private readonly db: SupabaseService) {}

  vehicles(companyId: string, token: string, limit = 25) {
    return this.db.select('vehicles', token, { company_id: `eq.${companyId}`, order: 'created_at.desc', limit: Math.min(limit, 100) });
  }

  trips(companyId: string, token: string, limit = 25, status?: string) {
    return this.db.select('trips', token, { company_id: `eq.${companyId}`, status: status ? `eq.${status}` : undefined, order: 'scheduled_start_at.desc', limit: Math.min(limit, 100) });
  }

  customers(companyId: string, token: string, limit = 25) {
    return this.db.select('customers', token, { company_id: `eq.${companyId}`, order: 'created_at.desc', limit: Math.min(limit, 100) });
  }

  createVehicle(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('vehicles', token, { ...body, company_id: companyId });
  }

  updateVehicle(companyId: string, token: string, vehicleId: string, body: Record<string, unknown>) {
    const { id: _id, company_id: _companyId, created_at: _createdAt, ...changes } = body;
    return this.db.update('vehicles', token, { id: `eq.${vehicleId}`, company_id: `eq.${companyId}` }, changes);
  }

  createTrip(companyId: string, token: string, body: Record<string, unknown>) {
    return this.db.insert('trips', token, { ...body, company_id: companyId });
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
