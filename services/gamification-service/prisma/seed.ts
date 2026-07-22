import { PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';
import Redis from 'ioredis';

const prisma = new PrismaClient();

/**
 * Haftalık liderlik anahtarı - RedisService.weeklyKey() ile BİREBİR aynı ISO
 * hafta biçimi (`leaderboard:weekly:YYYY-Www`) olmalı, aksi halde seed ettiğimiz
 * hafta ile servisin okuduğu hafta uyuşmaz ve tablo boş görünür.
 */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

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
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dailyLbKey = `leaderboard:daily:${today}`;
  const weeklyLbKey = `leaderboard:weekly:${isoWeekKey(now)}`;
  // Bugün kazanılan puan, hafta genelinin bir dilimi olarak modellenir - böylece
  // haftalık ≥ günlük olur ve iki tablo da tutarlı biçimde DOLU gelir (önceden
  // yalnızca günlük seed'leniyordu, haftalık tablo boş görünüyordu).
  const DAILY_FRACTIONS = [0.25, 0.4, 0.15, 0.5, 0.3, 0.2];

  let i = 0;
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

    // Haftalık = toplam puan; günlük = bugünün dilimi (haftalık ≥ günlük).
    const dailyPoints = Math.max(10, Math.round(expert.totalPoints * DAILY_FRACTIONS[i % DAILY_FRACTIONS.length]));
    await redis.zincrby(dailyLbKey, dailyPoints, expert.userId);
    await redis.zincrby(weeklyLbKey, expert.totalPoints, expert.userId);
    i += 1;
  }

  await redis.expire(dailyLbKey, 60 * 60 * 24 * 8);
  await redis.expire(weeklyLbKey, 60 * 60 * 24 * 15);

  await redis.quit();
  console.log(`Gamification Service demo verisi yüklendi: ${DEMO_EXPERTS.length} uzman için puan/rozet/günlük+haftalık liderlik.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
