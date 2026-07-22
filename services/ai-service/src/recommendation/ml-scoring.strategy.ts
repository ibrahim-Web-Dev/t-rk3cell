import { Injectable, Logger } from '@nestjs/common';
import { clamp } from '../common/deterministic-random';
import { PrismaService } from '../prisma/prisma.service';
import { MlChurnClient } from '../ml-client/ml-churn.client';
import { RuleBasedScoringStrategy } from './rule-based-scoring.strategy';
import { RecommendationInput, RecommendationOutput, ScoringStrategy } from './scoring-strategy.interface';

/**
 * ============================================================================
 * GERÇEK ML MODELİ ENTEGRASYONU (Task 1 - öneri skorlama)
 * ============================================================================
 * rule-based-scoring.strategy.ts'nin belgelediği eksik ("gerçek kullanım
 * verisi yok") artık kapandı: services/ai-service/ml/ altında
 * turkcell_sahte_veri.csv (25.000 satır sentetik ama gerçekçi Turkcell abone
 * telemetrisi) üzerinde train_best_model.py ile eğitilmiş, 5-fold CV
 * ROC-AUC'a göre LogisticRegression/RandomForest/HistGradientBoosting/KNN/
 * XGBoost arasından seçilmiş gerçek bir churn (kayıp) modeli var. Bu model
 * Node.js'te çalışamayacağı için ai-ml-inference adlı ayrı bir Python/FastAPI
 * sidecar konteynerinde servis ediliyor; bu sınıf ona HTTP ile bağlanıyor
 * (bkz. MlChurnClient).
 *
 * NEDEN TASK 1 (Task 2 DEĞİL): Model subscriber-seviyesinde eğitildi (bir
 * abonenin churn olasılığı). Task 2 (segment sınıflandırma) kampanya
 * seviyesinde, belirli bir abone olmadan çalışır (case doc: "bu kampanya
 * hangi segmente uygun"). Modeli kendi eğitildiği granülariteden farklı bir
 * soruya zorlamak yanıltıcı sonuç verirdi - bu yüzden Task 2 kasıtlı olarak
 * rule-based kaldı (bkz. ai-service README "ML Entegrasyonu" bölümü).
 *
 * TELEMETRİ: AI Service'in kendi read-model'i olan SubscriberTelemetry
 * tablosundan (yalnızca demo abonelerine seed'lenmiş - bkz. prisma/seed.ts)
 * subscriberId ile satır aranır. Satır yoksa (örn. yeni self-register olmuş
 * bir abone) ML modeli hiç çağrılmaz, doğrudan rule-based fallback'e düşülür
 * - bu, Identity/Campaign Service'lerin veritabanına asla doğrudan
 * dokunmama prensibini korur.
 *
 * DÖNÜŞÜM (churn_probability -> score/conversionProbability): ham churn
 * olasılığını doğrudan kullanmak yerine kampanya tipine göre yorumluyoruz:
 *   - SADAKAT (retention) kampanyaları: yüksek churn riski = bu kampanyanın
 *     TAM DA bu abone için gerekli olduğu anlamına gelir -> yüksek ilgi
 *     sinyali (engagementSignal = churn_probability).
 *   - Diğer tüm kampanya tipleri (upsell/ek paket/cihaz vb.): kopma
 *     eğilimindeki bir abone genel bir kampanyaya daha az ilgi gösterir
 *     -> engagementSignal = 1 - churn_probability.
 * Bu sinyal, RuleBasedScoringStrategy ile AYNI ölçekte (discount boost +
 * ret-geçmişi cezası) bir score'a dönüştürülür, böylece
 * RecommendationService'teki MIN_VISIBLE_SCORE/PRIORITIZED_SCORE eşikleri
 * strateji ne olursa olsun anlamlı kalır.
 */
@Injectable()
export class MlScoringStrategy implements ScoringStrategy {
  private readonly logger = new Logger(MlScoringStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlChurnClient: MlChurnClient,
    private readonly fallback: RuleBasedScoringStrategy,
  ) {}

  async score(input: RecommendationInput): Promise<RecommendationOutput> {
    const telemetry = await this.prisma.subscriberTelemetry.findUnique({
      where: { subscriberId: input.subscriberId },
    });

    if (!telemetry) {
      return this.fallback.score(input);
    }

    const churnProbability = await this.mlChurnClient.predictChurnProbability(
      telemetry.features as Record<string, unknown>,
    );

    if (churnProbability === null) {
      this.logger.warn(
        `subscriber=${input.subscriberId} için ML sidecar'ı ulaşılamaz oldu, kural tabanlı skora düşülüyor.`,
      );
      return this.fallback.score(input);
    }

    const engagementSignal = input.campaignType === 'SADAKAT' ? churnProbability : 1 - churnProbability;
    const discountBoost = Math.min(0.15, (input.discountRate / 100) * 0.3);
    const rejectionPenalty = Math.min(0.4, input.priorRejectionCount * 0.15);

    const score = clamp(engagementSignal * 0.7 + discountBoost + 0.1 - rejectionPenalty);
    const conversionProbability = clamp(score * 0.85);

    return { score: round(score), conversionProbability: round(conversionProbability), modelSource: 'ml' };
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
