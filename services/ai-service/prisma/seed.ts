import { PrismaClient } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
