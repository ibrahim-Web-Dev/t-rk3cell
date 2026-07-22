import { PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';
import Redis from 'ioredis';

const prisma = new PrismaClient();

interface DemoExpert {
  userId: string;
  totalPoints: number;
  completedCaseCount: number;
  fastCompletionCount: number;
  conversionExceedCount: number;
  riskliKayipRescueCount: number;
  primarySegment: string;
}

const DEMO_EXPERTS: DemoExpert[] = [
  { userId: DEMO_SEED_IDS.EXPERT_1, totalPoints: 145, completedCaseCount: 3, fastCompletionCount: 1, conversionExceedCount: 1, riskliKayipRescueCount: 3, primarySegment: 'RISKLI_KAYIP' },
  { userId: DEMO_SEED_IDS.EXPERT_2, totalPoints: 210, completedCaseCount: 4, fastCompletionCount: 2, conversionExceedCount: 2, riskliKayipRescueCount: 0, primarySegment: 'YENI_ABONE' },
  { userId: DEMO_SEED_IDS.EXPERT_3, totalPoints: 85, completedCaseCount: 2, fastCompletionCount: 1, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'PASIF' },
  { userId: DEMO_SEED_IDS.EXPERT_4, totalPoints: 320, completedCaseCount: 5, fastCompletionCount: 2, conversionExceedCount: 3, riskliKayipRescueCount: 2, primarySegment: 'RISKLI_KAYIP' },
  { userId: DEMO_SEED_IDS.EXPERT_5, totalPoints: 60, completedCaseCount: 1, fastCompletionCount: 0, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'YENI_ABONE' },
  { userId: DEMO_SEED_IDS.EXPERT_6, totalPoints: 95, completedCaseCount: 2, fastCompletionCount: 0, conversionExceedCount: 1, riskliKayipRescueCount: 0, primarySegment: 'PASIF' },
  { userId: DEMO_SEED_IDS.EXPERT_7, totalPoints: 275, completedCaseCount: 4, fastCompletionCount: 1, conversionExceedCount: 2, riskliKayipRescueCount: 4, primarySegment: 'RISKLI_KAYIP' },
  { userId: DEMO_SEED_IDS.EXPERT_8, totalPoints: 130, completedCaseCount: 3, fastCompletionCount: 1, conversionExceedCount: 1, riskliKayipRescueCount: 0, primarySegment: 'YUKSEK_DEGER' },
  { userId: DEMO_SEED_IDS.EXPERT_9, totalPoints: 45, completedCaseCount: 1, fastCompletionCount: 0, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'YENI_ABONE' },
  { userId: DEMO_SEED_IDS.EXPERT_10, totalPoints: 190, completedCaseCount: 3, fastCompletionCount: 1, conversionExceedCount: 1, riskliKayipRescueCount: 0, primarySegment: 'PASIF' },
  { userId: DEMO_SEED_IDS.EXPERT_11, totalPoints: 520, completedCaseCount: 6, fastCompletionCount: 3, conversionExceedCount: 4, riskliKayipRescueCount: 5, primarySegment: 'RISKLI_KAYIP' },
  { userId: DEMO_SEED_IDS.EXPERT_12, totalPoints: 70, completedCaseCount: 1, fastCompletionCount: 0, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'YUKSEK_DEGER' },
];

function levelFor(points: number): string {
  if (points >= 3000) return 'PLATIN';
  if (points >= 1500) return 'ALTIN';
  if (points >= 500) return 'GUMUS';
  return 'BRONZ';
}

async function main() {
  const existing = await prisma.userStats.count();
  if (existing > 0) {
    console.log('Gamification Service: demo verisi zaten mevcut, atlanıyor.');
    return;
  }

  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const today = new Date().toISOString().slice(0, 10);

  for (const expert of DEMO_EXPERTS) {
    await prisma.userStats.create({
      data: {
        userId: expert.userId,
        totalPoints: expert.totalPoints,
        level: levelFor(expert.totalPoints),
        completedCaseCount: expert.completedCaseCount,
        fastCompletionCount: expert.fastCompletionCount,
        conversionExceedCount: expert.conversionExceedCount,
        riskliKayipRescueCount: expert.riskliKayipRescueCount,
        dailyCompletionDate: today,
        dailyCompletionCount: Math.min(expert.completedCaseCount, 3),
        segmentCounts: { [expert.primarySegment]: expert.completedCaseCount },
      },
    });

    await prisma.pointsLedger.create({
      data: { userId: expert.userId, points: expert.totalPoints, reason: 'DEMO_SEED' },
    });

    // case doc 6.2: completedCaseCount >= 1 -> "İlk Kampanya" rozeti kazanılmış olur.
    if (expert.completedCaseCount >= 1) {
      await prisma.badge.create({ data: { userId: expert.userId, badgeCode: 'ILK_KAMPANYA' } });
    }

    await redis.zincrby(`leaderboard:daily:${today}`, expert.totalPoints, expert.userId);
    await redis.expire(`leaderboard:daily:${today}`, 60 * 60 * 24 * 8);
  }

  await redis.quit();
  console.log(`Gamification Service demo verisi yüklendi: ${DEMO_EXPERTS.length} uzman için puan/rozet/liderlik.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
