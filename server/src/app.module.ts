import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ErpModule } from './erp/erp.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    AuthModule,
    ErpModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [HealthController],
})
export class AppModule {}
