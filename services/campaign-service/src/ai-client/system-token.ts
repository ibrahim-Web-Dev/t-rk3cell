import * as jwt from 'jsonwebtoken';
import { Role } from '@campaigncell/shared-types';

/**
 * AiClientService normally forwards the ORIGINAL caller's bearer token to AI
 * Service (defense-in-depth: AI Service re-validates it independently). Event
 * handlers (e.g. reacting to `subscriber.registered`) have no HTTP request
 * and therefore no caller token to forward - this mints a short-lived,
 * internal-only token signed with the same shared JWT_SECRET so the call
 * still passes AI Service's JwtAuthGuard. `/ai/recommend` has no `@Roles()`
 * restriction, so the specific role only needs to be a valid enum value.
 */
export function mintSystemBearerToken(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET tanımlı değil');
  }
  const token = jwt.sign({ sub: 'system', role: Role.ADMIN, specialties: [], regions: [] }, secret, {
    expiresIn: '60s',
  });
  return `Bearer ${token}`;
}
