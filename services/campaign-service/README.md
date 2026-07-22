# Campaign Service

## Sorumluluk
Kampanya yaşam döngüsü, optimizasyon vakası **state machine** (bölüm 4.2), SLA takibi (bölüm 4.4), segment/öncelik yönetimi, abone teklif geri bildirimi ve memnuniyet puanlaması, süpervizör dashboard istatistikleri.

Veritabanı: PostgreSQL (`campaign_db`) — yalnızca bu servis erişir.

AI Service'e yalnızca kampanya oluşturma anında **senkron REST** ile bağlanır (classify/assign/recommend); AI Service kapalıysa vaka `BELIRSIZ`/`ORTA` ile manuel kuyruğa düşer, kampanya oluşturma asla başarısız olmaz (bkz. `ai-client/ai-client.service.ts`).

## Vaka Açma Mantığı (case doc 4.2)

Case dokümanının 4.2 bölümü açıkça şunu söylüyor: **"Düşük dönüşümlü kampanyalar bir optimizasyon vakasına dönüşür"** — yani her kampanya değil, yalnızca zayıf performans beklenenler. İlk implementasyonumuzda bu satır atlanmış ve her kampanya için koşulsuz vaka açılıyordu; bu düzeltilmiştir. Somut zincir:

1. Uzman bir kampanya oluşturur, bir segmente hedefler.
2. AI Service (`/ai/classify`), o kampanya+segment kombinasyonu için beklenen **dönüşüm olasılığını** hesaplar. Bu değer **her zaman** `Campaign.aiConversionProbability` alanına yazılır — vaka açılsın açılmasın, kampanyanın AI sınıflandırması kalıcı bir kayıttır.
3. Bu olasılık düşükse (bkz. aşağıdaki eşik), kampanya bir **optimizasyon vakasına** dönüşür: `OptimizationCase` satırı oluşturulur, durum `YENİ` olur, SLA sayacı başlar, ardından Görev 3 (akıllı uzman ataması) çalışır ve `ATANDI` durumuna geçer.
4. Olasılık eşiğin üzerindeyse **hiç vaka açılmaz** — kampanya "sağlıklı" kabul edilir, abonelere teklif üretimi (Görev 1) yine de çalışır, ama hiçbir uzmana iş düşmez.
5. AI Service'e hiç ulaşılamazsa (kapalıyken), sınıflandırma yapılamadığı için **her zaman** vaka açılır (`BELİRSİZ`/`ORTA`, manuel kuyruk) — çünkü bu durumda "düşük mü yüksek mi" bilinmiyor, güvenli taraf insanın gözden geçirmesidir.

"Uzmana yönlendirme" (Görev 3) bu akışta bir bildirim değil, **kayıt oluşturup sahiplendirme**dir: vakanın SLA'sı, durumu, sahibi (assignedExpertId) vardır; bildirimin bunlar olmaz.

### Vaka Açma Eşiği (`CASE_CONVERSION_THRESHOLD`, varsayılan `0.40`)

Case dokümanı "düşük dönüşümlü" için sayısal bir değer vermiyor — bilinçli olarak koddan çıkarıp konfigürasyona taşıdık (`.env`, `CASE_CONVERSION_THRESHOLD`), sabit bir sayı gömmek yerine. **0.60'lık eşikle karıştırılmamalı**: o değer AI Service'in Görev 1'inde abonenin teklifi *görüp görmeyeceğini* belirler (`recommendation/recommendation.service.ts`); bu değer ise Görev 2'nin ürettiği segment-seviyesi beklenen dönüşümün bir **uzmanın gözden geçirmesini gerektirip gerektirmediğini** belirler — iki farklı karar, iki farklı sayı. 0.40 varsayımı: %40'ın altındaki bir dönüşüm beklentisi, kampanyanın hedeflemesinde ciddi bir sorun olduğunu düşündürür (bütçe israfı + müşteri rahatsızlığı riski — case doc 1.1 senaryosu); daha yüksek bir eşik (örn. 0.60) neredeyse her kampanyayı vakaya çevirir ve uzman ekibini gereksiz yere boğar, daha düşük bir eşik (örn. 0.20) yalnızca felaket düzeyindeki kampanyaları yakalar. 0.40 bu ikisi arasında, jürinin sorgulayabileceği makul bir orta nokta olarak seçildi.

### Granülarite Kararı: Kampanya Başına mı, Kampanya×Segment Başına mı?

