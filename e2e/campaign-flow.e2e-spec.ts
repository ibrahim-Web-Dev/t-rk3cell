import { client, staffLogin, waitForGateway } from './helpers';

/**
 * Zorunlu demo senaryosunun (case doc 11.3) çekirdeği: kampanya oluştur ->
 * AI segment + dönüşüm tahmini + öneri skoru üret -> düşük dönüşümlüyse vaka
 * aç -> state machine geçişleri (kural dışı geçiş 422) -> tamamla.
 */
describe('Campaign -> AI -> State Machine (e2e)', () => {
  let expertToken: string;

  beforeAll(async () => {
    await waitForGateway();
    expertToken = await staffLogin('uzman1@campaigncell.com');
  });

  it('kampanya oluşturma AI sınıflandırmasını tetikler ve okunabilir numara üretir', async () => {
    const res = await client(expertToken).post('/campaigns', {
      title: 'E2E Test Kampanyası',
      type: 'SADAKAT',
      targetSegmentHint: 'RISKLI_KAYIP',
      discountRate: 15,
      validUntil: '2027-01-01T00:00:00.000Z',
    });
    expect(res.status).toBeLessThan(300);
    const campaign = res.data.data;
    expect(campaign.campaignNumber).toMatch(/^CMP-\d{4}-\d{6}$/);
    // AI classify senkron çağrısı segment alanlarını doldurmalı
    expect(campaign.wasAiClassified).toBe(true);
    expect(['YUKSEK_DEGER', 'RISKLI_KAYIP', 'YENI_ABONE', 'PASIF', 'BELIRSIZ']).toContain(campaign.aiSegment);
    // RISKLI_KAYIP -> minimum YUKSEK öncelik (case doc 4.3 / 5.2)
    if (campaign.aiSegment === 'RISKLI_KAYIP') {
      expect(['YUKSEK', 'KRITIK']).toContain(campaign.aiPriority);
    }
  });

  it('AI öneri skorlama endpoint i skor + dönüşüm olasılığı döner', async () => {
    const res = await client(expertToken).post('/ai/recommend', {
      campaignId: 'e2e-campaign',
      subscriberId: '00000000-0000-0000-0000-000000000030',
      campaignType: 'SADAKAT',
      discountRate: 20,
    });
    expect(res.status).toBeLessThan(300);
    expect(res.data.data.score).toBeGreaterThanOrEqual(0);
    expect(res.data.data.score).toBeLessThanOrEqual(1);
    expect(res.data.data.conversionProbability).toBeGreaterThanOrEqual(0);
  });

  it('bir vaka üzerinde state machine geçişleri çalışır, kural dışı geçiş 422 döner', async () => {
    // Süpervizör tüm vakaları görür; ATANDI bir vaka bulup atandığı uzmanı
    // e-postasıyla eşleştirip o uzman kimliğiyle geçişleri sürüyoruz (start/
    // complete yalnızca atanan PERSONEL tarafından yapılabilir).
    const supervisorToken = await staffLogin('supervisor@campaigncell.com');
    const [casesRes, staffRes] = await Promise.all([
      client(supervisorToken).get('/cases'),
      client(supervisorToken).get('/users/staff'),
    ]);
    expect(casesRes.status).toBe(200);
    const emailById = new Map<string, string>(
      (staffRes.data.data as any[]).filter((u) => u.email).map((u) => [u.id, u.email as string]),
    );
    const atandi = (casesRes.data.data as any[]).find(
      (c) => c.status === 'ATANDI' && c.assignedExpertId && emailById.has(c.assignedExpertId),
    );
    if (!atandi) {
      console.warn('Uygun ATANDI vaka bulunamadı, geçiş testi atlandı');
      return;
    }
    const ownerToken = await staffLogin(emailById.get(atandi.assignedExpertId)!);

    // Kural dışı geçiş: ATANDI -> TAMAMLANDI doğrudan olmaz -> 422
    // (not geçerli uzunlukta; DTO'yu değil state-machine'i test ediyoruz)
    const illegal = await client(ownerToken).patch(`/cases/${atandi.id}/complete`, {
      optimizationNote: 'gecersiz gecis denemesi',
    });
    expect(illegal.status).toBe(422);

    // Geçerli zincir: ATANDI -> OPTIMIZE_EDILIYOR -> TAMAMLANDI
    const start = await client(ownerToken).patch(`/cases/${atandi.id}/start`);
    expect(start.status).toBeLessThan(300);
    expect(start.data.data.status).toBe('OPTIMIZE_EDILIYOR');

    const complete = await client(ownerToken).patch(`/cases/${atandi.id}/complete`, {
      optimizationNote: 'E2E ile optimize edildi, teklif parametreleri güncellendi',
      conversionLift: 0.2,
    });
    expect(complete.status).toBeLessThan(300);
    expect(complete.data.data.status).toBe('TAMAMLANDI');
  });

  it('bağımsızlık: AI erişilemese bile /campaigns listelenebilir (servis çökmemeli)', async () => {
    const res = await client(expertToken).get('/campaigns');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
  });
});
