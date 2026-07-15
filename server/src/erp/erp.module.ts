import { Module } from '@nestjs/common';
import { ErpController } from './erp.controller';
import { ErpService } from './erp.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  controllers: [ErpController, PortalController, PaymentsController],
  providers: [ErpService, PortalService, PaymentsService],
})
export class ErpModule {}
