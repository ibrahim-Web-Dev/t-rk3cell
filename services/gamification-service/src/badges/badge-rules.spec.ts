import { evaluateNewBadges, StatsSnapshot } from './badge-rules';

const baseStats: StatsSnapshot = {
  completedCaseCount: 0,
  fastCompletionCount: 0,
  conversionExceedCount: 0,
  riskliKayipRescueCount: 0,
  dailyCompletionCount: 0,
  segmentCounts: {},
};

describe('evaluateNewBadges', () => {
  it('awards İlk Kampanya on the first completion', () => {
    const badges = evaluateNewBadges({ ...baseStats, completedCaseCount: 1 }, new Set());
    expect(badges).toContain('ILK_KAMPANYA');
  });

  it('does not re-award a badge the user already has', () => {
    const badges = evaluateNewBadges({ ...baseStats, completedCaseCount: 5 }, new Set(['ILK_KAMPANYA']));
    expect(badges).not.toContain('ILK_KAMPANYA');
  });

  it('awards Hız Ustası at 10 fast completions, not before', () => {
    expect(evaluateNewBadges({ ...baseStats, fastCompletionCount: 9 }, new Set())).not.toContain('HIZ_USTASI');
    expect(evaluateNewBadges({ ...baseStats, fastCompletionCount: 10 }, new Set())).toContain('HIZ_USTASI');
  });

  it('awards Uzman when any single segment reaches 50', () => {
    const badges = evaluateNewBadges(
      { ...baseStats, segmentCounts: { RISKLI_KAYIP: 12, YUKSEK_DEGER: 50 } },
      new Set(),
    );
    expect(badges).toContain('UZMAN');
  });

  it('can award multiple badges at once', () => {
    const badges = evaluateNewBadges(
      { ...baseStats, completedCaseCount: 1, fastCompletionCount: 10, conversionExceedCount: 10 },
      new Set(),
    );
    expect(badges).toEqual(expect.arrayContaining(['ILK_KAMPANYA', 'HIZ_USTASI', 'DONUSUM_KRALI']));
  });
});
