import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerPortalGuard, FleetoraPrincipal, Roles, RolesGuard } from '../auth/rbac';
import { CreateOnlinePaymentDto } from './portal.dto';
import { PaymentsService } from './payments.service';

type PortalRequest = { user: FleetoraPrincipal };
type RawWebhookRequest = { rawBody?: Buffer };

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(CustomerPortalGuard, RolesGuard)
  @Roles('customer', 'owner', 'admin', 'accountant')
  create(@Req() req: PortalRequest, @Body() body: CreateOnlinePaymentDto) {
    return this.payments.createPayment(req.user, body);
  }

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: RawWebhookRequest,
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    return this.payments.processWebhook(req.rawBody, signature, eventId);
  }
}
