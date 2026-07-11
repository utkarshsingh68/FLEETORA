import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ErpModule } from './erp/erp.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRootAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ connection: { host: c.get('REDIS_HOST', 'localhost'), port: c.get('REDIS_PORT', 6379) } }) }),
    PrismaModule,
    AuthModule,
    ErpModule,
  ],
  providers: [EventsGateway, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
