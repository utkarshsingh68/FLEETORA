import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ErpController } from './erp.controller';
import { ErpService } from './erp.service';
@Module({ imports: [BullModule.registerQueue({ name: 'notifications' }, { name: 'exports' })], controllers: [ErpController], providers: [ErpService] })
export class ErpModule {}
