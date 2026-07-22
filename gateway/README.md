# API Gateway

## Sorumluluk
Tek giriş noktası: prefix bazlı routing, rate limiting, JWT ön-doğrulama. Case doc bölüm 2.1'in izin verdiği "kendi yazdığınız reverse proxy" seçeneğiyle, hazır bir gateway (Kong/Ocelot/Spring Cloud Gateway) yerine `http-proxy-middleware` üzerine hafif, okunabilir bir Express tabanlı proxy olarak yazılmıştır.

## Neden "ön" doğrulama?
Bu gateway geçersiz/eksik token'ları **hızlıca** reddeder (backend'e hiç gitmeden), ama her servis kendi JWT + rol doğrulamasını **bağımsız olarak tekrar yapar** (`@campaigncell/auth-kit`). Bu, defense-in-depth prensibidir: gateway atlanıp bir servise doğrudan istek atılsa bile (örn. jüri güvenlik testinde) o servis kendi başına korumasız kalmaz.

## Routing Tablosu (`src/routing-table.ts`)
| Prefix | Hedef Servis |
|---|---|
| `/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/audit-logs/**` | Identity Service |
| `/api/v1/campaigns/**`, `/api/v1/cases/**`, `/api/v1/subscribers/**`, `/api/v1/stats/**` | Campaign Service |
| `/api/v1/ai/**` | AI Service |
| `/api/v1/game/**` | Gamification Service |
| `/health` | Gateway'in kendisi (health check) |

## Rate Limiting
- Genel: 300 istek/dakika/IP
- `/api/v1/auth/**`: 10 istek/dakika/IP (brute-force koruması, case doc bölüm 10)

## Çalıştırma
```bash
cp .env.example .env
npm install
npm run start:dev
```

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `PORT` | HTTP portu (varsayılan 3000) |
| `JWT_SECRET` | Tüm servislerde aynı olmalı |
| `IDENTITY_SERVICE_URL`, `CAMPAIGN_SERVICE_URL`, `AI_SERVICE_URL`, `GAMIFICATION_SERVICE_URL` | Upstream servis adresleri |
