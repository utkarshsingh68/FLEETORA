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

  @Get('trips')
  trips(@Req() req: FleetoraRequest, @Query('limit') limit = '25', @Query('status') status?: string) { return this.erp.trips(req.user.companyId, req.user.token, Number(limit), status); }

  @Post('trips')
  @Roles('owner', 'admin', 'dispatcher')
  createTrip(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createTrip(req.user.companyId, req.user.token, body); }

  @Get('customers')
  customers(@Req() req: FleetoraRequest, @Query('limit') limit = '25') { return this.erp.customers(req.user.companyId, req.user.token, Number(limit)); }

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