Bu sistemde bir kampanyanın **tek bir hedef segmenti** vardır (`targetSegmentHint` opsiyonel öngörü, AI'ın kendi sınıflandırdığı `aiSegment` ise nihai tek segment) — yani veri modelimizde "bir kampanya üç segmente hedeflenip ikisinde zayıf çıkması" senaryosu zaten oluşmuyor: **kampanya×segment, bu tasarımda kampanyaya indirgeniyor**. Bu bilinçli bir sadeleştirme: çoklu-segment hedefleme (bir kampanyanın aynı anda birden fazla segmente farklı parametrelerle gönderilmesi) case dokümanında da örneklenmiyor ve mimariyi ciddi ölçüde karmaşıklaştırırdı (her segment için ayrı indirim oranı/geçerlilik/onay akışı gerekirdi). `OptimizationCase.campaignId` `@unique` olduğu için bire-bir ilişki veritabanı seviyesinde de garanti altında. Çoklu segment desteği gerekirse, `OptimizationCase`'i `campaignId + segment` bileşik anahtarına geçirip Campaign:Case ilişkisini 1:N yapmak yeterli olur — mevcut state machine ve event tasarımı değişmeden çalışır.

### RISKLI_KAYIP Özel Durumu (case doc 4.3)

`RISKLI_KAYIP` segmenti, dönüşüm olasılığından **bağımsız olarak** her zaman en az `YUKSEK` öncelik alır (AI Service'in `rule-based-classification.strategy.ts` dosyasındaki `maxPriority` kuralı). Bu, önceliğin dönüşüm skoruyla karıştırılmaması gereken ayrı bir iş kuralı: churn riski taşıyan bir aboneyi kaybetmenin maliyeti, tek bir kampanyanın dönüşmemesinden çok daha yüksektir — bu yüzden bu segmentteki bir vaka (açıldıysa) her zaman uzmanların önceliklendirme listesinde üstte görünür, dönüşüm beklentisi orta düzeyde olsa bile.

## Not: Rol matrisi yorumu
Case dokümanının 3.3 bölümündeki yetki tablosunda "Kampanya oluşturma" satırı `Müşteri` sütununda işaretli görünüyor; bu, dokümanın geri kalanıyla (1.1 Senaryo, 1.2 Kullanıcı Rolleri: "Kampanya Uzmanı ... Kampanya oluşturur") çelişiyor. Tutarlılık için kampanya oluşturma **PERSONEL** (Kampanya Uzmanı) rolüne kısıtlanmıştır.

## Çalıştırma
```bash
cp .env.example .env
npm install
npm run prisma:migrate:dev
npm run start:dev
```
Swagger: `http://localhost:3002/docs`

## Endpointler (prefix: `/api/v1`)
| Method | Endpoint | Yetki | Açıklama |
|---|---|---|---|
| POST | `/campaigns` | PERSONEL | Kampanya oluşturur, AI classify+assign+recommend tetiklenir |
| GET | `/campaigns` | PERSONEL(kendi oluşturduğu + atandığı vaka)/SUPERVISOR/ADMIN | Kampanya listesi (vaka açılmamış "sağlıklı" kampanyalar dahil) |
| GET | `/campaigns/:id` | PERSONEL(kendi oluşturduğu + atandığı vaka)/SUPERVISOR/ADMIN | Kampanya detayı |
| GET | `/cases` | PERSONEL(atanan)/SUPERVISOR/ADMIN | Optimizasyon vakaları |
| GET | `/cases/queue/pending` | SUPERVISOR, ADMIN | BELIRSIZ / atanmamış vakalar |
| GET | `/cases/:id` | PERSONEL(atanan)/SUPERVISOR/ADMIN | Vaka detayı |
| GET | `/cases/:id/history` | PERSONEL(atanan)/SUPERVISOR/ADMIN | State machine geçmişi (frontend Timeline bileşeni için) |
| PATCH | `/cases/:id/start` | PERSONEL | ATANDI → OPTIMIZE_EDILIYOR |
| PATCH | `/cases/:id/start-test` | PERSONEL | OPTIMIZE_EDILIYOR → TEST_EDILIYOR |
| PATCH | `/cases/:id/complete-test` | PERSONEL | TEST_EDILIYOR → OPTIMIZE_EDILIYOR |
| PATCH | `/cases/:id/complete` | PERSONEL | OPTIMIZE_EDILIYOR → TAMAMLANDI (not zorunlu), `campaign.optimized` yayınlar |
| PATCH | `/cases/:id/publish` | SUPERVISOR | TAMAMLANDI → YAYINDA |
| PATCH | `/cases/:id/segment` | PERSONEL, SUPERVISOR | AI segment override, `campaign.segment_changed` yayınlar |
| PATCH | `/cases/:id/priority` | SUPERVISOR | Manuel öncelik değişikliği |
| PATCH | `/cases/:id/assign` | SUPERVISOR | Manuel uzman ataması |
| GET | `/subscribers/offers/mine` | SUBSCRIBER | Kendi tekliflerim (skor ≥ 0.60) |
| PATCH | `/subscribers/offers/:id/respond` | SUBSCRIBER | Kabul / İlgilenmiyorum |
| PATCH | `/subscribers/offers/:id/rate` | SUBSCRIBER | 1-5 yıldız (tek seferlik) |
| GET | `/stats/segment-distribution` | SUPERVISOR, ADMIN | Segment dağılımı |
| GET | `/stats/sla-compliance` | SUPERVISOR, ADMIN | SLA uyum oranı |
| GET | `/stats/sla-breached-active` | SUPERVISOR, ADMIN | SLA aşmış aktif vakalar |
| GET | `/stats/conversion-trend` | SUPERVISOR, ADMIN | Günlük dönüşüm trendi |
| GET | `/stats/expert-performance` | SUPERVISOR, ADMIN | Uzman performansı |

## State Machine
`src/cases/case-state-machine.ts` içindeki `ALLOWED_TRANSITIONS` tablosu tek doğruluk kaynağıdır; kural dışı geçiş `422 Unprocessable Entity` döner. Bkz. case dokümanı bölüm 4.2.

## Arkaplan İşleri (`@nestjs/schedule`)
- Her dakika: aktif vakalarda SLA aşımı kontrolü → `sla.breached` event.
- Her saat: geçerlilik süresi dolmuş `YAYINDA` kampanyaları `ARSIVLENDI`'ye taşır.

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `PORT` | HTTP portu (varsayılan 3002) |
| `DATABASE_URL` | PostgreSQL bağlantı string'i |
| `JWT_SECRET` | Tüm servislerde aynı olmalı |
| `RABBITMQ_URL` | Ortak event bus |
| `AI_SERVICE_URL` | AI Service REST taban adresi |
| `CASE_CONVERSION_THRESHOLD` | Vaka açma eşiği (varsayılan `0.40`) — bkz. yukarıdaki "Vaka Açma Eşiği" |
