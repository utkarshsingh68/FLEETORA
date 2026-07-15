import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard, SupabaseAuthGuard } from '../auth/rbac';
import { ErpService } from './erp.service';
import { CostDto, CustomerDto, DisputeDto, DriverDto, MaintenanceDto, PaginatedTripsQueryDto, PartDto, PaymentDto, PortalRequestDto, ReportScheduleDto, TripDto, TyreDto, VehicleDto } from './erp.dto';

type FleetoraRequest = { user: { id: string; companyId: string; branchId?: string; role: string; token: string } };

@ApiTags('ERP')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class ErpController {
  constructor(private readonly erp: ErpService) {}

  @Get('dashboard/kpis')
  dashboard(@Req() req: FleetoraRequest) { return this.erp.dashboard(req.user.companyId, req.user.token); }

  @Get('vehicles')
  vehicles(@Req() req: FleetoraRequest, @Query('limit') limit = '25') { return this.erp.vehicles(req.user.companyId, req.user.token, Number(limit)); }

  @Post('vehicles')
  @Roles('owner', 'admin', 'dispatcher')
  createVehicle(@Req() req: FleetoraRequest, @Body() body: VehicleDto) { return this.erp.createVehicle(req.user.companyId, req.user.token, body); }

  @Patch('vehicles/:id')
  @Roles('owner', 'admin', 'dispatcher')
  updateVehicle(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: VehicleDto) {
    return this.erp.updateVehicle(req.user.companyId, req.user.token, id, body);
  }

  @Delete('vehicles/:id')
  @Roles('owner', 'admin')
  deleteVehicle(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteVehicle(req.user.companyId, req.user.token, id, req.user.id); }

  @Get('trips')
  trips(@Req() req: FleetoraRequest, @Query('limit') limit = '25', @Query('status') status?: string) { return this.erp.trips(req.user.companyId, req.user.token, Number(limit), status); }

  /**
   * Enterprise trip register. Kept separate from GET /trips so the historic
   * array API stays backwards compatible for existing clients.
   */
  @Get('trips/paginated')
  paginatedTrips(@Req() req: FleetoraRequest, @Query() query: PaginatedTripsQueryDto) {
    return this.erp.paginatedTrips(req.user.companyId, req.user.token, query);
  }

  @Post('trips')
  @Roles('owner', 'admin', 'dispatcher')
  createTrip(@Req() req: FleetoraRequest, @Body() body: TripDto) { return this.erp.createTrip(req.user.companyId, req.user.token, body); }

  @Get('customers')
  customers(@Req() req: FleetoraRequest, @Query('limit') limit = '25') { return this.erp.customers(req.user.companyId, req.user.token, Number(limit)); }

  @Post('customers')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createCustomer(@Req() req: FleetoraRequest, @Body() body: CustomerDto) { return this.erp.createCustomer(req.user.companyId, req.user.token, body); }

  @Patch('customers/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateCustomer(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: CustomerDto) { return this.erp.updateCustomer(req.user.companyId, req.user.token, id, body); }

  @Delete('customers/:id')
  @Roles('owner', 'admin')
  deleteCustomer(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteCustomer(req.user.companyId, req.user.token, id, req.user.id); }

  @Get('drivers')
  drivers(@Req() req: FleetoraRequest, @Query('limit') limit = '100') { return this.erp.drivers(req.user.companyId, req.user.token, Number(limit)); }

  @Post('drivers')
  @Roles('owner', 'admin', 'dispatcher')
  createDriver(@Req() req: FleetoraRequest, @Body() body: DriverDto) { return this.erp.createDriver(req.user.companyId, req.user.token, body); }

  @Patch('drivers/:id')
  @Roles('owner', 'admin', 'dispatcher')
  updateDriver(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: DriverDto) { return this.erp.updateDriver(req.user.companyId, req.user.token, id, body); }

  @Delete('drivers/:id')
  @Roles('owner', 'admin')
  deleteDriver(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteDriver(req.user.companyId, req.user.token, id, req.user.id); }

  @Get('resources')
  resources(@Req() req: FleetoraRequest) { return this.erp.resources(req.user.companyId, req.user.token); }

  @Patch('trips/:id')
  @Roles('owner', 'admin', 'dispatcher')
  updateTrip(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: TripDto) { return this.erp.updateTrip(req.user.companyId, req.user.token, id, body); }

  @Delete('trips/:id')
  @Roles('owner', 'admin')
  deleteTrip(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteTrip(req.user.companyId, req.user.token, id, req.user.id); }

  @Get('fuel')
  fuel(@Req() req: FleetoraRequest) { return this.erp.fuelEntries(req.user.companyId, req.user.token); }

  @Post('fuel')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createFuel(@Req() req: FleetoraRequest, @Body() body: CostDto) { return this.erp.createFuel(req.user.companyId, req.user.token, body); }

  @Patch('fuel/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateFuel(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: CostDto) { return this.erp.updateFuel(req.user.companyId, req.user.token, id, body); }

  @Delete('fuel/:id')
  @Roles('owner', 'admin')
  deleteFuel(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('fuel_entries', req.user.companyId, req.user.token, id, req.user.id); }

  @Get('expenses')
  expenses(@Req() req: FleetoraRequest) { return this.erp.expenses(req.user.companyId, req.user.token); }

  @Post('expenses')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createExpense(@Req() req: FleetoraRequest, @Body() body: CostDto) { return this.erp.createExpense(req.user.companyId, req.user.token, body); }

  @Patch('expenses/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateExpense(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: CostDto) { return this.erp.updateExpense(req.user.companyId, req.user.token, id, body); }

  @Delete('expenses/:id')
  @Roles('owner', 'admin')
  deleteExpense(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('operational_expenses', req.user.companyId, req.user.token, id, req.user.id); }

  @Get('ledger')
  ledger(@Req() req: FleetoraRequest) { return this.erp.ledger(req.user.companyId, req.user.token); }

  @Post('ledger/payments')
  @Roles('owner', 'admin', 'accountant')
  payment(@Req() req: FleetoraRequest, @Body() body: PaymentDto) { return this.erp.recordPayment(req.user.companyId, req.user.token, body); }

  @Patch('ledger/payments/:id')
  @Roles('owner', 'admin', 'accountant')
  updatePayment(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: PaymentDto) { return this.erp.updateLedgerEntry(req.user.companyId, req.user.token, id, body); }

  @Delete('ledger/payments/:id')
  @Roles('owner', 'admin')
  deletePayment(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteLedgerEntry(req.user.companyId, req.user.token, id, req.user.id); }

  @Get('reports')
  reports(@Req() req: FleetoraRequest) { return this.erp.reports(req.user.companyId, req.user.token); }

  @Get('reports/profitability')
  profitability(@Req() req: FleetoraRequest, @Query('from') from?: string, @Query('to') to?: string) {
    const [start, end] = this.reportPeriod(from, to);
    return this.erp.reportsSummary(req.user.companyId, req.user.token, start, end);
  }

  // Kept as a dedicated alias for clients that distinguish dashboards from
  // detailed profitability reports. Both routes use the same DB aggregation.
  @Get('reports/summary')
  summary(@Req() req: FleetoraRequest, @Query('from') from?: string, @Query('to') to?: string) {
    const [start, end] = this.reportPeriod(from, to);
    return this.erp.reportsSummary(req.user.companyId, req.user.token, start, end);
  }

  @Get('reports/fuel-efficiency')
  fuelEfficiency(@Req() req: FleetoraRequest, @Query('from') from?: string, @Query('to') to?: string) {
    // Fuel analytics default to complete history. The editable /fuel register
    // remains bounded, while this RPC aggregates every matching database row.
    const [start, end] = this.reportPeriod(from ?? '1970-01-01', to);
    return this.erp.fuelEfficiency(req.user.companyId, req.user.token, start, end);
  }

  private reportPeriod(from?: string, to?: string): [string, string] {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const start = from ?? monthStart;
    const end = to ?? today;
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(start) || !isoDate.test(end) || start > end) {
      throw new BadRequestException('from and to must be valid ISO dates (YYYY-MM-DD), with from <= to');
    }
    return [start, end];
  }

  @Get('workspace/context')
  context(@Req() req: FleetoraRequest) { return this.erp.workspaceContext(req.user.id, req.user.token, req.user.companyId); }

  @Get('maintenance') maintenance(@Req() req: FleetoraRequest) { return this.erp.maintenance(req.user.companyId, req.user.token); }
  @Post('maintenance') @Roles('owner', 'admin', 'dispatcher') createMaintenance(@Req() req: FleetoraRequest, @Body() body: MaintenanceDto) { return this.erp.createMaintenance(req.user.companyId, req.user.token, body); }
  @Patch('maintenance/:id') @Roles('owner', 'admin', 'dispatcher') updateMaintenance(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: MaintenanceDto) { return this.erp.updateMaintenance(req.user.companyId, req.user.token, id, body); }
  @Post('maintenance/:id/approval') @Roles('owner', 'admin') approveMaintenance(@Req() req: FleetoraRequest, @Param('id') id: string, @Body('approved') approved: boolean) { return this.erp.approveMaintenance(req.user.companyId, req.user.token, id, req.user.id, approved); }
  @Delete('maintenance/:id') @Roles('owner', 'admin') deleteMaintenance(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('maintenance_records', req.user.companyId, req.user.token, id, req.user.id); }

  @Get('mechanics') mechanics(@Req() req: FleetoraRequest) { return this.erp.mechanics(req.user.companyId, req.user.token); }
  @Get('parts') parts(@Req() req: FleetoraRequest) { return this.erp.parts(req.user.companyId, req.user.token); }
  @Post('parts') @Roles('owner', 'admin', 'dispatcher') createPart(@Req() req: FleetoraRequest, @Body() body: PartDto) { return this.erp.createPart(req.user.companyId, req.user.token, body); }
  @Patch('parts/:id') @Roles('owner', 'admin', 'dispatcher') updatePart(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: PartDto) { return this.erp.updatePart(req.user.companyId, req.user.token, id, body); }
  @Delete('parts/:id') @Roles('owner', 'admin') deletePart(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('inventory_parts', req.user.companyId, req.user.token, id, req.user.id); }

  @Get('tyres') tyres(@Req() req: FleetoraRequest) { return this.erp.tyres(req.user.companyId, req.user.token); }
  @Post('tyres') @Roles('owner', 'admin', 'dispatcher') createTyre(@Req() req: FleetoraRequest, @Body() body: TyreDto) { return this.erp.createTyre(req.user.companyId, req.user.token, body); }
  @Patch('tyres/:id') @Roles('owner', 'admin', 'dispatcher') updateTyre(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: TyreDto) { return this.erp.updateTyre(req.user.companyId, req.user.token, id, body); }
  @Delete('tyres/:id') @Roles('owner', 'admin') deleteTyre(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('tyre_assets', req.user.companyId, req.user.token, id, req.user.id); }

  @Patch('portal/requests/:id') updatePortalRequest(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: PortalRequestDto) { return this.erp.updatePortalRequest(req.user.companyId, req.user.token, id, body); }
  @Patch('portal/disputes/:id') updateDispute(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: DisputeDto) { return this.erp.updateDispute(req.user.companyId, req.user.token, id, body); }

  @Get('report-schedules') schedules(@Req() req: FleetoraRequest) { return this.erp.reportSchedules(req.user.companyId, req.user.token); }
  @Post('report-schedules') @Roles('owner', 'admin', 'accountant') createSchedule(@Req() req: FleetoraRequest, @Body() body: ReportScheduleDto) { return this.erp.createReportSchedule(req.user.companyId, req.user.token, body); }
  @Get('audit-events') @Roles('owner', 'admin') auditEvents(@Req() req: FleetoraRequest, @Query('limit') limit = '250') { return this.erp.auditEvents(req.user.companyId, req.user.token, Number(limit)); }
  @Get('recycle-bin') @Roles('owner', 'admin') recycleBin(@Req() req: FleetoraRequest) { return this.erp.recycleBin(req.user.companyId, req.user.token); }
  @Post('recycle-bin/:table/:id/restore') @Roles('owner', 'admin') restore(@Req() req: FleetoraRequest, @Param('table') table: string, @Param('id') id: string) { return this.erp.restore(req.user.companyId, req.user.token, table, id); }

  @Get('records/:module')
  records(@Req() req: FleetoraRequest, @Param('module') module: string, @Query('limit') limit = '100') {
    return this.erp.moduleRecords(req.user.companyId, req.user.token, module, Number(limit));
  }

  @Post('records/:module')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createRecord(@Req() req: FleetoraRequest, @Param('module') module: string, @Body() body: Record<string, unknown>) {
    return this.erp.createModuleRecord(req.user.companyId, req.user.token, module, body);
  }

  @Patch('records/:module/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateRecord(@Req() req: FleetoraRequest, @Param('module') module: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.erp.updateModuleRecord(req.user.companyId, req.user.token, module, id, body);
  }

  @Delete('records/:module/:id')
  @Roles('owner', 'admin')
  deleteRecord(@Req() req: FleetoraRequest, @Param('module') module: string, @Param('id') id: string) {
    return this.erp.deleteModuleRecord(req.user.companyId, req.user.token, module, id, req.user.id);
  }
}
