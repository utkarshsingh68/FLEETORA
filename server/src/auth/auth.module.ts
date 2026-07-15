import { Module } from '@nestjs/common';
import { CustomerPortalGuard, SupabaseAuthGuard, RolesGuard } from './rbac';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [SupabaseAuthGuard, CustomerPortalGuard, RolesGuard],
  exports: [SupabaseAuthGuard, CustomerPortalGuard, RolesGuard],
})
export class AuthModule {}
