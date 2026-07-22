export interface StatsSnapshot {
  completedCaseCount: number;
  fastCompletionCount: number;
  conversionExceedCount: number;
  riskliKayipRescueCount: number;
  dailyCompletionCount: number;
  segmentCounts: Record<string, number>;
}

/** Badge thresholds - case doc section 6.2. Kept as pure predicates so they're unit testable without a database. */
export const BADGE_THRESHOLDS: Record<string, (s: StatsSnapshot) => boolean> = {
  ILK_KAMPANYA: (s) => s.completedCaseCount >= 1,
  HIZ_USTASI: (s) => s.fastCompletionCount >= 10,
  DONUSUM_KRALI: (s) => s.conversionExceedCount >= 10,
  MARATONCU: (s) => s.dailyCompletionCount >= 20,
  CHURN_AVCISI: (s) => s.riskliKayipRescueCount >= 10,
  UZMAN: (s) => Object.values(s.segmentCounts).some((count) => count >= 50),
};

export function evaluateNewBadges(stats: StatsSnapshot, alreadyEarned: ReadonlySet<string>): string[] {
  const newly: string[] = [];
  for (const [code, check] of Object.entries(BADGE_THRESHOLDS)) {
    if (!alreadyEarned.has(code) && check(stats)) {
      newly.push(code);
    }
  }
  return newly;
}
