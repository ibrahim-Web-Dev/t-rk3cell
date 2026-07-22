import { PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';

const prisma = new PrismaClient();

const HOUR = 3_600_000;

interface CaseSeed {
  segment: 'YUKSEK_DEGER' | 'RISKLI_KAYIP' | 'YENI_ABONE' | 'PASIF' | 'BELIRSIZ';
  priority: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
  status: 'YENI' | 'ATANDI' | 'OPTIMIZE_EDILIYOR' | 'TEST_EDILIYOR' | 'TAMAMLANDI' | 'YAYINDA' | 'ARSIVLENDI';
  assignedExpertId?: string;
  assignmentScore?: number;
  conversionProbability: number | null;
  aiConfidence: number | null;
  wasAiClassified: boolean;
  optimizationNote?: string;
  conversionLift?: number;
  abTestStartedAt?: Date;
  slaAgeHours: number;
  slaHours: number;
  completedHoursAgo?: number;
}

interface CampaignSeed {
  campaignNumber: string;
  title: string;
  type: 'EK_PAKET' | 'TARIFE_YUKSELTME' | 'CIHAZ_FIRSATI' | 'SADAKAT';
  targetSegmentHint?: CaseSeed['segment'];
  discountRate: number;
  validUntilDays: number;
  createdBy: string;
  /** Kampanyanın kalıcı AI sınıflandırma kaydı - vaka açılsın açılmasın her zaman tutulur. */
  aiConversionProbability: number | null;
  /** null ise bu kampanya "sağlıklı" kabul edilip vaka açılmaz (bkz. README "Vaka Açma Eşiği"). */
  case: CaseSeed | null;
  offer?: { score: number; conversionProbability: number; response?: 'KABUL' | 'ILGILENMIYORUM'; stars?: number };
}

const now = Date.now();

const CAMPAIGNS: CampaignSeed[] = [
  {
    campaignNumber: 'CMP-2026-000001',
    title: 'Süper Online Ek 10GB Paketi',
    type: 'EK_PAKET',
    targetSegmentHint: 'YENI_ABONE',
    discountRate: 20,
    validUntilDays: 60,
    createdBy: DEMO_SEED_IDS.EXPERT_2,
    aiConversionProbability: 0.35,
    case: {
      segment: 'YENI_ABONE',
      priority: 'ORTA',
      status: 'TAMAMLANDI',
      assignedExpertId: DEMO_SEED_IDS.EXPERT_2,
      assignmentScore: 0.86,
      conversionProbability: 0.35,
      aiConfidence: 0.78,
      wasAiClassified: true,
      optimizationNote: 'Segment yeniden hedeflendi, indirim oranı %5 artırıldı.',
      conversionLift: 0.22,
      slaAgeHours: 20,
      slaHours: 24,
      completedHoursAgo: 2,
    },
    offer: { score: 0.82, conversionProbability: 0.7, response: 'KABUL', stars: 5 },
  },
  {
    campaignNumber: 'CMP-2026-000002',
    title: 'Turkcell Platinum Sadakat Programı',
    type: 'SADAKAT',
    targetSegmentHint: 'RISKLI_KAYIP',
    discountRate: 15,
    validUntilDays: 45,
    createdBy: DEMO_SEED_IDS.EXPERT_1,
    aiConversionProbability: 0.28,
    case: {
      segment: 'RISKLI_KAYIP',
      priority: 'YUKSEK', // case doc 4.3: RISKLI_KAYIP dönüşüm skorundan bağımsız minimum YUKSEK
      status: 'OPTIMIZE_EDILIYOR',
      assignedExpertId: DEMO_SEED_IDS.EXPERT_1,
      assignmentScore: 0.91,
      conversionProbability: 0.28,
      aiConfidence: 0.81,
      wasAiClassified: true,
      slaAgeHours: 3,
      slaHours: 8,
    },
  },
  {
    campaignNumber: 'CMP-2026-000003',
    title: '5G Hazır Cihaz Kampanyası',
    type: 'CIHAZ_FIRSATI',
    targetSegmentHint: 'YUKSEK_DEGER',
    discountRate: 30,
    validUntilDays: 90,
    createdBy: DEMO_SEED_IDS.EXPERT_2,
    aiConversionProbability: 0.38,
    case: {
      segment: 'YUKSEK_DEGER',
      priority: 'YUKSEK',
      status: 'YAYINDA',
      assignedExpertId: DEMO_SEED_IDS.EXPERT_2,
      assignmentScore: 0.88,
      conversionProbability: 0.38,
      aiConfidence: 0.9,
      wasAiClassified: true,
      optimizationNote: 'A/B testi sonrası indirim oranı optimize edildi.',
      conversionLift: 0.31,
      slaAgeHours: 40,
      slaHours: 8,
      completedHoursAgo: 18,
    },
    offer: { score: 0.91, conversionProbability: 0.8 },
  },
  {
    campaignNumber: 'CMP-2026-000004',
    title: 'Öğrenci Tarife Yükseltme Fırsatı',
    type: 'TARIFE_YUKSELTME',
    targetSegmentHint: 'PASIF',
    discountRate: 10,
    validUntilDays: 30,
    createdBy: DEMO_SEED_IDS.EXPERT_3,
    aiConversionProbability: 0.32,
    case: {
      segment: 'PASIF',
      priority: 'DUSUK',
      status: 'ATANDI',
      assignedExpertId: DEMO_SEED_IDS.EXPERT_3,
      assignmentScore: 0.72,
      conversionProbability: 0.32,
      aiConfidence: 0.68,
      wasAiClassified: true,
      slaAgeHours: 1,
      slaHours: 72,
    },
  },
  {
    campaignNumber: 'CMP-2026-000005',
    title: 'Aile Hattı Ek Paket Fırsatı',
    type: 'EK_PAKET',
    discountRate: 25,
    validUntilDays: 20,
    createdBy: DEMO_SEED_IDS.EXPERT_1,
    aiConversionProbability: null, // AI Service o an erişilemezdi (case doc 2.2 fallback demosu)
    case: {
      segment: 'BELIRSIZ',
      priority: 'ORTA',
      status: 'YENI',
      conversionProbability: null,
      aiConfidence: null,
      wasAiClassified: false,
      slaAgeHours: 0.5,
      slaHours: 24,
    },
  },
  {
    campaignNumber: 'CMP-2026-000006',
    title: 'Sosyal Medya Ek Paketi',
    type: 'EK_PAKET',
    targetSegmentHint: 'PASIF',
    discountRate: 12,
    validUntilDays: 25,
    createdBy: DEMO_SEED_IDS.EXPERT_3,
    aiConversionProbability: 0.3,
    case: {
      segment: 'PASIF',
      priority: 'DUSUK',
      status: 'TEST_EDILIYOR',
      assignedExpertId: DEMO_SEED_IDS.EXPERT_3,
      assignmentScore: 0.69,
      conversionProbability: 0.3,
      aiConfidence: 0.66,
      wasAiClassified: true,
      abTestStartedAt: new Date(now - 4 * HOUR),
      slaAgeHours: 10,
      slaHours: 72,
    },
  },
  {
    campaignNumber: 'CMP-2026-000007',
    title: 'Kış Kampanyası Cihaz Taksit Fırsatı',
    type: 'CIHAZ_FIRSATI',
    targetSegmentHint: 'YUKSEK_DEGER',
    discountRate: 22,
    validUntilDays: 5,
    createdBy: DEMO_SEED_IDS.EXPERT_2,
    aiConversionProbability: 0.25,
    case: {
      segment: 'YUKSEK_DEGER',
      priority: 'YUKSEK',
      status: 'ARSIVLENDI',
      assignedExpertId: DEMO_SEED_IDS.EXPERT_2,
      assignmentScore: 0.84,
      conversionProbability: 0.25,
      aiConfidence: 0.87,
      wasAiClassified: true,
      optimizationNote: 'Kampanya süresi doldu, sonuçlar arşivlendi.',
      conversionLift: 0.19,
      slaAgeHours: 200,
      slaHours: 8,
      completedHoursAgo: 190,
    },
  },
  {
    campaignNumber: 'CMP-2026-000008',
    title: 'Yaz Tatili Roaming Paketi',
    type: 'EK_PAKET',
    targetSegmentHint: 'YENI_ABONE',
    discountRate: 15,
    validUntilDays: 40,
    createdBy: DEMO_SEED_IDS.EXPERT_2,
    aiConversionProbability: 0.68, // eşiğin (0.40) üzerinde -> sağlıklı, vaka açılmadı
    case: null,
    offer: { score: 0.75, conversionProbability: 0.68 },
  },
  {
    campaignNumber: 'CMP-2026-000009',
    title: 'Kurumsal Hat Yükseltme Kampanyası',
    type: 'TARIFE_YUKSELTME',
    targetSegmentHint: 'YUKSEK_DEGER',
    discountRate: 18,
    validUntilDays: 50,
    createdBy: DEMO_SEED_IDS.EXPERT_1,
    aiConversionProbability: 0.72,
    case: null,
  },
  {
    campaignNumber: 'CMP-2026-000010',
    title: 'Genç Hat Ek Dakika Paketi',
    type: 'EK_PAKET',
    targetSegmentHint: 'YENI_ABONE',
    discountRate: 10,
    validUntilDays: 35,
    createdBy: DEMO_SEED_IDS.EXPERT_3,
    aiConversionProbability: 0.61,
    case: null,
  },
];

async function main() {
  const existing = await prisma.campaign.count();
  if (existing > 0) {
    console.log('Campaign Service: demo verisi zaten mevcut, atlanıyor.');
    return;
  }

  for (const c of CAMPAIGNS) {
    const campaign = await prisma.campaign.create({
      data: {
        campaignNumber: c.campaignNumber,
        title: c.title,
        type: c.type,
        targetSegmentHint: c.targetSegmentHint,
        discountRate: c.discountRate,
        validUntil: new Date(now + c.validUntilDays * 24 * HOUR),
        createdBy: c.createdBy,
        aiSegment: c.case?.segment ?? c.targetSegmentHint ?? null,
        aiPriority: c.case?.priority ?? 'ORTA',
        aiConfidence: c.case?.aiConfidence ?? 0.7,
        aiConversionProbability: c.aiConversionProbability,
        wasAiClassified: c.aiConversionProbability !== null,
      },
    });

    if (c.case) {
      await prisma.optimizationCase.create({
        data: {
          campaignId: campaign.id,
          segment: c.case.segment,
          priority: c.case.priority,
          status: c.case.status,
          assignedExpertId: c.case.assignedExpertId,
          assignmentScore: c.case.assignmentScore,
          conversionProbability: c.case.conversionProbability,
          aiConfidence: c.case.aiConfidence,
          wasAiClassified: c.case.wasAiClassified,
          optimizationNote: c.case.optimizationNote,
          conversionLift: c.case.conversionLift,
          abTestStartedAt: c.case.abTestStartedAt,
          slaStartedAt: new Date(now - c.case.slaAgeHours * HOUR),
          slaDueAt: new Date(now - c.case.slaAgeHours * HOUR + c.case.slaHours * HOUR),
          completedAt: c.case.completedHoursAgo != null ? new Date(now - c.case.completedHoursAgo * HOUR) : undefined,
        },
      });
    }

    if (c.offer) {
      await prisma.subscriberOffer.create({
        data: {
          campaignId: campaign.id,
          subscriberId: DEMO_SEED_IDS.SUBSCRIBER_1,
          score: c.offer.score,
          conversionProbability: c.offer.conversionProbability,
          response: c.offer.response,
          respondedAt: c.offer.response ? new Date(now - 3 * HOUR) : undefined,
          satisfactionStars: c.offer.stars,
          satisfactionRatedAt: c.offer.stars ? new Date(now - 2.5 * HOUR) : undefined,
        },
      });
    }
  }

  // Seed campaigns use hardcoded campaignNumber strings (not the real
  // generateCampaignNumber() sequence), so the CampaignSequence counter must
  // be advanced manually here - otherwise the next LIVE campaign created
  // through the API would collide with a seeded number (both starting at
  // ...000001) and fail with a unique constraint error.
  const year = new Date().getFullYear();
  await prisma.campaignSequence.upsert({
    where: { year },
    create: { year, lastNumber: CAMPAIGNS.length },
    update: { lastNumber: CAMPAIGNS.length },
  });

  const withCase = CAMPAIGNS.filter((c) => c.case).length;
  const healthy = CAMPAIGNS.length - withCase;
  console.log(
    `Campaign Service demo verisi yüklendi: ${CAMPAIGNS.length} kampanya (${withCase} optimizasyon vakası açık, ${healthy} sağlıklı/vaka açılmamış).`,
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
