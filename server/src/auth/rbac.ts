import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export type FleetoraPrincipal = {
  id: string;
  email?: string;
  companyId: string;
  branchId?: string;
  customerId?: string;
  role: string;
  token: string;
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string; 'x-company-id'?: string; 'x-branch-id'?: string };
      user?: { id: string; email?: string; companyId: string; branchId?: string; role: string; token: string };
    }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const token = header.slice(7);
    const user = await this.supabase.user(token);
    const requestedCompany = request.headers['x-company-id'];
    const memberships = await this.supabase.select<{ company_id: string; branch_id?: string; role: string }>(
      'company_members', token, { user_id: `eq.${user.id}`, company_id: requestedCompany ? `eq.${requestedCompany}` : undefined, limit: 1 },
    );
    const membership = memberships[0];
    if (!membership) throw new ForbiddenException('No Fleetora company membership found');
    const requestedBranch = request.headers['x-branch-id'];
    if (requestedBranch && membership.branch_id && requestedBranch !== membership.branch_id && membership.role !== 'owner' && membership.role !== 'admin') {
      throw new ForbiddenException('Branch access denied');
    }
    request.user = { id: user.id, email: user.email, companyId: membership.company_id, branchId: requestedBranch ?? membership.branch_id, role: membership.role, token };
    return true;
  }
}

/**
 * Authenticates either a staff company member or a customer-portal mapping.
 * This guard is intentionally only used by portal/payment controllers so a
 * portal customer can never fall through into the general ERP routes.
 */
@Injectable()
export class CustomerPortalGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string; 'x-company-id'?: string; 'x-branch-id'?: string };
      user?: FleetoraPrincipal;
    }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const token = header.slice(7);
    const user = await this.supabase.user(token);
    const requestedCompany = request.headers['x-company-id'];

    const memberships = await this.supabase.select<{ company_id: string; branch_id?: string; role: string }>(
      'company_members', token, {
        user_id: `eq.${user.id}`,
        company_id: requestedCompany ? `eq.${requestedCompany}` : undefined,
        limit: 1,
      },
    );
    const membership = memberships[0];
    if (membership) {
      const requestedBranch = request.headers['x-branch-id'];
      if (requestedBranch && membership.branch_id && requestedBranch !== membership.branch_id && membership.role !== 'owner' && membership.role !== 'admin') {
        throw new ForbiddenException('Branch access denied');
      }
      request.user = {
        id: user.id,
        email: user.email,
        companyId: membership.company_id,
        branchId: requestedBranch ?? membership.branch_id,
        role: membership.role,
        token,
      };
      return true;
    }

    const portalMappings = await this.supabase.select<{ company_id: string; customer_id: string }>(
      'customer_portal_users', token, {
        user_id: `eq.${user.id}`,
        company_id: requestedCompany ? `eq.${requestedCompany}` : undefined,
        limit: 1,
      },
    );
    const portal = portalMappings[0];
    if (!portal) throw new ForbiddenException('No customer portal access found');
    request.user = {
      id: user.id,
      email: user.email,
      companyId: portal.company_id,
      customerId: portal.customer_id,
      role: 'customer',
      token,
    };
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
