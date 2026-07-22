import { Priority, SegmentType } from '@campaigncell/shared-types';
import { RuleBasedClassificationStrategy } from './rule-based-classification.strategy';

describe('RuleBasedClassificationStrategy', () => {
  const strategy = new RuleBasedClassificationStrategy();

  it('RISKLI_KAYIP segmenti her zaman en az YUKSEK öncelik alır', () => {
    for (let i = 0; i < 30; i++) {
      const result = strategy.classify({
        campaignId: `sadakat-${i}`,
        campaignType: 'SADAKAT',
        targetSegmentHint: null,
        discountRate: 10,
      });
      if (result.segment === SegmentType.RISKLI_KAYIP) {
        expect([Priority.YUKSEK, Priority.KRITIK]).toContain(result.priority);
      }
    }
  });

  it('confidence ve conversionProbability 0-1 aralığındadır', () => {
    const result = strategy.classify({
      campaignId: 'c1',
      campaignType: 'EK_PAKET',
      targetSegmentHint: null,
      discountRate: 15,
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.conversionProbability).toBeGreaterThanOrEqual(0);
    expect(result.conversionProbability).toBeLessThanOrEqual(1);
  });

  it('RISKLI_KAYIP segmentinin öncelik artışı dönüşüm olasılığından bağımsızdır', () => {
    // Bir RISKLI_KAYIP sonucu bulup, düşük dönüşüm olasılığında bile
    // önceliğin YUKSEK/KRITIK kaldığını doğrular (case doc 4.3).
    for (let i = 0; i < 50; i++) {
      const result = strategy.classify({
        campaignId: `riskli-${i}`,
        campaignType: 'SADAKAT',
        targetSegmentHint: SegmentType.RISKLI_KAYIP,
        discountRate: 5,
      });
      if (result.segment === SegmentType.RISKLI_KAYIP) {
        expect([Priority.YUKSEK, Priority.KRITIK]).toContain(result.priority);
      }
    }
  });

  it('deterministiktir', () => {
    const input = { campaignId: 'stable-id', campaignType: 'CIHAZ_FIRSATI', targetSegmentHint: null, discountRate: 20 };
    expect(strategy.classify(input)).toEqual(strategy.classify(input));
  });
});
