# CampaignCell — Turkcell Kişiselleştirilmiş Kampanya ve Öneri Platformu

Turkcell CodeNight 2026 Final case'i. Dört bağımsız mikroservis + API Gateway + React SPA, tamamı Docker Compose ile tek komutta ayağa kalkar.

## Mimari

```
                         ┌─────────────────┐
      Frontend ───────▶  │   API GATEWAY   │  (routing, rate limiting, JWT ön-doğrulama)
      (React SPA)        └────────┬────────┘
                ┌──────────┬───────┴────────┬────────────┐
                ▼          ▼                ▼            ▼
         ┌───────────┐┌───────────┐  ┌───────────┐┌────────────────┐
         │ Identity  ││ Campaign  │  │    AI     ││ Gamification   │
         │ Service   ││ Service   │  │  Service  ││ Service        │
         └─────┬─────┘└─────┬─────┘  └─────┬─────┘└───────┬────────┘
               ▼             ▼              ▼              ▼
         [identity_db] [campaign_db]    [ai_db]   [gamification_db + Redis]
               │             │              │              │
               └─────────────┴──────┬───────┴──────────────┘
                                    ▼
                        RabbitMQ (campaigncell.events)
```

- **Database-per-service**: her servis kendi PostgreSQL veritabanına sahiptir, hiçbiri bir başkasının veritabanına doğrudan erişmez.
- **Event-driven**: servisler arası bilgi akışının neredeyse tamamı RabbitMQ topic exchange üzerinden asenkron event'lerle yapılır (bkz. [`EVENTS.md`](EVENTS.md)). Tek istisna: Campaign Service'in kampanya oluşturma anında AI Service'i senkron REST ile çağırması (case dokümanı örneğiyle birebir uyumlu).
- **Bağımsızlık**: AI Service kapalıyken bile kampanya oluşturulabilir (segment: BELIRSIZ, öncelik: ORTA, manuel kuyruk). Bu, sistemin en kritik dayanıklılık garantisidir ve uçtan uca test edilmiştir.
- **Defense-in-depth güvenlik**: API Gateway JWT'yi ön-doğrular, ama **her servis kendi JWT + RBAC doğrulamasını bağımsız olarak tekrar yapar** — gateway atlanıp bir servise doğrudan istek atılsa bile korumasız kalmaz.

## Servisler

