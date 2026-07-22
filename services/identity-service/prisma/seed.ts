import { PrismaClient, Role } from '../src/generated/prisma-client';
import { DEMO_SEED_IDS } from '@campaigncell/shared-types';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password1!';

async function upsertStaff(
  id: string,
  email: string,
  role: Role,
  firstName: string,
  lastName: string,
  specialties: string[],
  regions: string[],
) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { id, email, role, firstName, lastName, passwordHash, specialties, regions },
  });
}

async function main() {
  await upsertStaff(DEMO_SEED_IDS.ADMIN, 'admin@campaigncell.com', Role.ADMIN, 'Sistem', 'Yöneticisi', [], []);
  await upsertStaff(
    DEMO_SEED_IDS.SUPERVISOR,
    'supervisor@campaigncell.com',
    Role.SUPERVISOR,
    'Operasyon',
    'Yöneticisi',
    [],
    [],
  );
  await upsertStaff(
    DEMO_SEED_IDS.EXPERT_1,
    'uzman1@campaigncell.com',
    Role.PERSONEL,
    'Mehmet',
    'Demir',
    ['RISKLI_KAYIP'],
    ['MARMARA'],
  );
  await upsertStaff(
    DEMO_SEED_IDS.EXPERT_2,
    'uzman2@campaigncell.com',
    Role.PERSONEL,
    'Zeynep',
    'Kaya',
    ['YUKSEK_DEGER', 'YENI_ABONE'],
    ['EGE'],
  );
  await upsertStaff(
    DEMO_SEED_IDS.EXPERT_3,
    'uzman3@campaigncell.com',
    Role.PERSONEL,
    'Ali',
    'Şahin',
    ['PASIF', 'BELIRSIZ'],
    ['IC_ANADOLU'],
  );

  await prisma.user.upsert({
    where: { gsm: '5551234567' },
    update: {},
    create: { id: DEMO_SEED_IDS.SUBSCRIBER_1, role: Role.SUBSCRIBER, gsm: '5551234567', firstName: 'Ayşe', lastName: 'Yılmaz' },
  });

  console.log('Identity Service demo verisi yüklendi:');
  console.log('  admin@campaigncell.com / Password1!');
  console.log('  supervisor@campaigncell.com / Password1!');
  console.log('  uzman1@campaigncell.com / Password1! (RISKLI_KAYIP / MARMARA)');
  console.log('  uzman2@campaigncell.com / Password1! (YUKSEK_DEGER, YENI_ABONE / EGE)');
  console.log('  uzman3@campaigncell.com / Password1! (PASIF, BELIRSIZ / IC_ANADOLU)');
  console.log('  Abone GSM: 5551234567 (OTP: 1234)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
