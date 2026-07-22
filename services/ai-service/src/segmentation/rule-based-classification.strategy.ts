import { Injectable } from '@nestjs/common';
import { Priority, SegmentType } from '@campaigncell/shared-types';
import { clamp, hashToUnitInterval } from '../common/deterministic-random';
import { ClassificationInput, ClassificationOutput, ClassificationStrategy } from './classification-strategy.interface';

const PRIORITY_ORDER: Priority[] = [Priority.DUSUK, Priority.ORTA, Priority.YUKSEK, Priority.KRITIK];

function maxPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_ORDER.indexOf(a) >= PRIORITY_ORDER.indexOf(b) ? a : b;
}

/** Segment başına beklenen taban dönüşüm oranı (case doc 4.5 mantığıyla tutarlı: RISKLI_KAYIP/PASIF zaten düşük etkileşimli abone kitleleridir). */
const SEGMENT_CONVERSION_BASELINE: Record<SegmentType, number> = {
  [SegmentType.YUKSEK_DEGER]: 0.55,
  [SegmentType.YENI_ABONE]: 0.5,
  [SegmentType.BELIRSIZ]: 0.35,
  [SegmentType.PASIF]: 0.3,
  [SegmentType.RISKLI_KAYIP]: 0.25,
};

/**
 * ============================================================================
 * TODO(ML): BU BİR YER TUTUCUDUR - GERÇEK EĞİTİLMİŞ BİR MODEL İLE DEĞİŞTİRİN
 * ============================================================================
 * Case dokümanı 5.2 "Görev 2: Segment Sınıflandırma" için hafif kural tabanlı
 * bir yer tutucu. Gerçek üretim sistemi:
 *
 *   Önerilen yaklaşım : Çok sınıflı sınıflandırma (örn. Random Forest veya
 *                        multinomial Logistic Regression, scikit-learn).
 *   Girdi feature'ları : abonenin kullanım trendi (artan/azalan), churn
 *                        sinyalleri (şikayet, tarife düşürme talebi), tarife
 *                        kademesi, sadakat süresi, ARPU segmenti.
 *   Çıktı              : YUKSEK_DEGER / RISKLI_KAYIP / YENI_ABONE / PASIF +
 *                        segment için beklenen dönüşüm olasılığı.
 *   Etiketli veri       : Geçmiş uzman kategorizasyonları (bu serviste
 *                        SegmentPrediction.correctedSegment alanı zaten bu
 *                        geri bildirimi biriktiriyor - gerçek modelin eğitim
 *                        etiketi tam olarak bu olurdu).
 *
 * Aşağıdaki mantık, kampanya tipini ve (varsa) uzmanın öngördüğü segmenti
 * girdi alan basit, deterministik bir kural tablosudur. Uzmanın öngörüsü
 * %70 ihtimalle onaylanır (gerçek bir sınıflandırıcının bazen insan sezgisiyle
 * hemfikir, bazen farklı sonuç vermesini simüle eder).
 *
 * `conversionProbability`, Campaign Service'in "bu kampanya+segment için bir
 * optimizasyon vakası açılmalı mı" kararını verirken kullandığı sayıdır (bkz.
 * campaign-service README "Vaka Açma Eşiği") - segment sınıflandırmasının
 * doğruluğunu ifade eden `confidence` ile KARIŞTIRILMAMALIDIR.
 */
@Injectable()
export class RuleBasedClassificationStrategy implements ClassificationStrategy {
  classify(input: ClassificationInput): ClassificationOutput {
    const roll = hashToUnitInterval(`${input.campaignId}:classify`);

    let segment: SegmentType;
    if (input.targetSegmentHint && roll < 0.7) {
      segment = input.targetSegmentHint;
    } else {
      segment = this.classifyByCampaignType(input.campaignType, input.discountRate, roll);
    }

    const confidence = Math.round((0.55 + roll * 0.4) * 1000) / 1000;

    let priority = this.priorityFromConfidence(confidence, input.discountRate);
    if (segment === SegmentType.RISKLI_KAYIP) {
      // Case doc 4.3: "RISKLI_KAYIP segment → minimum YUKSEK" - bağımsız
      // bir kural, dönüşüm olasılığından etkilenmez: churn riski taşıyan bir
      // aboneyi kaybetmenin maliyeti, kampanyanın dönüşmemesinden yüksektir.
      priority = maxPriority(priority, Priority.YUKSEK);
    }

    const conversionRoll = hashToUnitInterval(`${input.campaignId}:conversion`);
    const discountBoost = Math.min(0.2, (input.discountRate / 100) * 0.4);
    const conversionProbability = round(
      clamp(SEGMENT_CONVERSION_BASELINE[segment] * 0.6 + conversionRoll * 0.3 + discountBoost),
    );

    return { segment, priority, confidence, conversionProbability };
  }

  private classifyByCampaignType(campaignType: string, discountRate: number, roll: number): SegmentType {
    switch (campaignType) {
      case 'SADAKAT':
        return SegmentType.RISKLI_KAYIP;
      case 'CIHAZ_FIRSATI':
        return SegmentType.YUKSEK_DEGER;
      case 'TARIFE_YUKSELTME':
        return discountRate >= 25 ? SegmentType.YUKSEK_DEGER : SegmentType.PASIF;
      case 'EK_PAKET':
        return roll < 0.5 ? SegmentType.YENI_ABONE : SegmentType.PASIF;
      default:
        return SegmentType.BELIRSIZ;
    }
  }

  private priorityFromConfidence(confidence: number, discountRate: number): Priority {
    if (confidence >= 0.85 && discountRate >= 30) return Priority.KRITIK;
    if (confidence >= 0.85) return Priority.YUKSEK;
    if (confidence >= 0.7) return Priority.ORTA;
    return Priority.DUSUK;
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
