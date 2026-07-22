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
  segmentCounts: Record<string, number>;
  badges: string[];
}

const DEMO_EXPERTS: DemoExpert[] = [
  {
    userId: DEMO_SEED_IDS.EXPERT_2,
    totalPoints: 145,
    completedCaseCount: 3,
    fastCompletionCount: 1,
    conversionExceedCount: 2,
    riskliKayipRescueCount: 0,
    segmentCounts: { YENI_ABONE: 2, YUKSEK_DEGER: 1 },
    badges: ['ILK_KAMPANYA'],
  },
  {
    userId: DEMO_SEED_IDS.EXPERT_1,
    totalPoints: 95,
    completedCaseCount: 2,
    fastCompletionCount: 0,
    conversionExceedCount: 1,
    riskliKayipRescueCount: 1,
    segmentCounts: { RISKLI_KAYIP: 2 },
    badges: ['ILK_KAMPANYA'],
  },
  {
    userId: DEMO_SEED_IDS.EXPERT_3,
    totalPoints: 30,
    completedCaseCount: 1,
    fastCompletionCount: 1,
    conversionExceedCount: 0,
    riskliKayipRescueCount: 0,
    segmentCounts: { PASIF: 1 },
    badges: ['ILK_KAMPANYA'],
  },
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
        dailyCompletionCount: expert.completedCaseCount,
        segmentCounts: expert.segmentCounts,
      },
    });

    await prisma.pointsLedger.create({
      data: { userId: expert.userId, points: expert.totalPoints, reason: 'DEMO_SEED' },
    });

    for (const badgeCode of expert.badges) {
      await prisma.badge.create({ data: { userId: expert.userId, badgeCode } });
    }

    await redis.zincrby(`leaderboard:daily:${today}`, expert.totalPoints, expert.userId);
    await redis.expire(`leaderboard:daily:${today}`, 60 * 60 * 24 * 8);
  }

  await redis.quit();
  console.log('Gamification Service demo verisi yüklendi: 3 uzman için puan/rozet/liderlik.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
