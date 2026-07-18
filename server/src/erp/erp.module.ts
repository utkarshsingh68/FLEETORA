import { Module } from '@nestjs/common';
import { ErpController } from './erp.controller';
import { ErpService } from './erp.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { IntelligenceController } from '../intelligence/intelligence.controller';
import { IntelligenceService } from '../intelligence/intelligence.service';

@Module({
  controllers: [ErpController, PortalController, PaymentsController, IntelligenceController],
  providers: [ErpService, PortalService, PaymentsService, IntelligenceService],
})
export class ErpModule {}
