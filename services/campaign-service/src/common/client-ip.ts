import type { Request } from 'express';

/** Extracts the caller IP for audit logging (X-Forwarded-For set by the gateway proxy, else the socket IP). */
export function clientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string) ?? req.ip ?? null;
}
