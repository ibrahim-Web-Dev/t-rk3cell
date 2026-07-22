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

async function upsertSubscriber(id: string, gsm: string, firstName: string, lastName: string) {
  return prisma.user.upsert({
    where: { gsm },
    update: {},
    create: { id, role: Role.SUBSCRIBER, gsm, firstName, lastName },
  });
}

const ADMINS = [
  { id: DEMO_SEED_IDS.ADMIN, email: 'admin@campaigncell.com', first: 'Can', last: 'Arslan' },
  { id: DEMO_SEED_IDS.ADMIN_2, email: 'admin2@campaigncell.com', first: 'Ayşe', last: 'Korkmaz' },
];

const SUPERVISORS = [
  { id: DEMO_SEED_IDS.SUPERVISOR, email: 'supervisor@campaigncell.com', first: 'Selin', last: 'Demir' },
  { id: DEMO_SEED_IDS.SUPERVISOR_2, email: 'supervisor2@campaigncell.com', first: 'Emre', last: 'Yıldız' },
  { id: DEMO_SEED_IDS.SUPERVISOR_3, email: 'supervisor3@campaigncell.com', first: 'Deniz', last: 'Aydın' },
];

const EXPERTS = [
  { id: DEMO_SEED_IDS.EXPERT_1, email: 'uzman1@campaigncell.com', first: 'Mehmet', last: 'Demir', specialties: ['RISKLI_KAYIP'], regions: ['MARMARA'] },
  { id: DEMO_SEED_IDS.EXPERT_2, email: 'uzman2@campaigncell.com', first: 'Zeynep', last: 'Kaya', specialties: ['YUKSEK_DEGER', 'YENI_ABONE'], regions: ['EGE'] },
  { id: DEMO_SEED_IDS.EXPERT_3, email: 'uzman3@campaigncell.com', first: 'Ali', last: 'Şahin', specialties: ['PASIF', 'BELIRSIZ'], regions: ['IC_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_4, email: 'uzman4@campaigncell.com', first: 'Elif', last: 'Çelik', specialties: ['RISKLI_KAYIP', 'YUKSEK_DEGER'], regions: ['MARMARA'] },
  { id: DEMO_SEED_IDS.EXPERT_5, email: 'uzman5@campaigncell.com', first: 'Burak', last: 'Aksoy', specialties: ['YENI_ABONE'], regions: ['AKDENIZ'] },
  { id: DEMO_SEED_IDS.EXPERT_6, email: 'uzman6@campaigncell.com', first: 'Merve', last: 'Yıldırım', specialties: ['PASIF'], regions: ['KARADENIZ'] },
  { id: DEMO_SEED_IDS.EXPERT_7, email: 'uzman7@campaigncell.com', first: 'Emre', last: 'Doğan', specialties: ['RISKLI_KAYIP'], regions: ['EGE'] },
  { id: DEMO_SEED_IDS.EXPERT_8, email: 'uzman8@campaigncell.com', first: 'Ceren', last: 'Arslan', specialties: ['YUKSEK_DEGER'], regions: ['MARMARA'] },
  { id: DEMO_SEED_IDS.EXPERT_9, email: 'uzman9@campaigncell.com', first: 'Kaan', last: 'Yılmaz', specialties: ['YENI_ABONE', 'PASIF'], regions: ['IC_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_10, email: 'uzman10@campaigncell.com', first: 'Gizem', last: 'Öztürk', specialties: ['BELIRSIZ', 'PASIF'], regions: ['DOGU_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_11, email: 'uzman11@campaigncell.com', first: 'Onur', last: 'Kara', specialties: ['RISKLI_KAYIP'], regions: ['GUNEYDOGU_ANADOLU'] },
  { id: DEMO_SEED_IDS.EXPERT_12, email: 'uzman12@campaigncell.com', first: 'Sude', last: 'Aydemir', specialties: ['YUKSEK_DEGER', 'YENI_ABONE'], regions: ['AKDENIZ'] },
];

const SUBSCRIBERS = [
  { id: DEMO_SEED_IDS.SUBSCRIBER_1, gsm: '5551234567', first: 'Ayşe', last: 'Yılmaz' },
  { id: DEMO_SEED_IDS.SUBSCRIBER_2, gsm: '5551234568', first: 'Mert', last: 'Kaplan' },
  { id: DEMO_SEED_IDS.SUBSCRIBER_3, gsm: '5551234569', first: 'Elif', last: 'Şahin' },
  { id: DEMO_SEED_IDS.SUBSCRIBER_4, gsm: '5551234570', first: 'Can', last: 'Öz' },
  { id: DEMO_SEED_IDS.SUBSCRIBER_5, gsm: '5551234571', first: 'Zeynep', last: 'Arslan' },
  { id: DEMO_SEED_IDS.SUBSCRIBER_6, gsm: '5551234572', first: 'Ahmet', last: 'Yıldız' },
];

async function main() {
  for (const a of ADMINS) await upsertStaff(a.id, a.email, Role.ADMIN, a.first, a.last, [], []);
  for (const s of SUPERVISORS) await upsertStaff(s.id, s.email, Role.SUPERVISOR, s.first, s.last, [], []);
  for (const e of EXPERTS) await upsertStaff(e.id, e.email, Role.PERSONEL, e.first, e.last, e.specialties, e.regions);
  for (const s of SUBSCRIBERS) await upsertSubscriber(s.id, s.gsm, s.first, s.last);

  console.log('Identity Service demo verisi yüklendi:');
  console.log(`  ${ADMINS.length} admin, ${SUPERVISORS.length} süpervizör, ${EXPERTS.length} uzman, ${SUBSCRIBERS.length} abone`);
  console.log('  Tüm personel şifresi: Password1!');
  console.log('  Örnek: admin@campaigncell.com, supervisor@campaigncell.com, uzman1@campaigncell.com');
  console.log('  Abone GSM örneği: 5551234567 (OTP: 1234)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
