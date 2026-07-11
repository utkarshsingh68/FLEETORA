import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) { const roles = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]); if (!roles?.length) return true; const user = context.switchToHttp().getRequest().user as { role?: string }; return Boolean(user?.role && roles.includes(user.role)); }
}
