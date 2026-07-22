import { Injectable } from '@nestjs/common';
import { clamp, hashToUnitInterval } from '../common/deterministic-random';
import { RecommendationInput, RecommendationOutput, ScoringStrategy } from './scoring-strategy.interface';

/**
 * ============================================================================
 * TODO(ML): BU BİR YER TUTUCUDUR - GERÇEK EĞİTİLMİŞ BİR MODEL İLE DEĞİŞTİRİN
 * ============================================================================
 * Bu sınıf, case dokümanının 5.1 bölümündeki "Görev 1: Öneri Skorlama"
 * gereksinimini bilinçli olarak HAFİF KURAL TABANLI bir mantıkla karşılar.
 * Gerçek bir üretim sistemi burada eğitilmiş bir ML modeli kullanmalıdır:
 *
 *   Önerilen yaklaşım : scikit-learn ile Gradient Boosting (örn. LightGBM/
 *                        XGBoost) veya basit bir Logistic Regression baseline.
 *   Girdi feature'ları : - abonenin aylık ortalama veri/dakika kullanımı
 *                        - mevcut tarife ve tarife değişim geçmişi
 *                        - geçmiş kampanya kabul/ret oranı (bu serviste kısmen
 *                          OfferFeedback tablosuyla tutuluyor, genişletilebilir)
 *                        - şikayet/çağrı merkezi kayıt sayısı
 *                        - ortalama aylık harcama (ARPU) ve trend
 *                        - abonelik süresi (tenure)
 *   Eğitim verisi      : Gerçekçi Türkçe abone profili + kampanya kabul/ret
 *                        geçmişi (min. 100 örnek, README'de AI_APPROACH.md
 *                        dosyasında süreç anlatılmalı). Bu depoda örnek/sahte
 *                        veri BULUNMUYOR; bu servis şu an gerçek bir kullanım
 *                        verisi kaynağına (Identity Service'te sadece kimlik
 *                        alanları var, kullanım verisi yok) bağlı değildir.
 *   Model takası       : Yalnızca ScoringStrategy arayüzünü uygulayan yeni bir
 *                        sınıf yazıp recommendation.module.ts içinde
 *                        `RuleBasedScoringStrategy` yerine bağlamanız yeterli;
 *                        controller/service katmanı değişmez.
 *
 * Aşağıdaki mantık YALNIZCA deterministik, test edilebilir bir yer tutucudur:
 * gerçek kullanım verisi yerine (campaignId+subscriberId) çiftinin hash'inden
 * türetilen sözde-rastgele bir taban skor kullanır; indirim oranı ve abonenin
 * bu kampanya tipini daha önce reddetme geçmişiyle ayarlanır.
 */
@Injectable()
export class RuleBasedScoringStrategy implements ScoringStrategy {
  score(input: RecommendationInput): RecommendationOutput {
    const baseScore = hashToUnitInterval(`${input.subscriberId}:${input.campaignType}`);

    // Higher discounts nudge the score up, with diminishing returns.
    const discountBoost = Math.min(0.15, (input.discountRate / 100) * 0.3);

    // Case doc 4.5: "Abone 'ilgilenmiyorum' derse benzer kampanyaların öneri
    // skoru düşer" - each prior rejection of the same campaign type dampens
    // the score for future similar campaigns.
    const rejectionPenalty = Math.min(0.4, input.priorRejectionCount * 0.15);

    const score = clamp(baseScore * 0.7 + discountBoost + 0.15 - rejectionPenalty);
    const conversionProbability = clamp(score * 0.85);

    return { score: round(score), conversionProbability: round(conversionProbability) };
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
