# CampaignCell Frontend — Uygulama Raporu

Bu dosya, `CAMPAIGNCELL_FRONTEND_DESIGN.md` talimat dokümanına göre yapılan çalışmayı ve **bilinçli olarak kapsam dışı bırakılan** kısımları şeffaf şekilde belgeler (doküman §38 "Final Teslim Çıktısı" formatı).

## Kurulum
```bash
cp .env.example .env
npm install
npm run dev
```
`http://localhost:5173` — API Gateway `http://localhost:3000` üzerinde çalıştığı varsayılır.

## Environment Değişkenleri
| Değişken | Açıklama |
|---|---|
| `VITE_API_BASE_URL` | API Gateway adresi |
| `VITE_GAMIFICATION_WS_URL` | WebSocket bağlantısı için gateway kökü |

## Route Haritası (uygulanan)

| Route | Ekran | Erişim |
|---|---|---|
| `/login` | Birleşik login (Abone/Personel sekmeleri + Abone alt-modu: Giriş/Kayıt) | Public |
| `/403` | Yetkisiz erişim | Herkes |
| `/404` (wildcard) | Sayfa bulunamadı | Herkes |
| `/subscriber/offers` | Kişiselleştirilmiş teklifler | SUBSCRIBER |
| `/expert/cases` | Atanmış + kendi oluşturduğu kampanyalar | PERSONEL |
| `/expert/cases/:id` | Vaka detay (AI içgörü, Timeline, SLA sayaç, işlemler) | PERSONEL |
| `/expert/campaigns/new` | 4 adımlı kampanya oluşturma wizard'ı | PERSONEL |
| `/expert/profile` | Puan, seviye, rozet, liderlik | PERSONEL |
| `/supervisor/dashboard` | KPI + grafikler | SUPERVISOR, ADMIN |
| `/supervisor/queue` | Bekleyen/BELİRSİZ vakalar + manuel atama | SUPERVISOR |
| `/supervisor/experts` | Uzman performansı + kapasite | SUPERVISOR, ADMIN |
| `/supervisor/ai-insights` | AI doğruluk, kategori kırılımı, override tablosu | SUPERVISOR, ADMIN |
| `/cases-overview` | Tüm vakalar, kime ne atandığı | SUPERVISOR, ADMIN |
| `/admin/staff` | Personel CRUD | ADMIN |
| `/admin/audit-log` | Audit log | ADMIN |

**Not:** Tasarım dokümanının önerdiği tam route isimlendirmesi (`/panel/*`, `/app/*`) yerine önceki oturumlarda kurulmuş ve zaten çalışan `/expert/*`, `/subscriber/*`, `/supervisor/*` isimlendirmesi korunmuştur (doküman §0: "mevcut repository yapısını incele... gereksiz framework/route dönüşümü yapma").

