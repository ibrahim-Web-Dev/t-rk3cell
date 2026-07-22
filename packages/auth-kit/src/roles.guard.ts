import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@campaigncell/shared-types';
import { ROLES_KEY } from './roles.decorator';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Enforces the role/permission matrix (case doc section 3.3) at endpoint
 * level. Must run after JwtAuthGuard so `request.user` is populated. Throws
 * ForbiddenException (403) on mismatch, which UnauthorizedAuditFilter turns
 * into an audit log entry.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor');
    }
    return true;
  }
}
