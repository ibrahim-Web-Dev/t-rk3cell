import { CaseStatus } from '../generated/prisma-client';

/**
 * Optimization case state machine (case doc section 4.2). Kept as a pure,
 * dependency-free function so it can be unit tested in isolation and so the
 * allowed-transition table lives in exactly one place.
 */
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  YENI: ['ATANDI'],
  ATANDI: ['OPTIMIZE_EDILIYOR'],
  OPTIMIZE_EDILIYOR: ['TEST_EDILIYOR', 'TAMAMLANDI'],
  TEST_EDILIYOR: ['OPTIMIZE_EDILIYOR'],
  TAMAMLANDI: ['YAYINDA'],
  YAYINDA: ['ARSIVLENDI'],
  ARSIVLENDI: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidCaseTransitionError extends Error {
  constructor(from: CaseStatus, to: CaseStatus) {
    super(`Geçersiz durum geçişi: ${from} -> ${to}`);
  }
}
