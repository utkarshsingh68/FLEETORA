import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerPortalGuard, FleetoraPrincipal, Roles, RolesGuard } from '../auth/rbac';
import {
  CreatePortalDisputeDto,
  CreatePortalDocumentDto,
  CreatePortalRequestDto,
  InvitePortalCustomerDto,
  PortalDocumentQueryDto,
  PortalInvoiceQueryDto,
} from './portal.dto';
import { PortalService } from './portal.service';

type PortalRequest = { user: FleetoraPrincipal };

@ApiTags('Customer portal')
@ApiBearerAuth()
@UseGuards(CustomerPortalGuard, RolesGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('context')
  context(@Req() req: PortalRequest) {
    return this.portal.context(req.user.companyId, req.user.token, req.user.customerId, req.user.role);
  }

  @Post('invitations')
  @Roles('owner', 'admin')
  inviteCustomer(@Req() req: PortalRequest, @Body() body: InvitePortalCustomerDto) {
    return this.portal.inviteCustomer(req.user.companyId, req.user.token, req.user.id, body);
  }

  @Get('requests')
  requests(@Req() req: PortalRequest) {
    return this.portal.listRequests(req.user.companyId, req.user.token, req.user.customerId);
  }

  @Post('requests')
  @Roles('customer', 'owner', 'admin', 'dispatcher', 'accountant')
  createRequest(@Req() req: PortalRequest, @Body() body: CreatePortalRequestDto) {
    return this.portal.createRequest(req.user.companyId, req.user.token, req.user.id, req.user.customerId, body);
  }

  @Get('disputes')
  disputes(@Req() req: PortalRequest) {
    return this.portal.listDisputes(req.user.companyId, req.user.token, req.user.customerId);
  }

  @Post('disputes')
  @Roles('customer', 'owner', 'admin', 'dispatcher', 'accountant')
  createDispute(@Req() req: PortalRequest, @Body() body: CreatePortalDisputeDto) {
    return this.portal.createDispute(req.user.companyId, req.user.token, req.user.id, req.user.customerId, body);
  }

  @Get('documents')
  documents(@Req() req: PortalRequest, @Query() query: PortalDocumentQueryDto) {
    return this.portal.listDocuments(req.user.companyId, req.user.token, req.user.customerId, query);
  }

  @Post('documents')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  createDocument(@Req() req: PortalRequest, @Body() body: CreatePortalDocumentDto) {
    return this.portal.createDocument(req.user.companyId, req.user.token, req.user.id, body);
  }

  @Get('documents/:id/download')
  downloadDocument(@Req() req: PortalRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.downloadDocument(req.user.companyId, req.user.token, req.user.customerId, id);
  }

  @Delete('documents/:id')
  @Roles('owner', 'admin', 'dispatcher', 'accountant')
  deleteDocument(@Req() req: PortalRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.deleteDocument(req.user.companyId, req.user.token, req.user.id, id);
  }

  @Get('invoices')
  invoices(@Req() req: PortalRequest, @Query() query: PortalInvoiceQueryDto) {
    return this.portal.listInvoices(req.user.companyId, req.user.token, req.user.customerId, query);
  }
}
