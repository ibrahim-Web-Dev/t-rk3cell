import { Role } from '@campaigncell/shared-types';

/** Access token payload contract. Every service verifies this shape independently. */
export interface JwtPayload {
  /** subject = user id */
  sub: string;
  role: Role;
  specialties: string[];
  regions: string[];
  iat?: number;
  exp?: number;
}
