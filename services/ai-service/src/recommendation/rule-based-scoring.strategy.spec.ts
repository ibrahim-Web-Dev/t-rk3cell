import { RuleBasedScoringStrategy } from './rule-based-scoring.strategy';

describe('RuleBasedScoringStrategy', () => {
  const strategy = new RuleBasedScoringStrategy();

  it('is deterministic for the same input', () => {
    const input = { campaignId: 'c1', subscriberId: 's1', campaignType: 'EK_PAKET', discountRate: 20, priorRejectionCount: 0 };
    expect(strategy.score(input)).toEqual(strategy.score(input));
  });

  it('produces scores within [0, 1]', () => {
    for (let i = 0; i < 20; i++) {
      const result = strategy.score({
        campaignId: `c${i}`,
        subscriberId: `s${i}`,
        campaignType: 'SADAKAT',
        discountRate: 30,
        priorRejectionCount: 0,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.conversionProbability).toBeGreaterThanOrEqual(0);
      expect(result.conversionProbability).toBeLessThanOrEqual(1);
    }
  });

  it('lowers the score as prior rejections accumulate (case doc 4.5)', () => {
    const base = { campaignId: 'c1', subscriberId: 's1', campaignType: 'EK_PAKET', discountRate: 20 };
    const noRejections = strategy.score({ ...base, priorRejectionCount: 0 });
    const manyRejections = strategy.score({ ...base, priorRejectionCount: 3 });
    expect(manyRejections.score).toBeLessThan(noRejections.score);
  });

  it('higher discount rate increases the score', () => {
    const base = { campaignId: 'c1', subscriberId: 's1', campaignType: 'EK_PAKET', priorRejectionCount: 0 };
    const lowDiscount = strategy.score({ ...base, discountRate: 0 });
    const highDiscount = strategy.score({ ...base, discountRate: 50 });
    expect(highDiscount.score).toBeGreaterThan(lowDiscount.score);
  });
});
