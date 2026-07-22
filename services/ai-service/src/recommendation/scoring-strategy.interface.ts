export interface RecommendationInput {
  campaignId: string;
  subscriberId: string;
  campaignType: string;
  discountRate: number;
  /** Number of times this subscriber previously rejected a campaign of the same type. */
  priorRejectionCount: number;
}

export interface RecommendationOutput {
  score: number; // 0.0 - 1.0
  conversionProbability: number; // 0.0 - 1.0
  /** "ml" when a trained model actually produced this score, "rule_based" when the deterministic placeholder (or its fallback path) did. Transparency field for the AI insights UI, not used in any decision logic. */
  modelSource: 'ml' | 'rule_based';
}

/**
 * Strategy interface for Task 1 (öneri skorlama). Swapping the rule-based
 * implementation for a trained ML model means writing a new class that
 * implements this interface and wiring it in recommendation.module.ts -
 * nothing else in the service needs to change. `score` is async because a
 * real implementation (see MlScoringStrategy) needs to look up telemetry and
 * call an inference service over the network.
 */
export interface ScoringStrategy {
  score(input: RecommendationInput): Promise<RecommendationOutput>;
}
