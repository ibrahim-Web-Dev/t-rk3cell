# CampaignCell — Test & Değerlendirme Kontrol Listesi

> Turkcell CodeNight 2026 FINAL case'inde (CodeNight_FINAL_CampaignCell_Case.pdf) **test edilmesi/puanlanması gereken her madde** buraya çıkarıldı. Jüri değerlendirme + canlı güvenlik testi öncesi self-check olarak kullanın.
>
> **İşaretleme:**
> - `[x]` = uygulandı ve bu ortamda doğrulandı
> - `[ ]` = demo sırasında canlı/görsel doğrulanacak (veya henüz yok)
>
> Her maddenin sağında **nasıl test edilir** notu var. `TOKEN` almak için: `POST /api/v1/auth/staff/login` (admin@campaigncell.com / Password1!).

---

## 2. Mimari Gereksinimler

- [x] **En az 4 bağımsız mikroservis + 1 API Gateway** — `docker compose ps`: identity, campaign, ai, gamification, gateway (+ ai-ml-inference sidecar)
- [x] **Database-per-service** — her servis kendi PostgreSQL'i (identity/campaign/ai/gamification), hiçbiri diğerinin DB'sine bağlanmaz. Redis yalnız gamification'da. Doğrula: `docker compose ps` → 4 ayrı postgres konteyneri
- [x] **Servisler arası mesaj kuyruğu (bonus +5)** — RabbitMQ topic exchange (`campaigncell.events`). UI: http://localhost:15672 (guest/guest)
- [x] **Bağımsızlık: bir servis çökünce diğerleri çalışır** — `docker compose stop ai-service` → kampanya yine oluşturulur (segment BELIRSIZ, öncelik ORTA, manuel kuyruk). **Demo senaryosu 7. adım**
- [x] **`docker compose up` ile tüm sistem tek komutta ayağa kalkar** (zorunlu — diskalifiye şartı)
- [x] **Her servisin kendi README'si** (sorumluluk + endpoint listesi + env) — `services/*/README.md`, `gateway/README.md`

---

## 3. Identity Service

### 3.1 Kayıt & Giriş
- [x] **Müşteri kaydı: GSM + OTP (sabit 1234)** — `POST /auth/subscriber/otp/request` → `.../otp/verify`
- [x] **Kayıt alanları: ad, soyad, GSM, e-posta (opsiyonel)** — login ekranı "Yeni Hesap Oluştur"
- [x] **GSM biçim doğrulama** — `5XXXXXXXXX`, `05XXXXXXXXX`, `905...`, `+905...` kabul; hatalı → net mesaj
- [x] **E-posta biçim doğrulama** — maile benzemeyen değer → "Geçerli bir e-posta giriniz" (409/400)
- [x] **Aynı GSM ile 2. kez kayıt engellenir** — register + kayıtlı GSM → **409**
- [x] **Aynı e-posta ile 2. kayıt engellenir** — → **409** (500 değil)
- [x] **Kayıtsız GSM ile giriş → net hata + kayıt yönlendirme** — login + kayıtsız GSM → **404**, popup ile kayda geçiş
- [x] **Personel hesapları Admin tarafından oluşturulur** — `POST /users/staff` (yalnız ADMIN)
- [x] **Personel e-posta + şifre ile giriş yapar** — `POST /auth/staff/login`
- [x] **Uzmanlık/bölge alanları atanır (birden fazla seçilebilir)** — `specialties[]`, `regions[]`
- [x] **Şifre politikası: min 8 karakter, ≥1 büyük harf, ≥1 rakam, ≥1 özel karakter** — `common/password-policy.ts`
- [x] **İhlalde hangi kuralın ihlal edildiğini belirten net mesaj** — her ihlal ayrı cümle olarak döner
- [x] **Şifreler bcrypt/argon2 ile hash'lenir (düz metin/MD5/SHA1 kabul değil)** — bcryptjs, 12 round; DB'de `passwordHash`
- [x] **Hesap kilitleme: 5 başarısız giriş → 15 dk kilit** — 5. yanlış şifrede kilit
- [x] **Kilitli hesaba girişte kalan süre döner** — `423 Locked` + `remainingMinutes`

