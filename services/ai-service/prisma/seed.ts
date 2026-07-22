import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Prisma, PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';

interface TelemetrySeedRow {
  demoKey: keyof typeof DEMO_SEED_IDS;
  aboneId: string;
  crmSegmenti: string;
  actualChurn: number;
  features: Record<string, unknown>;
}

const prisma = new PrismaClient();

const EXPERTS = [
  { id: DEMO_SEED_IDS.EXPERT_1, specialties: ['RISKLI_KAYIP'], regions: ['MARMARA'] },
  { id: DEMO_SEED_IDS.EXPERT_2, specialties: ['YUKSEK_DEGER', 'YENI_ABONE'], regions: ['EGE'] },
  { id: DEMO_SEED_IDS.EXPERT_3, specialties: ['PASIF', 'BELIRSIZ'], regions: ['IC_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_4, specialties: ['RISKLI_KAYIP', 'YUKSEK_DEGER'], regions: ['MARMARA'] },
  { id: DEMO_SEED_IDS.EXPERT_5, specialties: ['YENI_ABONE'], regions: ['AKDENIZ'] },
  { id: DEMO_SEED_IDS.EXPERT_6, specialties: ['PASIF'], regions: ['KARADENIZ'] },
  { id: DEMO_SEED_IDS.EXPERT_7, specialties: ['RISKLI_KAYIP'], regions: ['EGE'] },
  { id: DEMO_SEED_IDS.EXPERT_8, specialties: ['YUKSEK_DEGER'], regions: ['MARMARA'] },
  { id: DEMO_SEED_IDS.EXPERT_9, specialties: ['YENI_ABONE', 'PASIF'], regions: ['IC_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_10, specialties: ['BELIRSIZ', 'PASIF'], regions: ['DOGU_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_11, specialties: ['RISKLI_KAYIP'], regions: ['GUNEYDOGU_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_12, specialties: ['YUKSEK_DEGER', 'YENI_ABONE'], regions: ['AKDENIZ'] },
];

/**
 * Pre-populates the expert read-model cache with the same demo experts
 * Identity Service seeds. In steady-state this cache is built purely from
 * staff.created/updated events - this seed just avoids an empty cache on a
 * completely fresh demo environment before any event has ever been published.
 */
async function main() {
  for (const expert of EXPERTS) {
    await prisma.expertProfile.upsert({
      where: { userId: expert.id },
      update: {},
      create: { userId: expert.id, specialties: expert.specialties, regions: expert.regions },
    });
  }

  console.log(`AI Service uzman read-model cache dolduruldu (${EXPERTS.length} demo uzman).`);

  // MlScoringStrategy'nin gerçek churn modelini besleyebilmesi için demo
  // abonelere gerçek turkcell_sahte_veri.csv satırlarından alınmış telemetri
  // (bkz. services/ai-service/ml/training/) - subscriber-telemetry-seed.json
  // extraction script'i tek seferlik çalıştırılıp bu dosyaya yazılmıştır.
  const telemetryPath = join(__dirname, 'subscriber-telemetry-seed.json');
  const telemetryRows: TelemetrySeedRow[] = JSON.parse(readFileSync(telemetryPath, 'utf-8'));

  for (const row of telemetryRows) {
    const subscriberId = DEMO_SEED_IDS[row.demoKey];
    await prisma.subscriberTelemetry.upsert({
      where: { subscriberId },
      update: {},
      create: {
        subscriberId,
        features: row.features as Prisma.InputJsonValue,
        crmSegmenti: row.crmSegmenti,
        actualChurn: row.actualChurn,
      },
    });
  }

  console.log(`AI Service abone telemetri read-model'i dolduruldu (${telemetryRows.length} demo abone).`);

  await seedSegmentPredictions();
}

/**
 * Süpervizör dashboard'undaki "AI doğruluk oranı" (case doc 5.4) demo başında
 * boş görünmesin diye gerçekçi bir SegmentPrediction geçmişi üretir: her segment
 * için farklı isabet oranları + bir kısmı uzman/süpervizör tarafından override
 * edilmiş (isCorrect=false) kayıtlar. Bunlar canlı /ai/classify çağrılarıyla da
 * aynı tabloya yazılır; seed yalnızca demoyu dolu başlatmak içindir.
 *
 * campaignId gerçek bir kampanyaya bağlı OLMAK ZORUNDA DEĞİL - doğruluk metriği
 * sadece bu tablodaki isCorrect değerlerini segment bazında sayar (AI Service
 * başka servisin DB'sine bakmaz). Sentetik UUID'ler kullanılır.
 */
async function seedSegmentPredictions() {
  const existing = await prisma.segmentPrediction.count();
  if (existing > 0) {
    console.log('AI Service: segment tahmin geçmişi zaten mevcut, atlanıyor.');
    return;
  }

  // [segment, toplam tahmin, override (yanlış) sayısı] - gerçekçi, değişken isabet.
  const PLAN: Array<[string, number, number]> = [
    ['YUKSEK_DEGER', 12, 1], // ~%92
    ['RISKLI_KAYIP', 10, 2], // %80
    ['YENI_ABONE', 9, 1], //   ~%89
    ['PASIF', 8, 2], //        %75
    ['BELIRSIZ', 6, 3], //     %50 (en zayıf kategori - dashboard'da öne çıkar)
  ];
  const PRIORITY_BY_SEGMENT: Record<string, string> = {
    YUKSEK_DEGER: 'YUKSEK',
    RISKLI_KAYIP: 'KRITIK',
    YENI_ABONE: 'ORTA',
    PASIF: 'DUSUK',
    BELIRSIZ: 'ORTA',
  };
  // Override edildiğinde düzeltilen segment (yanlış tahminin gerçek karşılığı).
  const CORRECTED_TO: Record<string, string> = {
    YUKSEK_DEGER: 'PASIF',
    RISKLI_KAYIP: 'YUKSEK_DEGER',
    YENI_ABONE: 'PASIF',
    PASIF: 'YENI_ABONE',
    BELIRSIZ: 'RISKLI_KAYIP',
  };
  const REVIEWERS = [DEMO_SEED_IDS.SUPERVISOR, DEMO_SEED_IDS.SUPERVISOR_2, DEMO_SEED_IDS.EXPERT_1];

  let created = 0;
  let overrides = 0;
  const now = Date.now();

  for (const [segment, total, wrong] of PLAN) {
    for (let i = 0; i < total; i++) {
      const isWrong = i < wrong;
      const createdAt = new Date(now - (created + 1) * 3_600_000); // saatlik geriye yay
      await prisma.segmentPrediction.create({
        data: {
          campaignId: randomUUID(),
          predictedSegment: segment as never,
          predictedPriority: PRIORITY_BY_SEGMENT[segment] as never,
          confidence: Math.round((0.62 + ((i * 7) % 30) / 100) * 1000) / 1000,
          isCorrect: isWrong ? false : true,
          correctedSegment: isWrong ? (CORRECTED_TO[segment] as never) : null,
          correctedBy: isWrong ? REVIEWERS[created % REVIEWERS.length] : null,
          correctedAt: isWrong ? new Date(createdAt.getTime() + 1_800_000) : null,
          createdAt,
        },
      });
      created += 1;
      if (isWrong) overrides += 1;
    }
  }

  console.log(`AI Service segment tahmin geçmişi yüklendi: ${created} tahmin (${overrides} override).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
