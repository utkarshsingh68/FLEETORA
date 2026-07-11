import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string; email?: string; companyId: string; role: string; token: string };
    }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const token = header.slice(7);
    const user = await this.supabase.user(token);
    const memberships = await this.supabase.select<{ company_id: string; role: string }>(
      'company_members', token, { user_id: `eq.${user.id}`, limit: 1 },
    );
    const membership = memberships[0];
    if (!membership) throw new ForbiddenException('No Fleetora company membership found');
    request.user = { id: user.id, email: user.email, companyId: membership.company_id, role: membership.role, token };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: { role?: string } }>().user;
    if (!user?.role || !roles.includes(user.role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
