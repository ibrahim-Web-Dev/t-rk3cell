# CampaignCell — Canlı Demo Kılavuzu (Sunum Scripti)

> Case bölüm **11.2** (Kampanya Uzmanı akışı) + **11.3** (zorunlu uçtan uca senaryo) için adım adım sunum scripti. Her adımda: **ne yapılacak**, **nereye tıklanacak / hangi komut**, **jüriye ne söylenecek**. Aşağıdaki akışın tamamı canlı ortamda doğrulandı (puan 520 → 550, AI kapalıyken kampanya BELIRSIZ ile oluştu).
>
> UI öncelikli anlat; her adımın altında **yedek API komutu** var (UI takılırsa göstermek için).

## Demo Hesapları
| Rol | Giriş |
|---|---|
| Admin | `admin@campaigncell.com` / `Password1!` |
| Süpervizör | `supervisor@campaigncell.com` / `Password1!` |
| Kampanya Uzmanı | `uzman1@campaigncell.com` / `Password1!` (uzman1…uzman12) |
| Abone | GSM `5551234567`, OTP `1234` |

Adresler: Frontend **http://localhost:5173** · Gateway `http://localhost:3000/api/v1` · Swagger `:3001–:3004/docs` · RabbitMQ **http://localhost:15672** (guest/guest)

---

## ⏱️ Sunum öncesi (60 sn — jüri gelmeden)
```bash
docker compose up -d --build          # tüm sistem
docker compose exec identity-service npm run seed
docker compose exec ai-service npm run seed
docker compose exec gamification-service npm run seed
docker compose ps                      # hepsi "healthy" olmalı
```
> **Söyle:** "Tek komutla — `docker compose up` — 4 mikroservis, API Gateway, 4 ayrı veritabanı, Redis ve RabbitMQ ayağa kalkıyor. Her servisin kendi DB'si var; hiçbiri diğerinin veritabanına dokunmuyor."

---

## 🎬 11.3 Zorunlu Senaryo

### Adım 1 — Sistem ayakta
- **Göster:** `docker compose ps` → 13 konteyner `healthy`.
- **Söyle:** "Dört zorunlu servis + gateway + AI model sidecar'ı + altyapı. Mimari diyagram README'de."

### Adım 2 — Kampanya uzmanı kampanya oluşturur, segmente hedefler
- **UI:** `uzman1` ile giriş → **Yeni Kampanya** → 4 adımlı sihirbaz: başlık, tip **SADAKAT**, hedef segment **RISKLI_KAYIP**, indirim **%10**, geçerlilik → **Oluştur**.
- **Söyle:** "Kampanya bir segmente hedeflenince Campaign Service senkron olarak AI Service'i çağırıyor — case'in örneklediği tek senkron akış bu."
- **Yedek API:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/staff/login -H "Content-Type: application/json" \
  -d '{"email":"uzman1@campaigncell.com","password":"Password1!"}' | jq -r .data.accessToken)
