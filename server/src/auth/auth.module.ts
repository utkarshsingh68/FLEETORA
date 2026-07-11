import { Module } from '@nestjs/common';
import { SupabaseAuthGuard, RolesGuard } from './rbac';
import { AuthController } from './auth.controller';

@Module({ controllers: [AuthController], providers: [SupabaseAuthGuard, RolesGuard], exports: [SupabaseAuthGuard, RolesGuard] })
export class AuthModule {}
