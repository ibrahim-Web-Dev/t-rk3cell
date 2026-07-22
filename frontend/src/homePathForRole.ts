import { Role } from '@campaigncell/shared-types';

export function homePathForRole(role: Role): string {
  switch (role) {
    case Role.SUBSCRIBER:
      return '/subscriber/offers';
    case Role.PERSONEL:
      return '/expert/cases';
    case Role.SUPERVISOR:
      return '/supervisor/dashboard';
    case Role.ADMIN:
      return '/admin/staff';
    default:
      return '/login';
  }
}
