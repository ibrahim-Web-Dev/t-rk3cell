import { PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';

const prisma = new PrismaClient();

const HOUR = 3_600_000;
const now = Date.now();

type CampaignType = 'EK_PAKET' | 'TARIFE_YUKSELTME' | 'CIHAZ_FIRSATI' | 'SADAKAT';
type Segment = 'YUKSEK_DEGER' | 'RISKLI_KAYIP' | 'YENI_ABONE' | 'PASIF' | 'BELIRSIZ';
type CaseStatus = 'YENI' | 'ATANDI' | 'OPTIMIZE_EDILIYOR' | 'TEST_EDILIYOR' | 'TAMAMLANDI' | 'YAYINDA' | 'ARSIVLENDI';

const EXPERT_IDS = [
  DEMO_SEED_IDS.EXPERT_1,
  DEMO_SEED_IDS.EXPERT_2,
  DEMO_SEED_IDS.EXPERT_3,
  DEMO_SEED_IDS.EXPERT_4,
  DEMO_SEED_IDS.EXPERT_5,
  DEMO_SEED_IDS.EXPERT_6,
  DEMO_SEED_IDS.EXPERT_7,
  DEMO_SEED_IDS.EXPERT_8,
  DEMO_SEED_IDS.EXPERT_9,
  DEMO_SEED_IDS.EXPERT_10,
  DEMO_SEED_IDS.EXPERT_11,
  DEMO_SEED_IDS.EXPERT_12,
];

const SUBSCRIBER_IDS = [
  DEMO_SEED_IDS.SUBSCRIBER_1,
  DEMO_SEED_IDS.SUBSCRIBER_2,
  DEMO_SEED_IDS.SUBSCRIBER_3,
  DEMO_SEED_IDS.SUBSCRIBER_4,
  DEMO_SEED_IDS.SUBSCRIBER_5,
  DEMO_SEED_IDS.SUBSCRIBER_6,
];

const SEGMENTS: Segment[] = ['YUKSEK_DEGER', 'RISKLI_KAYIP', 'YENI_ABONE', 'PASIF', 'BELIRSIZ'];

// Vaka açık kampanyalarda dönüşen (state machine'de ilerlemiş) durum döngüsü.
const STATUS_CYCLE: CaseStatus[] = [
  'TAMAMLANDI',
  'YAYINDA',
  'ARSIVLENDI',
  'OPTIMIZE_EDILIYOR',
  'TEST_EDILIYOR',
  'ATANDI',
  'YENI',
];

// Gerçekçi Turkcell tarzı kampanya isimleri (bkz. kullanıcı talebi: "lorem ipsum kullanma").
const CAMPAIGN_TITLES: { title: string; type: CampaignType }[] = [
  { title: 'Süper Online Ek 10GB Paketi', type: 'EK_PAKET' },
  { title: 'Turkcell Platinum Sadakat Programı', type: 'SADAKAT' },
  { title: '5G Hazır Cihaz Kampanyası', type: 'CIHAZ_FIRSATI' },
  { title: 'Öğrenci Tarife Yükseltme Fırsatı', type: 'TARIFE_YUKSELTME' },
  { title: 'Aile Hattı Ek Paket Fırsatı', type: 'EK_PAKET' },
  { title: 'Sosyal Medya Ek Paketi', type: 'EK_PAKET' },
  { title: 'Kış Kampanyası Cihaz Taksit Fırsatı', type: 'CIHAZ_FIRSATI' },
  { title: 'Yaz Tatili Roaming Paketi', type: 'EK_PAKET' },
  { title: 'Kurumsal Hat Yükseltme Kampanyası', type: 'TARIFE_YUKSELTME' },
  { title: 'Genç Hat Ek Dakika Paketi', type: 'EK_PAKET' },
  { title: 'Turkcell Dijital Operatör Kampanyası', type: 'EK_PAKET' },
  { title: 'Ev İnterneti Hızlandırma Fırsatı', type: 'TARIFE_YUKSELTME' },
  { title: 'Yeni Yıl Cihaz Kampanyası', type: 'CIHAZ_FIRSATI' },
  { title: 'Sadakat Yılı Hediyesi', type: 'SADAKAT' },
  { title: 'TV+ Paket Kampanyası', type: 'EK_PAKET' },
  { title: 'Bireysel Emeklilik Sadakat Fırsatı', type: 'SADAKAT' },
  { title: 'Ekstra GB Hafta Sonu Paketi', type: 'EK_PAKET' },
  { title: 'Faturasız Hatta Geçiş Kampanyası', type: 'TARIFE_YUKSELTME' },
  { title: 'iPhone Taksit Fırsatı', type: 'CIHAZ_FIRSATI' },
  { title: 'Öğretmenler Günü Özel Paketi', type: 'EK_PAKET' },
  { title: 'Yurt Dışı Hat Sadakat Programı', type: 'SADAKAT' },
  { title: 'Akıllı Saat Cihaz Fırsatı', type: 'CIHAZ_FIRSATI' },
  { title: 'Ramazan Ek Paket Kampanyası', type: 'EK_PAKET' },
  { title: 'Bayram Tarife Yükseltme Fırsatı', type: 'TARIFE_YUKSELTME' },
  { title: 'Anneler Günü Hediye Paketi', type: 'EK_PAKET' },
  { title: 'Yeni Abone Hoşgeldin Kampanyası', type: 'EK_PAKET' },
  { title: 'Turkcell Business Tarife Fırsatı', type: 'TARIFE_YUKSELTME' },
  { title: 'Sonbahar Cihaz Yenileme Kampanyası', type: 'CIHAZ_FIRSATI' },
];

function priorityFor(segment: Segment, i: number): 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK' {
  if (segment === 'RISKLI_KAYIP') return i % 3 === 0 ? 'KRITIK' : 'YUKSEK'; // case doc 4.3: her zaman en az YUKSEK
  const cycle: ('DUSUK' | 'ORTA' | 'YUKSEK')[] = ['DUSUK', 'ORTA', 'YUKSEK'];
  return cycle[i % cycle.length];
}

