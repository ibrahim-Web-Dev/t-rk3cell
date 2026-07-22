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

// Puanlar bilinçli olarak 4 seviyeye yayıldı (Bronz/Gümüş/Altın/Platin) - böylece
// liderlik ve profil ekranlarında herkes Bronz görünmüyor. Sayaçlar puanla
// tutarlı; yüksek seviyeli uzmanlar rozet eşiklerini de aşıyor (aşağıda inline
// değerlendiriliyor).
const DEMO_EXPERTS: DemoExpert[] = [
  // PLATIN (3000+)
  { userId: DEMO_SEED_IDS.EXPERT_11, totalPoints: 3450, completedCaseCount: 58, fastCompletionCount: 14, conversionExceedCount: 12, riskliKayipRescueCount: 11, primarySegment: 'RISKLI_KAYIP' },
  // ALTIN (1500-2999)
  { userId: DEMO_SEED_IDS.EXPERT_4, totalPoints: 2100, completedCaseCount: 40, fastCompletionCount: 11, conversionExceedCount: 10, riskliKayipRescueCount: 6, primarySegment: 'RISKLI_KAYIP' },
  { userId: DEMO_SEED_IDS.EXPERT_7, totalPoints: 1650, completedCaseCount: 33, fastCompletionCount: 7, conversionExceedCount: 11, riskliKayipRescueCount: 12, primarySegment: 'RISKLI_KAYIP' },
  // GÜMÜŞ (500-1499)
  { userId: DEMO_SEED_IDS.EXPERT_2, totalPoints: 1180, completedCaseCount: 24, fastCompletionCount: 10, conversionExceedCount: 5, riskliKayipRescueCount: 0, primarySegment: 'YENI_ABONE' },
  { userId: DEMO_SEED_IDS.EXPERT_10, totalPoints: 890, completedCaseCount: 18, fastCompletionCount: 4, conversionExceedCount: 6, riskliKayipRescueCount: 0, primarySegment: 'PASIF' },
  { userId: DEMO_SEED_IDS.EXPERT_8, totalPoints: 640, completedCaseCount: 13, fastCompletionCount: 3, conversionExceedCount: 4, riskliKayipRescueCount: 0, primarySegment: 'YUKSEK_DEGER' },
  { userId: DEMO_SEED_IDS.EXPERT_1, totalPoints: 540, completedCaseCount: 11, fastCompletionCount: 2, conversionExceedCount: 3, riskliKayipRescueCount: 4, primarySegment: 'RISKLI_KAYIP' },
  // BRONZ (0-499)
  { userId: DEMO_SEED_IDS.EXPERT_12, totalPoints: 410, completedCaseCount: 8, fastCompletionCount: 2, conversionExceedCount: 2, riskliKayipRescueCount: 0, primarySegment: 'YUKSEK_DEGER' },
  { userId: DEMO_SEED_IDS.EXPERT_6, totalPoints: 290, completedCaseCount: 6, fastCompletionCount: 1, conversionExceedCount: 1, riskliKayipRescueCount: 0, primarySegment: 'PASIF' },
  { userId: DEMO_SEED_IDS.EXPERT_3, totalPoints: 180, completedCaseCount: 4, fastCompletionCount: 1, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'PASIF' },
  { userId: DEMO_SEED_IDS.EXPERT_5, totalPoints: 95, completedCaseCount: 2, fastCompletionCount: 0, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'YENI_ABONE' },
  { userId: DEMO_SEED_IDS.EXPERT_9, totalPoints: 45, completedCaseCount: 1, fastCompletionCount: 0, conversionExceedCount: 0, riskliKayipRescueCount: 0, primarySegment: 'YENI_ABONE' },
];

/** Rozet eşikleri (case doc 6.2) - seed'de her uzmanın hak ettiği tüm rozetleri vermek için. */
function earnedBadges(e: DemoExpert): string[] {
  const badges: string[] = [];
  if (e.completedCaseCount >= 1) badges.push('ILK_KAMPANYA');
  if (e.fastCompletionCount >= 10) badges.push('HIZ_USTASI');
  if (e.conversionExceedCount >= 10) badges.push('DONUSUM_KRALI');
  if (e.riskliKayipRescueCount >= 10) badges.push('CHURN_AVCISI');
  if (e.completedCaseCount >= 50) badges.push('UZMAN');
  // MARATONCU (bir günde 20) demo verisinde bilinçli olarak verilmez - grid'de
  // kilitli bir rozet kalması "kilitli/açık" gösterimini canlı tutar.
  return badges;
}

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

    // case doc 6.2: uzmanın hak ettiği tüm rozetleri ver (yüksek seviyeliler
    // birden fazla rozet taşır - profil rozet grid'i canlı görünsün).
    for (const badgeCode of earnedBadges(expert)) {
      await prisma.badge.create({ data: { userId: expert.userId, badgeCode } });
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
