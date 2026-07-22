# CampaignCell — Event Kataloğu

Tüm servisler `campaigncell.events` adlı **topic exchange**'e bağlanır (RabbitMQ). Her event, routing key'i ile aynı isimde bir `event_type` alanı taşıyan ortak bir zarf (envelope) içinde yayınlanır:

```json
{
  "event_type": "campaign.optimized",
  "timestamp": "2026-07-18T14:22:10Z",
  "payload": { "...": "..." }
}
```

Routing key sabitleri ve TypeScript tip tanımları `packages/shared-types/src/events.ts` içindedir — bu dosya tek doğruluk kaynağıdır, aşağıdaki tablo onunla senkron tutulmalıdır. Alt yapı (bağlantı, exchange, dead-letter queue) `packages/event-bus` paketinde ortaktır; her servis kendi queue'sunu ve routing key bağlarını kendi kodunda tanımlar.

## Yayınlayan → Dinleyen Matrisi

| Routing Key | Yayınlayan | Dinleyen | Ne Zaman |
|---|---|---|---|
| `campaign.created` | Campaign | — (gözlemlenebilirlik) | Kampanya oluşturulduğunda |
| `campaign.targeted` | Campaign | — | Kampanya abone segmentine hedeflendiğinde |
| `case.assigned` | Campaign | AI (expert read-model), Gamification (case→uzman cache) | Bir vakaya uzman atandığında (otomatik veya manuel) |
| `case.status_changed` | Campaign | — (genel denetim izi) | Her state machine geçişinde |
| `campaign.optimized` | Campaign | **Gamification** (puan/rozet tetikleyici) | Vaka `TAMAMLANDI`'ya geçtiğinde |
| `campaign.segment_changed` | Campaign | **AI** (doğruluk takibi) | Uzman/süpervizör AI segmentini override ettiğinde |
| `offer.responded` | Campaign | AI (red geçmişi → skor düşürme) | Abone teklifi yanıtladığında |
| `satisfaction.rated` | Campaign | **Gamification** (düşük puan cezası) | Abone 1-5 yıldız verdiğinde |
| `sla.breached` | Campaign (cron) | **Gamification** (SLA cezası) | SLA süresi aktif bir vakada dolduğunda |
| `ai.recommendation.created` | AI | — | Öneri skorlama tamamlandığında |
| `ai.segment.assigned` | AI | — | Segment sınıflandırma tamamlandığında |
| `ai.assignment.suggested` | AI | — | Uzman atama önerisi hesaplandığında |
| `staff.created` | Identity | **AI** (expert read-model) | Admin yeni personel oluşturduğunda |
| `staff.updated` | Identity | AI (expert read-model) | Personel bilgisi güncellendiğinde |
| `badge.earned` | Gamification | — (WebSocket ile frontend'e anlık iletilir) | Rozet kazanıldığında |
| `points.updated` | Gamification | — (WebSocket ile frontend'e anlık iletilir) | Her puan değişiminde |
| `audit.log.entry` | Her servis (401/403 durumunda `AllExceptionsFilter` otomatik yayınlar; Identity kendi login/lockout olaylarını doğrudan yazar) | **Identity** (merkezi audit log) | Denetlenebilir bir olay gerçekleştiğinde |

Kalın yazılmış "Dinleyen" hücreleri, bu event'in gerçek iş mantığını tetiklediği yerlerdir (diğerleri şu an yalnızca gözlemlenebilirlik/genişletilebilirlik amaçlıdır).

## Neden REST Değil Event?

Bölüm 2.2 kuralı gereği servisler arası iletişimde event tabanlı tasarım tercih edilir. Bu sistemde **yalnızca bir yerde** senkron REST kullanılır: Campaign Service, kampanya oluşturma anında AI Service'in `/ai/classify`, `/ai/assign`, `/ai/recommend` endpoint'lerini çağırır (case dokümanının 8.2 örneğiyle birebir uyumlu: "AI önerisi tetiklenir"). Bu çağrı timeout+try/catch ile korunur; AI Service kapalıysa kampanya yine oluşturulur (segment: BELIRSIZ, öncelik: ORTA).

Geri kalan **tüm** servisler arası bilgi akışı (uzman read-model senkronizasyonu, gamification puanlama, audit log, doğruluk takibi) RabbitMQ üzerinden asenkron event'lerle yapılır — bu sayede bir servis çöktüğünde diğerleri event kuyruğa birikir, kaybolmaz, servis geri geldiğinde işlenir (dead-letter queue ile birlikte, bkz. `packages/event-bus/src/rabbitmq.service.ts`).

## Örnek Payload'lar

### campaign.optimized
```json
{
  "event_type": "campaign.optimized",
  "timestamp": "2026-07-18T14:22:10Z",
  "payload": {
    "case_id": "b884cd41-...",
    "campaign_id": "29d0f99d-...",
    "expert_id": "00000000-0000-0000-0000-000000000004",
    "segment": "RISKLI_KAYIP",
    "priority": "YUKSEK",
    "conversion_lift": 0.22,
    "sla_breached": false,
    "created_at": "2026-07-22T16:42:47.266Z",
    "completed_at": "2026-07-22T16:42:59.589Z"
  }
}
```

### case.assigned
```json
{
  "event_type": "case.assigned",
  "timestamp": "2026-07-22T16:42:47.300Z",
  "payload": {
    "case_id": "b884cd41-...",
    "campaign_id": "29d0f99d-...",
    "expert_id": "00000000-0000-0000-0000-000000000004",
    "segment": "YENI_ABONE",
    "priority": "DUSUK",
    "assignment_score": 0.9
  }
}
```

### campaign.segment_changed
```json
{
  "event_type": "campaign.segment_changed",
  "timestamp": "2026-07-22T17:00:00.000Z",
  "payload": {
    "case_id": "b884cd41-...",
    "campaign_id": "29d0f99d-...",
    "previous_segment": "YENI_ABONE",
    "new_segment": "PASIF",
    "changed_by": "00000000-0000-0000-0000-000000000004",
    "changed_by_role": "PERSONEL",
    "was_ai_assigned": true
  }
}
```

### sla.breached
```json
{
  "event_type": "sla.breached",
  "timestamp": "2026-07-25T16:43:00.000Z",
  "payload": {
    "case_id": "b884cd41-...",
    "priority": "KRITIK",
    "sla_hours": 2,
    "breached_at": "2026-07-25T16:43:00.000Z"
  }
}
```

### audit.log.entry
```json
{
  "event_type": "audit.log.entry",
  "timestamp": "2026-07-22T16:50:00.000Z",
  "payload": {
    "user_id": "00000000-0000-0000-0000-000000000006",
    "action": "campaign-service:POST /api/v1/campaigns",
    "ip": "172.19.0.1",
    "result": "FAILURE",
    "detail": "Bu işlem için yetkiniz bulunmuyor"
  }
}
```

## Hata Toleransı

Her queue, kendi dead-letter queue'suna (`<queue-adı>.dlq`) sahiptir. Bir handler exception fırlatırsa mesaj `nack(requeue=false)` ile reddedilir ve otomatik olarak DLX (`campaigncell.events.dlx`) üzerinden ilgili `.dlq` kuyruğuna yönlendirilir — sonsuz retry döngüsü veya sessizce kaybolma riski yoktur. RabbitMQ yönetim panelinden (`http://localhost:15672`, guest/guest) tüm kuyruklar ve DLQ'lar izlenebilir.
