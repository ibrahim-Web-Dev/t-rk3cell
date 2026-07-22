import { PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';

const prisma = new PrismaClient();

/**
 * Pre-populates the expert read-model cache with the same demo experts
 * Identity Service seeds. In steady-state this cache is built purely from
 * staff.created/updated events - this seed just avoids an empty cache on a
 * completely fresh demo environment before any event has ever been published.
 */
async function main() {
  await prisma.expertProfile.upsert({
    where: { userId: DEMO_SEED_IDS.EXPERT_1 },
    update: {},
    create: { userId: DEMO_SEED_IDS.EXPERT_1, specialties: ['RISKLI_KAYIP'], regions: ['MARMARA'] },
  });
  await prisma.expertProfile.upsert({
    where: { userId: DEMO_SEED_IDS.EXPERT_2 },
    update: {},
    create: {
      userId: DEMO_SEED_IDS.EXPERT_2,
      specialties: ['YUKSEK_DEGER', 'YENI_ABONE'],
      regions: ['EGE'],
    },
  });
  await prisma.expertProfile.upsert({
    where: { userId: DEMO_SEED_IDS.EXPERT_3 },
    update: {},
    create: {
      userId: DEMO_SEED_IDS.EXPERT_3,
      specialties: ['PASIF', 'BELIRSIZ'],
      regions: ['IC_ANADOLU'],
    },
  });

  console.log('AI Service uzman read-model cache dolduruldu (3 demo uzman)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
