import { MlScoringStrategy } from './ml-scoring.strategy';
import { RuleBasedScoringStrategy } from './rule-based-scoring.strategy';
import { RecommendationInput } from './scoring-strategy.interface';

function buildInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    campaignId: 'c1',
    subscriberId: 's1',
    campaignType: 'EK_PAKET',
    discountRate: 20,
    priorRejectionCount: 0,
    ...overrides,
  };
}

describe('MlScoringStrategy', () => {
  function build(telemetry: unknown, churnProbability: number | null) {
    const prisma = { subscriberTelemetry: { findUnique: jest.fn().mockResolvedValue(telemetry) } } as any;
    const mlChurnClient = { predictChurnProbability: jest.fn().mockResolvedValue(churnProbability) } as any;
    const fallback = new RuleBasedScoringStrategy();
    const fallbackSpy = jest.spyOn(fallback, 'score');
    const strategy = new MlScoringStrategy(prisma, mlChurnClient, fallback);
    return { strategy, prisma, mlChurnClient, fallback, fallbackSpy };
  }

  it('falls back to the rule-based strategy when no telemetry exists for the subscriber', async () => {
    const { strategy, mlChurnClient, fallbackSpy } = build(null, 0.5);

    const result = await strategy.score(buildInput());

    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    expect(mlChurnClient.predictChurnProbability).not.toHaveBeenCalled();
    expect(result.modelSource).toBe('rule_based');
  });

  it('falls back to the rule-based strategy when the ML sidecar is unreachable', async () => {
    const { strategy, fallbackSpy } = build({ features: { yas: 30 } }, null);

    const result = await strategy.score(buildInput());

    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    expect(result.modelSource).toBe('rule_based');
  });

  it('uses the real model output and marks modelSource as "ml" when telemetry + sidecar both succeed', async () => {
    const { strategy, fallbackSpy } = build({ features: { yas: 30 } }, 0.8);

    const result = await strategy.score(buildInput());

    expect(fallbackSpy).not.toHaveBeenCalled();
    expect(result.modelSource).toBe('ml');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('treats high churn probability as a strong signal for SADAKAT (retention) campaigns', async () => {
    const { strategy: highChurnStrategy } = build({ features: {} }, 0.9);
    const { strategy: lowChurnStrategy } = build({ features: {} }, 0.1);

    const highChurnResult = await highChurnStrategy.score(buildInput({ campaignType: 'SADAKAT' }));
    const lowChurnResult = await lowChurnStrategy.score(buildInput({ campaignType: 'SADAKAT' }));

    expect(highChurnResult.score).toBeGreaterThan(lowChurnResult.score);
  });

  it('treats high churn probability as a weak signal for non-retention campaigns', async () => {
    const { strategy: highChurnStrategy } = build({ features: {} }, 0.9);
    const { strategy: lowChurnStrategy } = build({ features: {} }, 0.1);

    const highChurnResult = await highChurnStrategy.score(buildInput({ campaignType: 'EK_PAKET' }));
    const lowChurnResult = await lowChurnStrategy.score(buildInput({ campaignType: 'EK_PAKET' }));

    expect(highChurnResult.score).toBeLessThan(lowChurnResult.score);
  });
});