async function main() {
  const existing = await prisma.campaign.count();
  if (existing > 0) {
    console.log('Campaign Service: demo verisi zaten mevcut, atlanıyor.');
    return;
  }

  let seq = 0;
  let caseCount = 0;
  let healthyCount = 0;
  const healthyCampaignIds: string[] = [];

  for (let i = 0; i < CAMPAIGN_TITLES.length; i++) {
    const { title, type } = CAMPAIGN_TITLES[i];
    const segment = SEGMENTS[i % SEGMENTS.length];
    const isHealthy = i % 4 === 3; // her 4 kampanyadan biri "sağlıklı" (vaka açılmaz)
    const discountRate = 10 + (i % 5) * 5;
    const creator = EXPERT_IDS[i % EXPERT_IDS.length];

    seq += 1;
    const campaignNumber = `CMP-2026-${String(seq).padStart(6, '0')}`;

    if (isHealthy) {
      const conversionProbability = Math.round((0.45 + (i % 4) * 0.09) * 1000) / 1000; // 0.40 eşiğinin üzerinde
      const campaign = await prisma.campaign.create({
        data: {
          campaignNumber,
          title,
          type,
          targetSegmentHint: segment,
          discountRate,
          validUntil: new Date(now + (20 + i) * 24 * HOUR),
          createdBy: creator,
          aiSegment: segment,
          aiPriority: priorityFor(segment, i),
          aiConfidence: 0.7,
          aiConversionProbability: conversionProbability,
          wasAiClassified: true,
        },
      });
      const subscriberId = SUBSCRIBER_IDS[i % SUBSCRIBER_IDS.length];
      await prisma.subscriberOffer.create({
        data: {
          campaignId: campaign.id,
          subscriberId,
          score: conversionProbability,
          conversionProbability,
        },
      });
      healthyCampaignIds.push(campaign.id);
      healthyCount += 1;
      continue;
    }

    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const priority = priorityFor(segment, i);
    const conversionProbability = Math.round((0.15 + (i % 5) * 0.04) * 1000) / 1000; // eşiğin (0.40) altında
    const assignedExpertId = status === 'YENI' ? undefined : EXPERT_IDS[i % EXPERT_IDS.length];
    const isTerminal = status === 'TAMAMLANDI' || status === 'YAYINDA' || status === 'ARSIVLENDI';
    const slaAgeHours = isTerminal ? 30 + i : i % 12;
    const slaHours = priority === 'KRITIK' ? 2 : priority === 'YUKSEK' ? 8 : priority === 'ORTA' ? 24 : 72;

    const campaign = await prisma.campaign.create({
      data: {
        campaignNumber,
        title,
        type,
        targetSegmentHint: segment,
        discountRate,
        validUntil: new Date(now + (15 + i) * 24 * HOUR),
        createdBy: creator,
        aiSegment: segment,
        aiPriority: priority,
        aiConfidence: Math.round((0.65 + (i % 4) * 0.07) * 1000) / 1000,
        aiConversionProbability: conversionProbability,
        wasAiClassified: true,
      },
    });

    await prisma.optimizationCase.create({
      data: {
        campaignId: campaign.id,
        segment,
        priority,
        status,
        assignedExpertId,
        assignmentScore: assignedExpertId ? Math.round((0.65 + (i % 5) * 0.06) * 1000) / 1000 : undefined,
        conversionProbability,
        aiConfidence: Math.round((0.65 + (i % 4) * 0.07) * 1000) / 1000,
        wasAiClassified: true,
        optimizationNote: isTerminal ? 'Segment yeniden hedeflendi, teklif parametreleri optimize edildi.' : undefined,
        conversionLift: isTerminal ? Math.round((0.1 + (i % 6) * 0.03) * 1000) / 1000 : undefined,
        abTestStartedAt: status === 'TEST_EDILIYOR' ? new Date(now - (2 + (i % 4)) * HOUR) : undefined,
        slaStartedAt: new Date(now - slaAgeHours * HOUR),
        slaDueAt: new Date(now - slaAgeHours * HOUR + slaHours * HOUR),
        slaBreached: !isTerminal && slaAgeHours * HOUR > slaHours * HOUR,
        completedAt: isTerminal ? new Date(now - (slaAgeHours - 4) * HOUR) : undefined,
      },
    });
    caseCount += 1;

    // Her vakalı kampanyada 1-2 abone teklifi de oluştur (dashboard/portfolio zenginliği için).
    const subscriberId = SUBSCRIBER_IDS[i % SUBSCRIBER_IDS.length];
    await prisma.subscriberOffer.create({
      data: {
        campaignId: campaign.id,
        subscriberId,
        score: Math.max(0.1, conversionProbability - 0.05),
        conversionProbability,
        response: i % 3 === 0 ? 'KABUL' : i % 3 === 1 ? 'ILGILENMIYORUM' : undefined,
        respondedAt: i % 3 !== 2 ? new Date(now - 3 * HOUR) : undefined,
        satisfactionStars: i % 3 === 0 ? 4 + (i % 2) : undefined,
        satisfactionRatedAt: i % 3 === 0 ? new Date(now - 2.5 * HOUR) : undefined,
      },
    });
  }

  // Her demo abonesinin gelen ekranında EN AZ 2 görünür (skor ≥ 0.60) teklif
  // olsun - aksi halde bazı aboneler boş teklif ekranıyla karşılaşıyordu.
  // Sağlıklı kampanyalara yüksek skorlu teklifler bağlanır (upsert: zaten varsa
  // skoru görünür seviyeye yükseltir, unique çakışması olmaz).
  let guaranteedOffers = 0;
  for (let s = 0; s < SUBSCRIBER_IDS.length; s++) {
    const subscriberId = SUBSCRIBER_IDS[s];
    for (let k = 0; k < 2; k++) {
      const campaignId = healthyCampaignIds[(s * 2 + k) % healthyCampaignIds.length];
      const score = Math.round((0.7 + ((s + k) % 3) * 0.06) * 1000) / 1000; // 0.70 - 0.82
      await prisma.subscriberOffer.upsert({
        where: { campaignId_subscriberId: { campaignId, subscriberId } },
        create: { campaignId, subscriberId, score, conversionProbability: score },
        update: { score, conversionProbability: score },
      });
      guaranteedOffers += 1;
    }
  }

  const year = new Date().getFullYear();
  await prisma.campaignSequence.upsert({
    where: { year },
    create: { year, lastNumber: seq },
    update: { lastNumber: seq },
  });

  console.log(
    `Campaign Service demo verisi yüklendi: ${CAMPAIGN_TITLES.length} kampanya (${caseCount} optimizasyon vakası açık, ${healthyCount} sağlıklı/vaka açılmamış), ${guaranteedOffers} garanti görünür abone teklifi.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
