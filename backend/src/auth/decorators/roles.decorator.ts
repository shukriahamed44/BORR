/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Custom Metadata Decorator `@Roles(...roles: Role[])` for NestJS Role-Based Access Control (RBAC).
 * Attaches metadata specifying authorized user roles to route handlers or controllers.
 * Read at runtime by `RolesGuard` via NestJS Reflector API to grant or deny access.
 *
 * IN SIMPLE WORDS:
 * A tag you put on API endpoints (like `@Roles(Role.ADMIN)`) to specify who is allowed to use them.
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
