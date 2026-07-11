import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/rbac';
import { ErpService } from './erp.service';
@ApiTags('ERP') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Controller()
export class ErpController {
  constructor(private erp: ErpService) {}
  @Get('dashboard/kpis') dashboard(@Req() req: { user: { companyId: string } }) { return this.erp.dashboard(req.user.companyId); }
  @Get('vehicles') @Roles('SUPER_ADMIN','COMPANY_ADMIN','DISPATCHER','FLEET_MANAGER','BRANCH_MANAGER') vehicles(@Req() req: { user: { companyId: string } }, @Query('page') page = '1', @Query('limit') limit = '25', @Query('search') search = '') { return this.erp.vehicles(req.user.companyId, Number(page), Number(limit), search); }
  @Get('trips') trips(@Req() req: { user: { companyId: string } }, @Query('page') page = '1', @Query('limit') limit = '25', @Query('status') status?: string) { return this.erp.trips(req.user.companyId, Number(page), Number(limit), status); }
}
