/**
 * Shared enums used across CampaignCell services.
 * This package is COMPILE-TIME ONLY: it contains no business logic and no
 * runtime dependency between services is created by importing it. Each
 * service still owns and validates its own data independently
 * (database-per-service is preserved).
 */

export enum Role {
  SUBSCRIBER = 'SUBSCRIBER',
  PERSONEL = 'PERSONEL',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export enum CampaignType {
  EK_PAKET = 'EK_PAKET',
  TARIFE_YUKSELTME = 'TARIFE_YUKSELTME',
  CIHAZ_FIRSATI = 'CIHAZ_FIRSATI',
  SADAKAT = 'SADAKAT',
}

export enum SegmentType {
  YUKSEK_DEGER = 'YUKSEK_DEGER',
  RISKLI_KAYIP = 'RISKLI_KAYIP',
  YENI_ABONE = 'YENI_ABONE',
  PASIF = 'PASIF',
  BELIRSIZ = 'BELIRSIZ',
}

export enum Priority {
  DUSUK = 'DUSUK',
  ORTA = 'ORTA',
  YUKSEK = 'YUKSEK',
  KRITIK = 'KRITIK',
}

export enum CaseStatus {
  YENI = 'YENI',
  ATANDI = 'ATANDI',
  OPTIMIZE_EDILIYOR = 'OPTIMIZE_EDILIYOR',
  TEST_EDILIYOR = 'TEST_EDILIYOR',
  TAMAMLANDI = 'TAMAMLANDI',
  YAYINDA = 'YAYINDA',
  ARSIVLENDI = 'ARSIVLENDI',
}

export enum OfferResponse {
  KABUL = 'KABUL',
  ILGILENMIYORUM = 'ILGILENMIYORUM',
}

/** SLA duration per priority, expressed in hours. */
export const SLA_HOURS_BY_PRIORITY: Record<Priority, number> = {
  [Priority.KRITIK]: 2,
  [Priority.YUKSEK]: 8,
  [Priority.ORTA]: 24,
  [Priority.DUSUK]: 72,
};

/** Max active optimization cases an expert can carry per the assignment formula (section 5.3). */
export const EXPERT_MAX_CAPACITY = 10;

export enum Level {
  BRONZ = 'BRONZ',
  GUMUS = 'GUMUS',
  ALTIN = 'ALTIN',
  PLATIN = 'PLATIN',
}

/** Level thresholds (case doc section 6.3), highest first so computeLevel can short-circuit. */
export const LEVEL_THRESHOLDS: { level: Level; minPoints: number }[] = [
  { level: Level.PLATIN, minPoints: 3000 },
  { level: Level.ALTIN, minPoints: 1500 },
  { level: Level.GUMUS, minPoints: 500 },
  { level: Level.BRONZ, minPoints: 0 },
];

export function computeLevel(totalPoints: number): Level {
  for (const tier of LEVEL_THRESHOLDS) {
    if (totalPoints >= tier.minPoints) return tier.level;
  }
  return Level.BRONZ;
}
