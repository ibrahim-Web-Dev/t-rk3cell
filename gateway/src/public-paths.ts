/**
 * Routes that don't require a bearer token to pass the gateway's fast-fail
 * check. This is a coarse, prefix-based check only - it is NOT a substitute
 * for the fine-grained RBAC each downstream service enforces on every
 * request independently (defense-in-depth: a request that somehow bypassed
 * the gateway would still be rejected by the service itself).
 */
export const PUBLIC_PATH_PATTERNS: RegExp[] = [
  /^\/health$/,
  /^\/api\/v1\/auth\/subscriber\/otp\/request$/,
  /^\/api\/v1\/auth\/subscriber\/otp\/verify$/,
  /^\/api\/v1\/auth\/staff\/login$/,
  /^\/api\/v1\/auth\/refresh$/,
];

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path));
}
