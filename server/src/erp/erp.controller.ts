import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard, SupabaseAuthGuard } from '../auth/rbac';
import { ErpService } from './erp.service';

type FleetoraRequest = { user: { companyId: string; token: string } };

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
  createVehicle(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createVehicle(req.user.companyId, req.user.token, body); }

  @Patch('vehicles/:id')
  @Roles('owner', 'admin', 'dispatcher')
  updateVehicle(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.erp.updateVehicle(req.user.companyId, req.user.token, id, body);
  }

  @Delete('vehicles/:id')
  @Roles('owner', 'admin')
  deleteVehicle(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteVehicle(req.user.companyId, req.user.token, id); }

  @Get('trips')
  trips(@Req() req: FleetoraRequest, @Query('limit') limit = '25', @Query('status') status?: string) { return this.erp.trips(req.user.companyId, req.user.token, Number(limit), status); }

  @Post('trips')
  @Roles('owner', 'admin', 'dispatcher')
  createTrip(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createTrip(req.user.companyId, req.user.token, body); }

  @Get('customers')
  customers(@Req() req: FleetoraRequest, @Query('limit') limit = '25') { return this.erp.customers(req.user.companyId, req.user.token, Number(limit)); }

  @Post('customers')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createCustomer(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createCustomer(req.user.companyId, req.user.token, body); }

  @Patch('customers/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateCustomer(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.erp.updateCustomer(req.user.companyId, req.user.token, id, body); }

  @Delete('customers/:id')
  @Roles('owner', 'admin')
  deleteCustomer(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteCustomer(req.user.companyId, req.user.token, id); }

  @Get('drivers')
  drivers(@Req() req: FleetoraRequest, @Query('limit') limit = '100') { return this.erp.drivers(req.user.companyId, req.user.token, Number(limit)); }

  @Post('drivers')
  @Roles('owner', 'admin', 'dispatcher')
  createDriver(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createDriver(req.user.companyId, req.user.token, body); }

  @Patch('drivers/:id')
  @Roles('owner', 'admin', 'dispatcher')
  updateDriver(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.erp.updateDriver(req.user.companyId, req.user.token, id, body); }

  @Delete('drivers/:id')
  @Roles('owner', 'admin')
  deleteDriver(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteDriver(req.user.companyId, req.user.token, id); }

  @Get('resources')
  resources(@Req() req: FleetoraRequest) { return this.erp.resources(req.user.companyId, req.user.token); }

  @Patch('trips/:id')
  @Roles('owner', 'admin', 'dispatcher')
  updateTrip(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.erp.updateTrip(req.user.companyId, req.user.token, id, body); }

  @Delete('trips/:id')
  @Roles('owner', 'admin')
  deleteTrip(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteTrip(req.user.companyId, req.user.token, id); }

  @Get('fuel')
  fuel(@Req() req: FleetoraRequest) { return this.erp.fuelEntries(req.user.companyId, req.user.token); }

  @Post('fuel')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createFuel(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createFuel(req.user.companyId, req.user.token, body); }

  @Patch('fuel/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateFuel(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.erp.updateFuel(req.user.companyId, req.user.token, id, body); }

  @Delete('fuel/:id')
  @Roles('owner', 'admin')
  deleteFuel(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('fuel_entries', req.user.companyId, req.user.token, id); }

  @Get('expenses')
  expenses(@Req() req: FleetoraRequest) { return this.erp.expenses(req.user.companyId, req.user.token); }

  @Post('expenses')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createExpense(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createExpense(req.user.companyId, req.user.token, body); }

  @Patch('expenses/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  updateExpense(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.erp.updateExpense(req.user.companyId, req.user.token, id, body); }

  @Delete('expenses/:id')
  @Roles('owner', 'admin')
  deleteExpense(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteOperational('operational_expenses', req.user.companyId, req.user.token, id); }

  @Get('ledger')
  ledger(@Req() req: FleetoraRequest) { return this.erp.ledger(req.user.companyId, req.user.token); }

  @Post('ledger/payments')
  @Roles('owner', 'admin', 'accountant')
  payment(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.recordPayment(req.user.companyId, req.user.token, body); }

  @Patch('ledger/payments/:id')
  @Roles('owner', 'admin', 'accountant')
  updatePayment(@Req() req: FleetoraRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.erp.updateLedgerEntry(req.user.companyId, req.user.token, id, body); }

  @Delete('ledger/payments/:id')
  @Roles('owner', 'admin')
  deletePayment(@Req() req: FleetoraRequest, @Param('id') id: string) { return this.erp.deleteLedgerEntry(req.user.companyId, req.user.token, id); }

  @Get('reports')
  reports(@Req() req: FleetoraRequest) { return this.erp.reports(req.user.companyId, req.user.token); }

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
    return this.erp.deleteModuleRecord(req.user.companyId, req.user.token, module, id);
  }
}