### 3.2 Token Yönetimi
- [x] **Access token JWT, 15 dk geçerli** — payload: `sub`, `role`, `specialties`, `regions`
- [x] **Payload'da user_id, rol, uzmanlık/bölge** — JWT decode ile doğrula
- [x] **Refresh token 7 gün, veritabanında saklanır** — DB'de SHA-256 hash'li
- [x] **Token rotation: refresh kullanılınca yeni üretilir, eski geçersiz olur**
- [x] **Reuse detection: geçersiz refresh tekrar kullanılırsa tüm oturumlar sonlandırılır** (token theft)
- [x] **Logout: refresh token geçersiz kılınır** — `POST /auth/logout`

### 3.3 Rol & Yetki Matrisi (endpoint seviyesinde, yetkisiz → 403 + audit)
- [x] **Kampanya oluşturma → PERSONEL** (case 3.3'teki "Müşteri" işareti dokümanın geri kalanıyla çelişiyor; README'de gerekçelendirildi)
- [x] **Kendi kayıtlarını görme** — Müşteri (kendi teklifleri), Personel (atanan vakalar), Süpervizör/Admin (tümü)
- [x] **Durum değiştirme → PERSONEL, SUPERVISOR** (state machine)
- [x] **Manuel atama → SUPERVISOR**
- [x] **Kategori/tür değiştirme (AI override) → PERSONEL, SUPERVISOR**
- [x] **Dashboard görüntüleme → SUPERVISOR, ADMIN**
- [x] **Personel hesabı oluşturma → ADMIN**
- [x] **Rol değiştirme → ADMIN** — `PATCH /users/:id/role`
- [x] **Audit log görüntüleme → ADMIN** — `GET /audit-logs`
- [x] **Yetkisiz erişim → 403 döner ve audit log'a yazılır** — PERSONEL token ile `/audit-logs` → 403

### 3.4 Audit Log (kaydedilmesi zorunlu olaylar)
- [x] **Başarılı ve başarısız giriş denemeleri**
- [x] **Hesap kilitlenmesi**
- [x] **Rol değişiklikleri** — `role-changed` (öncesi→sonrası)
- [x] **Yetkisiz erişim denemeleri (403)** — `AllExceptionsFilter` otomatik yayınlar
- [x] **Kampanya silme** — `campaign-deleted` (`DELETE /campaigns/:id`)
- [x] **Kritik durum değişiklikleri** — vaka tamamlama/yayınlama, segment override, öncelik değişikliği, manuel atama
- [x] **Her kayıtta: kim (user_id), ne (işlem), ne zaman (timestamp), nereden (IP), sonuç, detay** — `GET /audit-logs`'ta doğrula

---

## 4. Campaign Service

### 4.1 Kampanya Oluşturma
- [x] **Alanlar: başlık, tip (EK_PAKET/TARIFE_YUKSELTME/CIHAZ_FIRSATI/SADAKAT), hedef segment, indirim oranı, geçerlilik süresi**
- [x] **Segmente hedeflenince otomatik AI Service'e gider** — her abone için dönüşüm olasılığı + öneri skoru + segment
- [x] **AI erişilemezse kampanya yine oluşur (segment BELIRSIZ, öncelik ORTA, manuel kuyruk)**
- [x] **Kampanya numarası benzersiz + okunabilir (CMP-2026-000123)** — regex `CMP-\d{4}-\d{6}`

