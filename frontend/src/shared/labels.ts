export const BADGE_LABELS: Record<string, string> = {
  ILK_KAMPANYA: 'İlk Kampanya',
  HIZ_USTASI: 'Hız Ustası',
  DONUSUM_KRALI: 'Dönüşüm Kralı',
  MARATONCU: 'Maratoncu',
  CHURN_AVCISI: 'Churn Avcısı',
  UZMAN: 'Uzman',
};

/** Rozet kazanma koşulları (case doc 6.2) - kilitli rozetlerde ipucu olarak gösterilir. */
export const BADGE_DESCRIPTIONS: Record<string, string> = {
  ILK_KAMPANYA: 'İlk optimizasyonu tamamla',
  HIZ_USTASI: '2 saatin altında 10 optimizasyon',
  DONUSUM_KRALI: '10 kampanyada dönüşüm hedefini aş',
  MARATONCU: 'Bir günde 20 optimizasyon',
  CHURN_AVCISI: '10 RISKLI_KAYIP vakasını kurtar',
  UZMAN: 'Tek segmentte 50 optimizasyon',
};

/** Rozet emojileri - görsel çeşitlilik için. */
export const BADGE_EMOJIS: Record<string, string> = {
  ILK_KAMPANYA: '🎯',
  HIZ_USTASI: '⚡',
  DONUSUM_KRALI: '👑',
  MARATONCU: '🏃',
  CHURN_AVCISI: '🛡️',
  UZMAN: '🎓',
};

/** Tüm rozetlerin sabit sırası (kilitli/açık gösterimi için). */
export const ALL_BADGE_CODES = ['ILK_KAMPANYA', 'HIZ_USTASI', 'DONUSUM_KRALI', 'MARATONCU', 'CHURN_AVCISI', 'UZMAN'] as const;

export const LEVEL_LABELS: Record<string, string> = {
  BRONZ: 'Bronz',
  GUMUS: 'Gümüş',
  ALTIN: 'Altın',
  PLATIN: 'Platin',
};

export const SEGMENT_LABELS: Record<string, string> = {
  YUKSEK_DEGER: 'Yüksek Değer',
  RISKLI_KAYIP: 'Riskli Kayıp',
  YENI_ABONE: 'Yeni Abone',
  PASIF: 'Pasif',
  BELIRSIZ: 'Belirsiz',
};

/**
 * Personel "uzmanlık alanı" aslında hangi ABONE SEGMENTİ türündeki vakalara
 * baktığını belirtir (case doc 5.3: uzman_eslesme formülü, örn. "churn
 * önleme uzmanı" = RISKLI_KAYIP vakalarına bakan uzman). SEGMENT_LABELS ile
 * aynı anahtarları kullanır ama personel bağlamında okunduğunda kafa
 * karıştırmaması için "... Vakaları" ekiyle gösterilir.
 */
export const EXPERT_SPECIALTY_LABELS: Record<string, string> = {
  YUKSEK_DEGER: 'Yüksek Değer Vakaları',
  RISKLI_KAYIP: 'Riskli Kayıp (Churn) Vakaları',
  YENI_ABONE: 'Yeni Abone Vakaları',
  PASIF: 'Pasif Abone Vakaları',
  BELIRSIZ: 'Belirsiz Segment Vakaları',
};

export const PRIORITY_LABELS: Record<string, string> = {
  DUSUK: 'Düşük',
  ORTA: 'Orta',
  YUKSEK: 'Yüksek',
  KRITIK: 'Kritik',
};

export const STATUS_LABELS: Record<string, string> = {
  YENI: 'Yeni',
  ATANDI: 'Atandı',
  OPTIMIZE_EDILIYOR: 'Optimize Ediliyor',
  TEST_EDILIYOR: 'Test Ediliyor',
  TAMAMLANDI: 'Tamamlandı',
  YAYINDA: 'Yayında',
  ARSIVLENDI: 'Arşivlendi',
};

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  EK_PAKET: 'Ek Paket',
  TARIFE_YUKSELTME: 'Tarife Yükseltme',
  CIHAZ_FIRSATI: 'Cihaz Fırsatı',
  SADAKAT: 'Sadakat',
};

export const ROLE_LABELS: Record<string, string> = {
  SUBSCRIBER: 'Abone',
  PERSONEL: 'Kampanya Uzmanı',
  SUPERVISOR: 'Kampanya Yöneticisi',
  ADMIN: 'Admin',
};
