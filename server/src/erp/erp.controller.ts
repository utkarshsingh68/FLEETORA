import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
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

  @Get('trips')
  trips(@Req() req: FleetoraRequest, @Query('limit') limit = '25', @Query('status') status?: string) { return this.erp.trips(req.user.companyId, req.user.token, Number(limit), status); }

  @Post('trips')
  @Roles('owner', 'admin', 'dispatcher')
  createTrip(@Req() req: FleetoraRequest, @Body() body: Record<string, unknown>) { return this.erp.createTrip(req.user.companyId, req.user.token, body); }

  @Get('customers')
  customers(@Req() req: FleetoraRequest, @Query('limit') limit = '25') { return this.erp.customers(req.user.companyId, req.user.token, Number(limit)); }
}