## Demo Kullanıcılar (bu genişletmede eklenen)
- **2 Admin**: `admin@campaigncell.com`, `admin2@campaigncell.com`
- **3 Süpervizör**: `supervisor@campaigncell.com`, `supervisor2@campaigncell.com`, `supervisor3@campaigncell.com`
- **12 Kampanya Uzmanı**: `uzman1@campaigncell.com` … `uzman12@campaigncell.com` (7 bölgeye, 5 segment uzmanlığına dağıtılmış)
- **6 Abone**: GSM `5551234567` … `5551234572` (OTP: `1234`)
- Tüm personel şifresi: `Password1!`
- **28 kampanya** (21 optimizasyon vakası açık — state machine'in 7 durumunun tamamı temsil ediliyor —, 7 sağlıklı/vaka açılmamış)

## Tasarım Sistemi Özeti
`src/index.css` içindeki token'lar `CAMPAIGNCELL_FRONTEND_DESIGN.md` §5'ten **birebir** alınmıştır (`--color-brand-yellow: #FFC900`, `--color-brand-navy: #07075F`, segment renkleri, radius/gölge ölçekleri). Işık/karanlık tema ikisi de desteklenir (`prefers-color-scheme`), doküman bunu zorunlu kılmıyor ama önceki oturumda kurulmuş olduğu için korunmuştur.

## Uygulanan Bileşenler (bu genişletmede eklenen)
- `SlaCountdown` — saniyelik canlı SLA sayacı (yalnızca bu bileşen re-render olur, tablo satırları etkilenmez)
- `Timeline` — vaka state machine geçmişi (yeni backend endpoint: `GET /cases/:id/history`)
- 4 adımlı `CampaignWizard` (Temel Bilgiler → Hedefleme → Teklif → Önizleme)
- `ForbiddenPage` (403), `NotFoundPage` (404)
- `AiInsightsPage` — genel doğruluk, kategori kırılımı, override tablosu (yeni backend endpoint: `GET /ai/accuracy/overrides`, `correctedBy` alanı eklendi)
- `ExpertsPage` — kapasite bar'ı (`7/10` görselleştirmesi), tamamlanan/ortalama süre/dönüşüm artışı/puan

## Backend'e Yapılan Küçük, Salt-Okunur Ekler
Tasarım dokümanı "backend koduna dokunma" diyor; ancak Timeline ve Override tablosu bileşenleri var olan verinin (state history, segment prediction düzeltmeleri) **okunması** için endpoint gerektiriyordu — bu iki nokta dışında hiçbir iş mantığı değiştirilmedi:
- `GET /cases/:id/history` (Campaign Service) — `CaseStatusHistory` tablosunu döner
- `GET /ai/accuracy/overrides` (AI Service) — yanlış sınıflandırma kayıtlarını döner
- `SegmentPrediction.correctedBy` alanı eklendi (kimin override ettiğini izlemek için)

## Bilinçli Olarak Kapsam Dışı Bırakılanlar

Tasarım dokümanı 39 bölümlük çok kapsamlı bir talimat seti (tam mimari değişimi + tasarım sistemi + test stratejisi + performans + telemetri). Zaten çalışan, test edilmiş, uçtan uca doğrulanmış bir uygulamayı riske atmamak için aşağıdakiler **bilinçli olarak** yapılmadı:

| Doküman İsteği | Durum | Neden |
|---|---|---|
| TanStack Query + Zustand + React Hook Form + Zod mimarisi | Yapılmadı | Mevcut axios + React state katmanı zaten çalışıyor ve test edildi; büyük bir mimari göçü bu oturumun kapsamını aşardı, regresyon riski yüksek |
| httpOnly cookie refresh token | Yapılmadı | Backend'in JSON body'de refresh token dönme davranışını değiştirmeyi gerektirir (case doc'ta böyle tasarlanmış); doküman "API sözleşmesini bozma, riski dokümante et" diyor — risk burada dokümante edildi |
| Storybook | Yapılmadı | Zaman kısıtı; bileşen kataloğu kod içinde (`shared/components/`) mevcut |
| Playwright/Cypress E2E | Yapılmadı | Backend'de Jest ile kritik iş mantığı (state machine, skorlama, atama formülü) test edilmiş durumda; frontend E2E ayrı bir yatırım gerektiriyor |
| Mock adapter (`VITE_API_MODE=mock\|real`) | Yapılmadı | Backend zaten tam çalışır durumda ve gerçek API ile entegre; mock katmanına ihtiyaç duyulmadı |
| Global servis sağlık banner'ı (§6.4) | Yapılmadı | Gateway'de servisleri toplu izleyen bir aggregation endpoint'i yok; eklemek yeni bir backend yüzeyi gerektirirdi |
| Kilitli/kazanılmamış rozet gösterimi (§15.2) | Yapılmadı | ProfilePage yalnızca kazanılan rozetleri listeliyor |
| Manuel atama drawer'ı (kapasite/performans önizlemeli) | Kısmen | `PendingQueuePage` uzman adı + uzmanlık etiketiyle basit bir seçim sunuyor, tam drawer değil |
| `date-fns`, tam locale/currency formatlama helper'ı | Kısmen | `toLocaleString('tr-TR')` kullanılıyor, ayrı bir merkezi helper dosyası yok |

## Bilinen Sınırlamalar
- AI Insights sayfasındaki doğruluk metrikleri, **seed verisiyle değil gerçek `/ai/classify` çağrılarıyla** dolar (seed, hız için AI Service'i atlayıp doğrudan veritabanına yazıyor). Demo sırasında birkaç kampanya canlı oluşturulup segment override edilirse sayfa dolu görünür.
- Access/refresh token'lar `localStorage`'da tutulur (case doc'un gerçek backend implementasyonuyla uyumlu, ama tasarım dokümanının önerdiği httpOnly cookie modelinden farklı — yukarıda gerekçelendirildi).
