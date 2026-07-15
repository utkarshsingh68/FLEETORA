import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

class DtoBase { [key: string]: unknown; }

export class VehicleDto extends DtoBase {
  @IsOptional() @IsString() @MaxLength(32) registration_number?: string;
  @IsOptional() @IsString() @MaxLength(120) make_model?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) capacity_tonnes?: number;
  @IsOptional() @IsIn(['available', 'on_trip', 'maintenance', 'inactive']) status?: string;
  @IsOptional() @IsString() @MaxLength(200) current_location?: string;
  @IsOptional() @IsUUID() assigned_driver_id?: string;
}

export class DriverDto extends DtoBase {
  @IsOptional() @IsString() @MaxLength(120) full_name?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) license_number?: string;
  @IsOptional() @IsDateString() license_expiry?: string;
  @IsOptional() @IsString() @MaxLength(80) emergency_contact?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salary?: number;
  @IsOptional() @IsIn(['available', 'on_trip', 'on_leave', 'off_duty']) status?: string;
}

export class CustomerDto extends DtoBase {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(120) contact_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) credit_limit?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) payment_terms_days?: number;
  @IsOptional() @IsIn(['active', 'review', 'on_hold']) status?: string;
}

export class TripDto extends DtoBase {
  @IsOptional() @IsString() @MaxLength(64) trip_number?: string;
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() vehicle_id?: string;
  @IsOptional() @IsUUID() driver_id?: string;
  @IsOptional() @IsString() @MaxLength(200) origin?: string;
  @IsOptional() @IsString() @MaxLength(200) destination?: string;
  @IsOptional() @IsString() @MaxLength(160) material_name?: string;
  @IsOptional() @IsDateString() scheduled_start_at?: string;
  @IsOptional() @IsDateString() scheduled_end_at?: string;
  @IsOptional() @IsDateString() actual_start_at?: string;
  @IsOptional() @IsDateString() actual_end_at?: string;
  @IsOptional() @IsIn(['scheduled', 'loading', 'in_transit', 'delivered', 'delayed', 'cancelled']) status?: string;
  @IsOptional() @IsIn(['fixed', 'per_ton', 'per_km']) rate_type?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) rate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity_tonnes?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) distance_km?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) empty_distance_km?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CostDto extends DtoBase {
  @IsOptional() @IsUUID() vehicle_id?: string;
  @IsOptional() @IsUUID() trip_id?: string;
  @IsOptional() @IsDateString() filled_at?: string;
  @IsOptional() @IsDateString() expense_date?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) litres?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) odometer_km?: number;
  @IsOptional() @IsString() @MaxLength(120) station_name?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsIn(['cash', 'bank']) payment_mode?: string;
  @IsOptional() @IsString() @MaxLength(500) receipt_path?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class PaymentDto extends DtoBase {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsDateString() entry_date?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsIn(['cash', 'bank']) payment_mode?: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class MaintenanceDto extends DtoBase {
  @IsOptional() @IsUUID() vehicle_id?: string;
  @IsOptional() @IsUUID() mechanic_id?: string;
  @IsOptional() @IsString() @MaxLength(64) job_number?: string;
  @IsOptional() @IsIn(['service', 'repair', 'tyres', 'battery', 'oil_change', 'inspection']) maintenance_type?: string;
  @IsOptional() @IsIn(['scheduled', 'in_progress', 'completed', 'overdue']) status?: string;
  @IsOptional() @IsIn(['low', 'normal', 'high', 'critical']) priority?: string;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected']) approval_status?: string;
  @IsOptional() @IsDateString() due_on?: string;
  @IsOptional() @IsDateString() completed_on?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) odometer_km?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) due_odometer_km?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) labor_cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) parts_cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(160) vendor_name?: string;
  @IsOptional() @IsBoolean() breakdown?: boolean;
  @IsOptional() @IsDateString() downtime_started_at?: string;
  @IsOptional() @IsDateString() downtime_ended_at?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class PartDto extends DtoBase {
  @IsOptional() @IsString() @MaxLength(64) sku?: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(30) unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) reorder_level?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unit_cost?: number;
  @IsOptional() @IsString() @MaxLength(160) vendor_name?: string;
}

export class TyreDto extends DtoBase {
  @IsOptional() @IsUUID() vehicle_id?: string;
  @IsOptional() @IsString() @MaxLength(80) serial_number?: string;
  @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @IsOptional() @IsString() @MaxLength(40) position?: string;
  @IsOptional() @IsDateString() purchase_date?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) purchase_cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) installed_odometer_km?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) removed_odometer_km?: number;
  @IsOptional() @IsIn(['in_stock', 'installed', 'repair', 'retreaded', 'scrapped']) status?: string;
}

export class PortalRequestDto extends DtoBase {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsString() @MaxLength(200) origin?: string;
  @IsOptional() @IsString() @MaxLength(200) destination?: string;
  @IsOptional() @IsString() @MaxLength(160) material_name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity_tonnes?: number;
  @IsOptional() @IsDateString() pickup_date?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsIn(['requested', 'quoted', 'approved', 'scheduled', 'rejected', 'completed']) status?: string;
}

export class DisputeDto extends DtoBase {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() trip_id?: string;
  @IsOptional() @IsUUID() invoice_id?: string;
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsIn(['open', 'investigating', 'resolved', 'rejected']) status?: string;
  @IsOptional() @IsString() @MaxLength(4000) resolution?: string;
}

export class ReportScheduleDto extends DtoBase {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(['profitability', 'trip_pnl', 'ageing', 'utilization', 'maintenance']) report_type?: string;
  @IsOptional() @IsIn(['xlsx', 'pdf']) format?: string;
  @IsOptional() @IsIn(['daily', 'weekly', 'monthly']) frequency?: string;
  @IsOptional() @IsArray() @IsEmail({}, { each: true }) recipients?: string[];
  @IsOptional() @IsDateString() next_run_at?: string;
  @IsOptional() @IsIn(['active', 'paused']) status?: string;
}
