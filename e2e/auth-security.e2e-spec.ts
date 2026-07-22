import { client, staffLogin, subscriberLogin, waitForGateway } from './helpers';

/**
 * Auth, RBAC ve güvenlik (case doc 3, 10) uçtan uca doğrulaması - çalışan
 * docker-compose yığınına gerçek HTTP istekleriyle.
 */
describe('Auth & Security (e2e)', () => {
  beforeAll(async () => {
    await waitForGateway();
  });

  it('personel geçerli kimlikle giriş yapabilir ve JWT alır', async () => {
    const token = await staffLogin('uzman1@campaigncell.com');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT: header.payload.signature
  });

  it('yanlış şifre 401 döner (kimlik sızdırmadan)', async () => {
    const res = await client().post('/auth/staff/login', {
      email: 'uzman1@campaigncell.com',
      password: 'WrongPass1!',
    });
    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
  });

  it('token olmadan korumalı endpoint 401 döner', async () => {
    const res = await client().get('/campaigns');
    expect(res.status).toBe(401);
  });

  it('RBAC: PERSONEL token ile ADMIN-only audit-log endpoint 403 döner', async () => {
    const expertToken = await staffLogin('uzman1@campaigncell.com');
    const res = await client(expertToken).get('/audit-logs');
    expect(res.status).toBe(403);
  });

  it('RBAC: PERSONEL, kampanya silemez (ADMIN-only) -> 403', async () => {
    const expertToken = await staffLogin('uzman1@campaigncell.com');
    const res = await client(expertToken).delete('/campaigns/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(403);
  });

  it('JWT tamper: imzası bozulmuş token 401 döner', async () => {
    const token = await staffLogin('uzman1@campaigncell.com');
    const tampered = token.slice(0, -3) + 'aaa';
    const res = await client(tampered).get('/campaigns');
    expect(res.status).toBe(401);
  });

  it('kayıtsız GSM ile giriş denemesi SMS öncesi 404 döner (net hata)', async () => {
    const res = await client().post('/auth/subscriber/otp/request', {
      gsm: '5510000099',
      intent: 'login',
    });
    expect(res.status).toBe(404);
  });

  it('aynı GSM ile ikinci kez kayıt engellenir (409)', async () => {
    // Geçerli 10 haneli Turkcell numarası: 5 + 9 rakam
    const gsm = `5${Math.floor(100000000 + Math.random() * 899999999)}`;
    // ilk kayıt
    await client().post('/auth/subscriber/otp/request', { gsm, intent: 'register' });
    const first = await client().post('/auth/subscriber/otp/verify', {
      gsm,
      code: '1234',
      intent: 'register',
      firstName: 'E2E',
      lastName: 'Test',
    });
    expect(first.status).toBeLessThan(300);
    // ikinci kayıt denemesi -> 409 (SMS öncesi request aşamasında)
    const second = await client().post('/auth/subscriber/otp/request', { gsm, intent: 'register' });
    expect(second.status).toBe(409);
  });

  it('abone kendi token ıyla giriş yapıp profil çekebilir', async () => {
    const token = await subscriberLogin('5551234567');
    const res = await client(token).get('/users/me');
    expect(res.status).toBe(200);
    expect(res.data.data.role).toBe('SUBSCRIBER');
  });
});
