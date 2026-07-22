import { EXPERT_MAX_CAPACITY } from '@campaigncell/shared-types';

export interface ExpertCandidate {
  userId: string;
  specialties: string[];
  activeCaseCount: number;
  performanceScore: number;
}

/**
 * Case doc section 5.3 formula:
 *   skor = (uzmanlik_eslesme × 0.5) + (bosluk_orani × 0.3) + (performans × 0.2)
 * Kept as a pure function so the weighting can be unit tested without
 * standing up the whole module.
 */
export function computeAssignmentScore(expert: ExpertCandidate, segment: string): number {
  const uzmanlikEslesme = expert.specialties.includes(segment) ? 1 : 0;
  const bosluk_orani = Math.max(0, Math.min(1, 1 - expert.activeCaseCount / EXPERT_MAX_CAPACITY));
  const performans = expert.performanceScore;
  return Math.round((uzmanlikEslesme * 0.5 + bosluk_orani * 0.3 + performans * 0.2) * 1000) / 1000;
}

export function hasCapacity(expert: Pick<ExpertCandidate, 'activeCaseCount'>): boolean {
  return expert.activeCaseCount < EXPERT_MAX_CAPACITY;
}
