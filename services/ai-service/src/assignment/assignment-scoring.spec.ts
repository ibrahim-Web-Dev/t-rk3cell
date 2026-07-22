import { computeAssignmentScore, hasCapacity } from './assignment-scoring';

describe('computeAssignmentScore', () => {
  it('rewards specialty match heavily (0.5 weight)', () => {
    const matched = computeAssignmentScore(
      { userId: 'e1', specialties: ['RISKLI_KAYIP'], activeCaseCount: 5, performanceScore: 0.5 },
      'RISKLI_KAYIP',
    );
    const unmatched = computeAssignmentScore(
      { userId: 'e2', specialties: ['PASIF'], activeCaseCount: 5, performanceScore: 0.5 },
      'RISKLI_KAYIP',
    );
    expect(matched - unmatched).toBeCloseTo(0.5, 5);
  });

  it('rewards free capacity (0.3 weight)', () => {
    const empty = computeAssignmentScore(
      { userId: 'e1', specialties: [], activeCaseCount: 0, performanceScore: 0 },
      'RISKLI_KAYIP',
    );
    const full = computeAssignmentScore(
      { userId: 'e2', specialties: [], activeCaseCount: 10, performanceScore: 0 },
      'RISKLI_KAYIP',
    );
    expect(empty).toBeCloseTo(0.3, 5);
    expect(full).toBeCloseTo(0, 5);
  });

  it('rewards performance (0.2 weight)', () => {
    const highPerf = computeAssignmentScore(
      { userId: 'e1', specialties: [], activeCaseCount: 10, performanceScore: 1 },
      'RISKLI_KAYIP',
    );
    expect(highPerf).toBeCloseTo(0.2, 5);
  });

  it('hasCapacity respects the max capacity of 10', () => {
    expect(hasCapacity({ activeCaseCount: 9 })).toBe(true);
    expect(hasCapacity({ activeCaseCount: 10 })).toBe(false);
  });
});