| Servis | Port | Sorumluluk | README |
|---|---|---|---|
| API Gateway | 3000 | Routing, rate limiting, JWT ön-doğrulama | [gateway/README.md](gateway/README.md) |
| Identity Service | 3001 | Kayıt/giriş, token yönetimi, RBAC, audit log | [services/identity-service/README.md](services/identity-service/README.md) |
| Campaign Service | 3002 | Kampanya yaşam döngüsü, state machine, SLA | [services/campaign-service/README.md](services/campaign-service/README.md) |
| AI Service | 3003 | Öneri skorlama, segmentasyon, uzman ataması | [services/ai-service/README.md](services/ai-service/README.md) |
| ↳ ai-ml-inference | *(iç ağ)* | Eğitilmiş churn modelini servis eden Python/FastAPI sidecar'ı — yalnızca AI Service'e açık, dışarıya kapalı | [services/ai-service/README.md](services/ai-service/README.md#ml-entegrasyonu-görev-1-gerçek-bir-eğitilmiş-modelle-çalışır-görev-2-kural-tabanlı-kalır) |
| Gamification Service | 3004 | Puan, rozet, seviye, liderlik (event-driven) | [services/gamification-service/README.md](services/gamification-service/README.md) |
| Frontend | 5173 | React SPA (rol bazlı: Abone/Uzman/Süpervizör/Admin) | [frontend/README.md](frontend/README.md) |

Diğer dokümanlar: [`EVENTS.md`](EVENTS.md) (tüm event şemaları), [`docs/AI_APPROACH.md`](docs/AI_APPROACH.md) (AI yaklaşımı, gerçek ML entegrasyonu ve ML'e geçiş rehberi).

## Kurulum ve Çalıştırma

```bash
cp .env.example .env   # opsiyonel — varsayılanlarla da çalışır
docker compose up --build
```

Tüm servisler ayağa kalktıktan sonra (yaklaşık 1-2 dakika) demo verilerini yükleyin:

```bash
docker compose exec identity-service npm run seed
docker compose exec ai-service npm run seed
```

Frontend: **http://localhost:5173**
API Gateway: **http://localhost:3000/api/v1**
Swagger (her servis kendi `/docs`'unda): `http://localhost:3001/docs`, `:3002/docs`, `:3003/docs`, `:3004/docs`
RabbitMQ yönetim paneli: **http://localhost:15672** (guest/guest)

### Demo Kullanıcılar

| Rol | Giriş | Şifre |
|---|---|---|
| Admin | admin@campaigncell.com | Password1! |
| Süpervizör | supervisor@campaigncell.com | Password1! |
| Kampanya Uzmanı (RISKLI_KAYIP / MARMARA) | uzman1@campaigncell.com | Password1! |
| Kampanya Uzmanı (YUKSEK_DEGER, YENI_ABONE / EGE) | uzman2@campaigncell.com | Password1! |
| Kampanya Uzmanı (PASIF, BELIRSIZ / IC_ANADOLU) | uzman3@campaigncell.com | Password1! |
| Abone | GSM: 5551234567 | OTP: 1234 (simülasyon) |

## Zorunlu Demo Senaryosu (bölüm 11.3) — Doğrulandı

Bu akış geliştirme sırasında gerçek Docker Compose ortamında uçtan uca test edilmiştir:

1. `docker compose up --build` ile tüm sistem ayağa kalkar ✅
2. Kampanya Uzmanı (uzman1) yeni kampanya oluşturur → AI otomatik classify+assign+recommend tetiklenir ✅
3. AI'ın öneri skoru + segment + dönüşüm tahmini ataması görünür ✅
4. Uygun uzmana (uzmanlık eşleşmesine göre, örn. YENI_ABONE → uzman2) otomatik atama yapılır ✅
5. Uzman optimizasyonu tamamlar (not zorunlu) ✅
6. Puan (+10/+5/+15 kuralları) ve rozet (İlk Kampanya) anında liderlik tablosuna yansır ✅
7. `docker stop <ai-service-container>` ile AI Service kapatılır, kampanya oluşturma yine çalışır (BELİRSİZ/ORTA fallback) — sistemin geri kalanı etkilenmez ✅

## Güvenlik Notları (bölüm 10)

| Senaryo | Önlem |
|---|---|
| SQL injection | Prisma parametreli sorgular, hiçbir yerde raw string concat yok |
| Yetkisiz endpoint erişimi | Her serviste `@Roles()` + global `RolesGuard`, 403 + otomatik audit log |
| IDOR | Servis katmanında sahiplik kontrolü (`req.user.sub` ile filtre) — örn. abone yalnızca kendi tekliflerine erişebilir |
| JWT manipülasyonu | Her servis kendi imzasını bağımsız doğrular (`JwtAuthGuard`), süresi dolmuş/değiştirilmiş token 401 |
| Refresh token reuse | Rotation + reuse detection: geçersiz kılınmış token tekrar kullanılırsa kullanıcının tüm oturumları sonlandırılır |
| XSS | React auto-escape + backend `class-validator` girdi doğrulama |
| Brute-force | Gateway'de `/api/v1/auth/**` için 10 istek/dakika limit + Identity Service'te 5 başarısız girişte 15 dakika hesap kilitleme |

## Monorepo Yapısı

```
turkcell/
├── docker-compose.yml
├── EVENTS.md
├── docs/AI_APPROACH.md
├── packages/
│   ├── shared-types/    # enum'lar, event payload tipleri (derleme zamanı, çalışma zamanı bağımlılığı yok)
│   ├── event-bus/       # RabbitMQ bağlantı/publish/subscribe sarmalayıcısı
│   ├── auth-kit/        # JWT guard, RBAC decorator/guard (her servis bağımsız kullanır)
│   └── common-kit/      # standart {success,data,error} response zarfı + global exception filter
├── gateway/              # API Gateway (hand-rolled Express reverse proxy)
├── services/
│   ├── identity-service/
│   ├── campaign-service/
│   ├── ai-service/
│   └── gamification-service/
└── frontend/             # React + Vite + TS SPA
```

`packages/*` içindeki paketler yalnızca **derleme zamanı** kod paylaşımıdır (npm workspaces symlink) — hiçbir servis, çalışma zamanında başka bir servisin sürecine veya veritabanına bağımlı değildir; her biri bağımsız build edilir, bağımsız container'da çalışır, bağımsız çökebilir.

## Bilinen Sınırlamalar (dürüstçe belirtilmiştir)

- AI Service'in öneri/segmentasyon mantığı kural tabanlıdır, gerçek eğitilmiş bir ML modeli değildir — bkz. [`docs/AI_APPROACH.md`](docs/AI_APPROACH.md) (nedenleri ve ML'e geçiş yolu detaylıca anlatılmıştır).
- Test kapsamı, iş mantığının kritik noktalarında (state machine, şifre politikası, token rotation, skorlama/sınıflandırma/atama formülleri) birim testleriyle sağlanmıştır; kapsamlı e2e/entegrasyon test paketi bu final sürümünde yoktur.
- Docker imajları optimize edilmemiştir (multi-stage/slim değildir) — öncelik, doğruluk ve mimari netliktir.
