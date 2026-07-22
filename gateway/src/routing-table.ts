/**
 * Prefix -> upstream service base URL. Case doc section 8.1 gateway routing
 * example, extended with the endpoints this system actually exposes.
 */
export function buildRoutingTable(): Record<string, string> {
  const identity = process.env.IDENTITY_SERVICE_URL ?? 'http://identity-service:3001';
  const campaign = process.env.CAMPAIGN_SERVICE_URL ?? 'http://campaign-service:3002';
  const ai = process.env.AI_SERVICE_URL ?? 'http://ai-service:3003';
  const gamification = process.env.GAMIFICATION_SERVICE_URL ?? 'http://gamification-service:3004';

  return {
    '/api/v1/auth': identity,
    '/api/v1/users': identity,
    '/api/v1/audit-logs': identity,
    '/api/v1/campaigns': campaign,
    '/api/v1/cases': campaign,
    '/api/v1/subscribers': campaign,
    '/api/v1/stats': campaign,
    '/api/v1/ai': ai,
    '/api/v1/game': gamification,
  };
}
