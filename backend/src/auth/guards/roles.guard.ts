/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Authorization Guard implementing `CanActivate` interface for Role-Based Access Control (RBAC).
 * Extracts metadata defined by `@Roles()` decorator via NestJS `Reflector` and compares allowed roles
 * against `req.user.role` attached by `JwtAuthGuard`. Throws `ForbiddenException` if role requirements fail.
 *
 * IN SIMPLE WORDS:
 * Checks if the logged-in user's role (Admin, Staff, Customer, Warehouse Operator) matches what the requested API allows.
 * If not matched, it blocks them with an Access Denied (403) error.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified on the handler/class, public/default route access is granted.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: User role not authenticated.');
    }

    const hasRole = requiredRoles.includes(user.role as Role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required role(s) [${requiredRoles.join(', ')}], but your role is ${user.role}.`,
      );
    }

    return true;
  }
}