### 4.2 Optimizasyon Vakası State Machine (kural dışı geçiş → 422)
- [x] **Düşük dönüşümlü kampanyalar vakaya dönüşür** (eşik `CASE_CONVERSION_THRESHOLD`, README'de gerekçeli)
- [x] **YENI → ATANDI** (Sistem AI / Yönetici)
- [x] **ATANDI → OPTIMIZE_EDILIYOR** (Uzman)
- [x] **OPTIMIZE_EDILIYOR → TEST_EDILIYOR** (Uzman, A/B testi)
- [x] **TEST_EDILIYOR → OPTIMIZE_EDILIYOR** (Sistem, test sonuçlandı)
- [x] **OPTIMIZE_EDILIYOR → TAMAMLANDI** (Uzman, optimizasyon notu zorunlu — min 5 karakter)
- [x] **TAMAMLANDI → YAYINDA** (Yönetici)
- [x] **YAYINDA → ARSIVLENDI** (Sistem, geçerlilik doldu — cron)
- [x] **Kural dışı geçiş 422 döner** — örn. ATANDI → complete doğrudan → 422

### 4.3 Segment Türleri & Öncelik
- [x] **Türler: YUKSEK_DEGER, RISKLI_KAYIP, YENI_ABONE, PASIF, BELIRSIZ**
- [x] **Segment AI tarafından atanır; uzman/yönetici değiştirebilir** — `PATCH /cases/:id/segment`
- [x] **Segment değişince AI Service'e bildirilir (doğruluk metriği)** — `campaign.segment_changed` event
- [x] **Öncelik: DUSUK, ORTA, YUKSEK, KRITIK**
- [x] **RISKLI_KAYIP → minimum YUKSEK öncelik** (dönüşümden bağımsız kural)
- [x] **Yönetici önceliği manuel değiştirebilir** — `PATCH /cases/:id/priority`

### 4.4 SLA Kuralları
- [x] **KRITIK: 2 saat, aşımda kırmızı + panelde en üstte**
- [x] **YUKSEK: 8 saat, turuncu**
- [x] **ORTA: 24 saat, görsel uyarı**
- [x] **DUSUK: 72 saat, görsel uyarı**
- [x] **SLA vaka oluşturmadan başlar, tamamlanınca durur**
- [x] **Kalan SLA hem uzman hem yönetici ekranında görünür** — canlı sayaç (SlaCountdown)
- [x] **SLA aşımı arka plan işiyle tespit edilir** — dakikalık cron → `sla.breached` event

### 4.5 Abone Geri Bildirimi
- [x] **Aboneye kişiselleştirilmiş teklif (simülasyon, app içi)** — `/subscriber/offers`
- [x] **Abone Kabul / İlgilenmiyorum yanıtlar; dönüşüm verisine işlenir** — `PATCH /subscribers/offers/:id/respond`
- [x] **'İlgilenmiyorum' → benzer kampanyaların öneri skoru düşer** — `offer.responded` → AI `OfferFeedback`

### 4.6 Abone Memnuniyeti
- [x] **1-5 yıldız (alakasız teklif → düşük puan)** — `PATCH /subscribers/offers/:id/rate`
- [x] **Puanlama tek seferlik**
- [x] **Puan verilince Gamification'a event** — `satisfaction.rated` → düşük puan −3

---

## 5. AI Service (case'in kalbi — 3 görev de zorunlu)

### 5.1 Görev 1: Öneri Skorlama
- [x] **Girdi abone profili, çıktı öneri skoru (0.0-1.0) + dönüşüm olasılığı** — `POST /ai/recommend`
- [x] **Skor < 0.60 gösterilmez; > 0.80 öncelikli** — offer listesi `score >= 0.60` filtreli
- [x] **Gerçek yaklaşım (mock/hardcoded değil)** — eğitilmiş scikit-learn churn modeli (LogisticRegression, ROC-AUC ~0.75) + kural tabanlı fallback
- [x] **Kendi ML modeli: eğitim verisi + süreç README'de (bonus +8)** — `services/ai-service/ml/`, `docs/AI_APPROACH.md`
- [x] **Şeffaflık: `modelSource` (ml/rule_based)** — `GET /ai/recommend/stats`

### 5.2 Görev 2: Segment Sınıflandırma
- [x] **Çıktı: YUKSEK_DEGER/RISKLI_KAYIP/YENI_ABONE/PASIF** — `POST /ai/classify`
- [x] **RISKLI_KAYIP otomatik yüksek öncelik**
- [x] **Girdiye göre gerçekten değişen deterministik çıktı (sabit değil)**

### 5.3 Görev 3: Akıllı Uzman Ataması
- [x] **Formül: uzmanlik_eslesme×0.5 + bosluk_orani×0.3 + performans×0.2** — `assignment/assignment-scoring.ts`
- [x] **bosluk_orani = 1 − (aktif vaka / 10)**
- [x] **En yüksek skorlu uzmana atama** — Süpervizör "Bekleyen Kuyruk" drawer'ında da görünür
- [x] **Kapasite yoksa (≥10) kuyruğa alınır** — `queued: true`
- [x] **Yönetici manuel atama yapabilir** — `PATCH /cases/:id/assign`

### 5.4 Doğruluk Takibi
- [x] **Personel/süpervizör AI kategorisini değiştirince 'yanlış sınıflandırma' kaydedilir**
- [x] **Süpervizör dashboard: doğruluk oranı = doğru/toplam × 100** — `GET /ai/accuracy` (demo verisiyle ~%80 dolu gelir)
- [x] **Kategori bazlı kırılım (bonus +3)** — `GET /ai/accuracy/by-category` + override tablosu

---

## 6. Gamification Service (event ile tetiklenir, doğrudan çağrı değil)

### 6.1 Puan Tablosu
- [x] **Optimizasyon tamamlandı: +10**
- [x] **Hızlı optimizasyon (<2 saat): +5**
- [x] **Dönüşüm hedefi aşıldı: +15**
- [x] **KRITIK vaka SLA içinde tamamlandı: +15**
- [x] **SLA aşımı: −5**
- [x] **Abone düşük puan verdi (1-2 yıldız): −3**

### 6.2 Rozetler
- [x] **İlk Kampanya: ilk optimizasyon**
- [x] **Hız Ustası: 2 saatin altında 10 optimizasyon**
- [x] **Dönüşüm Kralı: 10 kampanyada hedef aşımı**
- [x] **Maratoncu: bir günde 20 optimizasyon**
- [x] **Churn Avcısı: 10 RISKLI_KAYIP kurtarma**
- [x] **Uzman: tek segmentte 50 optimizasyon**
- [x] **Kilitli/açık tüm rozetler gösterilir** — Profil sayfası rozet grid'i

### 6.3 Seviye Sistemi
- [x] **Bronz 0-499, Gümüş 500-1499, Altın 1500-2999, Platin 3000+**

### 6.4 Liderlik & Profil
- [x] **Günlük ve haftalık liderlik: ilk 10, puan sıralı** — `GET /game/leaderboard?period=daily|weekly` (ikisi de dolu)
- [x] **Gerçek zamanlı veya sayfa yenilemede güncel**
- [x] **Profil: toplam puan, seviye, rozetler, günlük/haftalık sıralama, çözülen vaka, ortalama puan**
- [x] **Rozet kazanılınca görsel bildirim (toast/modal) (bonus +2)** — WebSocket toast

---

## 7. Süpervizör Dashboard (hepsi zorunlu)
- [x] **Kampanya dağılımı: segment bazlı pasta/bar grafik**
- [x] **Dönüşüm oranları ve trend**
- [x] **SLA uyum oranı + SLA aşmış aktif vakalar**
- [x] **AI doğruluk metriği**
- [x] **Uzman performansı: tamamlanan vaka, ortalama dönüşüm artışı, süre**
- [x] **Bekleyen optimizasyon kuyruğu: BELIRSIZ / kapasite bekleyen + manuel atama** — kapasite/performans önizlemeli drawer

---

## 8. API Tasarımı
- [x] **RESTful + standart response `{ success, data, error }`**
- [x] **Gateway routing: `/api/v1/auth/**`, `/campaigns/**`, `/ai/**`, `/game/**`**
- [x] **Swagger/OpenAPI (en az Campaign + AI)** — her serviste `/docs` (`:3001/docs` … `:3004/docs`)

---

## 9. Servisler Arası Event Akışı
- [x] **Event-driven tasarım** — RabbitMQ topic exchange
- [x] **`campaign.optimized` akışı** (tamamla → event → puan/rozet → bildirim)
- [x] **Diğer event'ler dokümante (EVENTS.md)** — campaign.created, segment_changed, offer.responded, sla.breached, subscriber.registered vb.

---

## 10. Güvenlik (JÜRİ CANLI TEST YAPACAK)
- [x] **SQL injection: form alanına `' OR 1=1 --`** — Prisma parametreli sorgu, etkisiz
- [x] **Yetkisiz endpoint: müşteri token'ıyla süpervizör endpoint'i → 403**
- [x] **IDOR: kayıt ID değiştirerek başkasının verisi** — servis katmanı sahiplik kontrolü (403)
- [x] **Token manipülasyonu: süresi dolmuş/değiştirilmiş JWT → 401** — gateway + her serviste imza doğrulama
- [x] **Geçersiz refresh token reuse → tüm oturumlar iptal**
- [x] **XSS: metin alanına `<script>`** — React auto-escape + backend input validation
- [x] **Brute-force: rate limit** — gateway (30/dk auth) + hesap kilitleme (5 deneme) + servis throttle
- [ ] **Jüri canlı testinde hepsini tek tek dene** — demo öncesi manuel geç

---

## 11. Zorunlu Demo Senaryosu (bölüm 11.3 — canlı gösterilmesi ZORUNLU)
- [ ] **1. `docker compose up` ile tüm sistem ayağa kalkar**
- [ ] **2. Kampanya uzmanı olarak kampanya oluştur + segmente hedefle**
- [ ] **3. AI öneri skoru + segment + dönüşüm tahmini atamasını göster**
- [ ] **4. Düşük performanslı segmentin doğru uzmana atandığını göster**
- [ ] **5. Uzman olarak optimizasyonu tamamla**
- [ ] **6. Puanın liderlik tablosuna yansımasını göster**
- [ ] **7. Bir servisi kapat (`docker stop`) → sistemin geri kalanı çalışıyor** *(jürinin en çok önem verdiği adım)*
- [ ] **8. Jüri güvenlik testlerine hazır ol**

> Not: 1-7 uçtan uca `e2e/` testleriyle otomatik doğrulanıyor (`npm run test:e2e`), ama sunumda **canlı** gösterilmeli.

---

## 12. Değerlendirme Kriterleri (100 puan) — self-değerlendirme
- [x] **Mimari ve Kod Kalitesi (25)** — DB-per-service, event tasarımı, gateway, temiz kod, anlamlı commit
- [x] **Fonksiyonellik (25)** — 4 servisin zorunlu özellikleri, AI 3 görev, state machine, gamification, edge case'ler
- [x] **Güvenlik (15)** — token rotation, rol matrisi, audit, rate limit
- [x] **UI/UX (10)** — görsel tutarlılık, responsive, loading/error/empty state
- [x] **Test ve Dokümantasyon (10)** — unit + integration/e2e, Swagger, README'ler, EVENTS.md, AI_APPROACH.md
- [ ] **Sunum ve Canlı Demo (15)** — demo senaryosu + mimari anlatım + teknik kararların savunması *(sunumda)*

### Bonus (+20 tavan)
- [x] **Kendi ML modeli (+8)**
- [x] **Message queue (+5)** — RabbitMQ
- [x] **Kategori bazlı AI doğruluk (+3)**
- [x] **Gerçek zamanlı bildirim (+2)** — WebSocket
- [x] **CI/CD pipeline (+2)** — GitHub Actions (`.github/workflows/ci.yml`)

---

## 13. Diskalifiye Koşulları (bunların HİÇBİRİ olmamalı)
- [x] **Monolith DEĞİL** — 4 bağımsız servis + gateway
- [x] **`docker compose up` ile ayağa kalkıyor**
- [x] **AI mock/hardcoded DEĞİL** — girdiye göre değişen gerçek çıktı
- [x] **Servisler ortak DB paylaşmıyor**
- [x] **Proje build ediliyor** — `npm run build:all` + tüm imajlar

---

## 14. Teslimat
- [x] **GitHub repo, main branch çalışır, anlamlı commit geçmişi**
- [x] **Kök dizinde `docker-compose.yml` (tüm servisler + DB + gateway)**
- [x] **`.env.example` (kök + servis başına)**
- [x] **Ana README (genel bakış, mimari, kurulum + seed, demo kullanıcılar)**
- [x] **Servis başına README**
- [x] **EVENTS.md**
- [x] **AI yaklaşım dokümanı (yöntem, neden, nasıl + eğitim süreci)** — `docs/AI_APPROACH.md`
- [x] **Swagger/OpenAPI (en az Campaign + AI)**

---

### Hızlı doğrulama komutları
```bash
docker compose up -d --build
docker compose exec identity-service npm run seed
docker compose exec ai-service npm run seed
docker compose exec gamification-service npm run seed   # (ilk boot'ta otomatik de yüklenir)

npm run test:unit    # 49 unit test
npm run test:e2e     # 13 uçtan uca test (canlı yığına)
```
Frontend: http://localhost:5173 · Swagger: `:3001/docs` … `:3004/docs` · RabbitMQ: http://localhost:15672
