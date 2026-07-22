# Gamification Service

## Sorumluluk
Personel motivasyon sistemi: puan, rozet, seviye, liderlik. **Yalnızca event tüketerek çalışır** — hiçbir domain-yazma REST endpoint'i yoktur (case doc bölüm 6: "Bu servis Campaign Service'ten gelen event'lerle çalışır — doğrudan çağrı değil").

Veritabanı: PostgreSQL (`gamification_db`, kalıcı puan/rozet/profil) + Redis (`redis-gamification`, liderlik tablosu sorted set).

## Tükettiği Event'ler
| Event | Tetiklediği İşlem |
|---|---|
| `campaign.optimized` | +10 puan, koşullu +5/+15/+15 bonuslar, rozet/seviye kontrolü |
| `sla.breached` | -5 puan (ilgili uzmana, `CaseAssignmentCache` üzerinden çözülür) |
| `satisfaction.rated` | 1-2 yıldızsa -3 puan |
| `case.assigned` | `CaseAssignmentCache` güncellenir (case→uzman eşlemesi) |

## Not: Sayısal varsayım
Case dokümanı "Dönüşüm hedefi aşıldı: +15" kuralı için sayısal bir eşik vermiyor. Bu serviste `conversion_lift >= 0.15` (yüzde 15 dönüşüm artışı) "hedef aşıldı" kabul edilmiştir (`src/points/points.service.ts` içinde `CONVERSION_TARGET_THRESHOLD` sabiti).

## Endpointler (prefix: `/api/v1`)
| Method | Endpoint | Yetki | Açıklama |
|---|---|---|---|
| GET | `/game/leaderboard?period=daily\|weekly` | PERSONEL, SUPERVISOR, ADMIN | İlk 10, puan sıralı (Redis) |
| GET | `/game/profile/me` | PERSONEL, SUPERVISOR, ADMIN | Kendi profili: puan, seviye, rozetler, sıralama |
| GET | `/game/profile/:userId` | SUPERVISOR, ADMIN | Başka bir personelin profili |

## Gerçek Zamanlı Bildirim (bonus)
Socket.IO WebSocket gateway (`src/realtime/realtime.gateway.ts`). İstemci bağlandıktan sonra `join` event'iyle kendi JWT access token'ını gönderir; sunucu token'ı `JWT_SECRET` ile doğrulayıp yalnızca doğrulanmış `user_id` odasına katılım sağlar (başka bir kullanıcının bildirimlerine abone olunamaz). Rozet kazanılınca `badge.earned`, her puan değişiminde `points.updated` event'i o kullanıcıya anlık yayınlanır.

## Puan Tablosu / Rozetler / Seviyeler
Bkz. case dokümanı bölüm 6.1-6.3; sabitler `packages/shared-types/src/enums.ts` (`LEVEL_THRESHOLDS`, `computeLevel`) ve `src/badges/badge-rules.ts` (`BADGE_THRESHOLDS`) içinde, birim testleriyle birlikte tanımlıdır.

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `PORT` | HTTP portu (varsayılan 3004) |
| `DATABASE_URL` | PostgreSQL bağlantı string'i |
| `REDIS_URL` | Redis bağlantı string'i (liderlik tablosu) |
| `JWT_SECRET` | Tüm servislerde aynı olmalı |
| `RABBITMQ_URL` | Ortak event bus |
