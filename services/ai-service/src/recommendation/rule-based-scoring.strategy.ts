import { Injectable } from '@nestjs/common';
import { clamp, hashToUnitInterval } from '../common/deterministic-random';
import { RecommendationInput, RecommendationOutput, ScoringStrategy } from './scoring-strategy.interface';

/**
 * ============================================================================
 * TODO(ML) DURUMU: Task 1 için artık GERÇEK bir model devrede - bkz.
 * ml-scoring.strategy.ts (MlScoringStrategy). Bu sınıf o stratejinin
 * FALLBACK'i olarak kalmaya devam ediyor: subscriber için telemetri yoksa
 * (ör. yeni self-register olmuş bir abone) veya ai-ml-inference sidecar'ı
 * ulaşılamaz durumdaysa devreye giren, deterministik, bağımlılıksız yer
 * tutucu budur. AI_SCORING_STRATEGY=rule ortam değişkeniyle de doğrudan
 * birincil strateji olarak seçilebilir (bkz. ai-service README).
 * ============================================================================
 * Aşağıdaki mantık YALNIZCA deterministik, test edilebilir bir yer tutucudur:
 * gerçek kullanım verisi yerine (campaignId+subscriberId) çiftinin hash'inden
 * türetilen sözde-rastgele bir taban skor kullanır; indirim oranı ve abonenin
 * bu kampanya tipini daha önce reddetme geçmişiyle ayarlanır.
 */
@Injectable()
export class RuleBasedScoringStrategy implements ScoringStrategy {
  async score(input: RecommendationInput): Promise<RecommendationOutput> {
    const baseScore = hashToUnitInterval(`${input.subscriberId}:${input.campaignType}`);

    // Higher discounts nudge the score up, with diminishing returns.
    const discountBoost = Math.min(0.15, (input.discountRate / 100) * 0.3);

    // Case doc 4.5: "Abone 'ilgilenmiyorum' derse benzer kampanyaların öneri
    // skoru düşer" - each prior rejection of the same campaign type dampens
    // the score for future similar campaigns.
    const rejectionPenalty = Math.min(0.4, input.priorRejectionCount * 0.15);

    const score = clamp(baseScore * 0.7 + discountBoost + 0.15 - rejectionPenalty);
    const conversionProbability = clamp(score * 0.85);

    return { score: round(score), conversionProbability: round(conversionProbability), modelSource: 'rule_based' };
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