curl -s -X POST http://localhost:3000/api/v1/campaigns -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo Sadakat","type":"SADAKAT","targetSegmentHint":"RISKLI_KAYIP","discountRate":10,"validUntil":"2027-01-01T00:00:00.000Z"}' | jq .data
```

### Adım 3 — AI'ın öneri skoru + segment + dönüşüm tahmini
- **Göster:** Oluşan kampanyanın kartında/detayında **AI segment = RISKLI_KAYIP**, **öncelik = YUKSEK**, **AI güven ≈ 0.85**, **dönüşüm olasılığı ≈ 0.29**.
- **Söyle:** "AI üç görevi yaptı: (1) öneri skorlama — gerçek eğitilmiş bir scikit-learn churn modeliyle, (2) segment sınıflandırma, (3) uzman ataması. Dönüşüm olasılığı %40 eşiğinin altında olduğu için bu kampanya bir **optimizasyon vakasına** dönüştü."
- **Vurgu (RISKLI_KAYIP kuralı):** "Case 4.3 gereği RISKLI_KAYIP her zaman en az YUKSEK öncelik alır — dönüşüm skorundan bağımsız bir iş kuralı."

### Adım 4 — Düşük performanslı segment doğru uzmana atandı
- **UI:** `supervisor` ile giriş → **Bekleyen Kuyruk** veya **Tüm Vakalar**. Vakanın **Onur Kara (uzman11)**'ya atandığını göster; **Uzman Ata** drawer'ını açıp AI öneri skorunu (formül: uzmanlık×0.5 + boşluk×0.3 + performans×0.2) göster.
- **Söyle:** "AI, RISKLI_KAYIP uzmanlığı olan, kapasitesi uygun uzmana **0.9** skorla otomatik atadı. Süpervizör istediğinde manuel de atayabilir — drawer'da her adayın kapasite bar'ı, performansı ve öneri skoru görünüyor."

### Adım 5 — Uzman optimizasyonu tamamlar
- **UI:** Atanan uzman (`uzman11`) ile giriş → **Vakalarım** (öncelik sıralı) → vakayı aç → AI içgörü + canlı SLA sayacı görünür → **Optimizasyona Başla** → **A/B Testi Başlat** → **Testi Sonuçlandır** → not yazıp **Tamamla**.
- **Söyle (state machine):** "Durum geçişleri bir state machine ile korunuyor — YENI→ATANDI→OPTIMIZE_EDILIYOR→TEST_EDILIYOR→...→TAMAMLANDI. Kural dışı geçiş 422 döner. Tamamlamada optimizasyon notu zorunlu."
- **Yedek API:** `.../start` → `.../start-test` → `.../complete-test` → `.../complete` (not zorunlu).

### Adım 6 — Puan liderlik tablosuna yansır
- **UI:** `uzman11` **Profilim** → toplam puan **+30** arttı (520→550: +10 tamamlama, +15 dönüşüm hedefi aşıldı, +5 hızlı), yeni rozet toast'ı, **Günlük/Haftalık liderlik** güncel.
- **Söyle:** "Gamification Service Campaign Service'i **hiç doğrudan çağırmıyor** — sadece `campaign.optimized` event'ini RabbitMQ'dan dinleyip puanı/rozeti/liderliği güncelliyor. Bildirim WebSocket ile anlık geldi."

### Adım 7 — Bir servisi kapat, sistem çalışmaya devam etsin ⭐ (jürinin en önemsediği)
```bash
docker compose stop ai-service
```
- **UI/Söyle:** "AI Service'i **kapattım**. Şimdi kampanya oluşturuyorum —" → `uzman1` ile yeni kampanya oluştur → **BELIRSIZ / ORTA** ile oluşur, manuel kuyruğa düşer, **kampanya oluşturma başarısız olmaz**. Login, kampanya listesi, liderlik hâlâ **200** döner.
- **Söyle:** "Servisler gerçekten bağımsız. AI çökse bile iş akmaya devam ediyor — case'in en kritik dayanıklılık şartı." Sonra geri getir:
```bash
docker compose start ai-service
```
- **Yedek kanıt komutu:**
```bash
docker compose stop ai-service
curl -s -X POST http://localhost:3000/api/v1/campaigns -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"AI Kapali","type":"EK_PAKET","targetSegmentHint":"YUKSEK_DEGER","discountRate":15,"validUntil":"2027-01-01T00:00:00.000Z"}' | jq '.data | {campaignNumber, wasAiClassified, aiSegment}'
docker compose start ai-service
```

### Adım 8 — Güvenlik testlerine hazır (case 10)
Jüri denerse, hepsi hazır — kısa göster:
```bash
# Yetkisiz erişim: müşteri/uzman token'ıyla admin endpoint -> 403
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/audit-logs -H "Authorization: Bearer $TOKEN"   # 403
# Token tamper -> 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/campaigns -H "Authorization: Bearer bozuk.jwt.token"  # 401
# SQLi denemesi (etkisiz - Prisma parametreli)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/v1/auth/staff/login \
  -H "Content-Type: application/json" -d "{\"email\":\"' OR 1=1 --\",\"password\":\"x\"}"   # 401
# Brute-force -> rate limit / hesap kilitleme
```
> **Söyle:** "SQLi → Prisma parametreli sorgular. IDOR → servis katmanında sahiplik kontrolü. JWT tamper/expiry → hem gateway hem her serviste imza doğrulama. Brute-force → gateway rate limit + 5 denemede hesap kilitleme. Yetkisiz her istek 403 ve **audit log**'a yazılıyor."

---

## 🎯 11.2 Kampanya Uzmanı Akışı (Adım 5'in detaylı hâli)
Ayrı ekranda göstermek istersen:
1. **Panele giriş** — `uzman1` → doğrudan **Vakalarım**.
2. **Atanan vakaları öncelik sıralı gör** — liste KRITIK→YUKSEK→... sıralı, SLA sayaçlı.
3. **Vakayı aç** — AI segment + dönüşüm tahmini + güven + Timeline (durum geçmişi) + canlı SLA.
4. **A/B testi yap** — Optimizasyona Başla → A/B Testi Başlat → dönüşüm sonucunu gir → Testi Sonuçlandır.
5. **Notla tamamla** — optimizasyon notu (zorunlu) → Tamamla.
6. **Puan ve rozet kazan** — Profilim'de puan artışı + rozet toast'ı.

---

## 💬 Mimari anlatımı (4 dk — jüri sorabilir)
- **Database-per-service:** 4 ayrı PostgreSQL (+ Redis). AI Service, diğer servislerin DB'sine bakmaz; uzman/telemetri bilgisini **RabbitMQ event'leriyle** kendi read-model'inde tutar.
- **Event-driven:** `campaign.optimized`, `case.assigned`, `subscriber.registered`, `campaign.segment_changed`, `sla.breached`... hepsi RabbitMQ topic exchange (`EVENTS.md`).
- **Gerçek AI:** Görev 1 eğitilmiş churn modeli (Python/FastAPI sidecar, `docs/AI_APPROACH.md`); telemetri yoksa/kapalıysa kural tabanlı fallback → mock/hardcoded değil.
- **Güvenlik (defense-in-depth):** Gateway JWT ön-doğrular; **her servis kendi JWT+RBAC'ını tekrar doğrular** — gateway atlanırsa bile korumalı.
- **Test/CI:** 49 unit + 13 uçtan uca test; GitHub Actions build+test+docker e2e.

## ⚠️ Sunum öncesi hatırlatma
- Deneme sırasında uzmanların rolünü değiştirdiysen **PERSONEL'e geri al** (Personel Yönetimi ekranı) — vaka tamamlama PERSONEL-only'dir. Temiz reset için: `docker compose down -v && docker compose up -d --build` + seed'ler.
