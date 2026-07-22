import { SetMetadata } from '@nestjs/common';
import { Role } from '@campaigncell/shared-types';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Enforced by RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
