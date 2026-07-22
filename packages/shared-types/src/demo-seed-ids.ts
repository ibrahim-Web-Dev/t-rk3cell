/**
 * Fixed demo user ids shared by every service's seed script. Since each
 * service owns its own database (database-per-service), there is no
 * foreign-key relationship between them - but demo data still needs to refer
 * to "the same" user across databases (e.g. AI Service's expert read-model
 * cache must use the same id Identity Service assigned to that expert).
 * Using well-known fixed UUIDs for seed data only (never for real users,
 * who always get a random uuid()) is what makes that possible.
 */
export const DEMO_SEED_IDS = {
  ADMIN: '00000000-0000-0000-0000-000000000001',
  SUPERVISOR: '00000000-0000-0000-0000-000000000002',
  EXPERT_1: '00000000-0000-0000-0000-000000000003',
  EXPERT_2: '00000000-0000-0000-0000-000000000004',
  EXPERT_3: '00000000-0000-0000-0000-000000000005',
  SUBSCRIBER_1: '00000000-0000-0000-0000-000000000006',
} as const;
