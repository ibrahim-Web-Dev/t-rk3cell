# AI Service

## Sorumluluk
Case dokümanının 3 zorunlu görevi: **öneri skorlama** (Görev 1), **segment sınıflandırma** (Görev 2), **akıllı uzman ataması** (Görev 3) ve AI **doğruluk takibi** (bölüm 5.4).

Veritabanı: PostgreSQL (`ai_db`) — yalnızca bu servis erişir. Uzman uzmanlık/kapasite/performans bilgisi, Identity ve Campaign servislerinin veritabanlarına **hiç dokunmadan**, yalnızca RabbitMQ event'leri (`staff.created`, `staff.updated`, `case.assigned`, `campaign.optimized`) tüketilerek yerel bir read-model önbelleğinde (`ExpertProfile`) tutulur.

## ÖNEMLİ: Şu anki yaklaşım kural tabanlıdır, ML DEĞİLDİR
Kullanıcı talebi doğrultusunda bu serviste **gerçek bir eğitilmiş ML modeli bilinçli olarak kullanılmamıştır**. Öneri skorlama (`recommendation/rule-based-scoring.strategy.ts`) ve segment sınıflandırma (`segmentation/rule-based-classification.strategy.ts`) dosyalarının başında büyük `TODO(ML)` yorum blokları, önerilen model tipi, feature seti ve eğitim verisi yaklaşımını detaylıca anlatır. Detaylı yaklaşım dokümanı için bkz. kök dizindeki `docs/AI_APPROACH.md`.

Her iki strateji de bir **arayüz** (`ScoringStrategy`, `ClassificationStrategy`) arkasına gizlenmiştir: gerçek bir model eklemek için bu arayüzü uygulayan yeni bir sınıf yazıp ilgili modülün `providers` dizisinde bağlamak yeterlidir; controller/service katmanları değişmez.

**Bu bir mock/hardcoded çıktı değildir** — girdi değiştikçe (indirim oranı, kampanya tipi, geçmiş red sayısı) çıktı deterministik ama gerçek biçimde değişir; case dokümanının "AI servisi mock/hardcoded ise diskalifiye" kuralına aykırı değildir.

## Çalıştırma
```bash
cp .env.example .env
npm install
npm run prisma:migrate:dev
npm run seed
npm run start:dev
```
Swagger: `http://localhost:3003/docs`

## Endpointler (prefix: `/api/v1`, tümü Campaign Service'in ilettiği orijinal kullanıcı token'ıyla korunur)
| Method | Endpoint | Yetki | Açıklama |
|---|---|---|---|
| POST | `/ai/recommend` | Authenticated | Görev 1: öneri skoru + dönüşüm olasılığı |
| POST | `/ai/classify` | Authenticated | Görev 2: segment + öncelik + confidence |
| POST | `/ai/assign` | Authenticated | Görev 3: uzman atama skoru (bkz. formül) |
| GET | `/ai/accuracy` | SUPERVISOR, ADMIN | Genel doğruluk oranı |
| GET | `/ai/accuracy/by-category` | SUPERVISOR, ADMIN | Segment bazlı doğruluk kırılımı |
| GET | `/ai/accuracy/overrides` | SUPERVISOR, ADMIN | Yanlış sınıflandırma kayıtları (frontend "Override tablosu") |
| GET | `/ai/experts` | SUPERVISOR, ADMIN | Uzman read-model önbelleği (debug/izleme) |

## Uzman Atama Formülü (bölüm 5.3)
```
skor = (uzmanlik_eslesme × 0.5) + (bosluk_orani × 0.3) + (performans × 0.2)
```
Uygulama: `src/assignment/assignment-scoring.ts` (saf fonksiyon, birim testli). Kapasitesi dolu (≥10 aktif vaka) uzmanlar aday listesine girmez; hiç aday kalmazsa `queued:true` döner ve vaka manuel kuyruğa düşer.

## Doğruluk Takibi
`SegmentPrediction` tablosu her `/ai/classify` çağrısında `campaignId` ile güncellenir (case henüz yaratılmadığı için `caseId` değil `campaignId` anahtar olarak kullanılır — case ile 1:1 ilişkilidir). Campaign Service `campaign.segment_changed` event'i yayınladığında (uzman/süpervizör override), bu servis tahminin doğru/yanlış olduğunu işaretler. `doğru/toplam × 100` hesaplaması: override edilmemiş tahminler "doğru" kabul edilir (aksi kanıtlanana kadar).

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `PORT` | HTTP portu (varsayılan 3003) |
| `DATABASE_URL` | PostgreSQL bağlantı string'i |
| `JWT_SECRET` | Tüm servislerde aynı olmalı |
| `RABBITMQ_URL` | Ortak event bus |
