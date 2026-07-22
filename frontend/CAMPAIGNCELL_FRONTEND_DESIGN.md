# CampaignCell Frontend Tasarım ve Uygulama Talimatı

> **Hedef okuyucu:** Claude / kıdemli frontend mühendisi  
> **Kapsam:** Yalnızca frontend mimarisi, kullanıcı deneyimi, görsel tasarım, frontend güvenliği, API entegrasyon katmanı ve frontend testleri  
> **Proje:** Turkcell CodeNight 2026 Final - CampaignCell  
> **Dil:** Arayüz metinleri Türkçe, kod ve teknik isimlendirmeler İngilizce

---

## 0. Claude İçin Ana Görev

Bu repository içinde **CampaignCell ürününün yalnızca frontend tarafını** tasarla ve uygula. Çalışma, Turkcell'in güncel web arayüzündeki kurumsal görsel dili temel almalı; fakat mevcut Turkcell sayfalarını birebir kopyalayan bir klon oluşturmamalıdır. Tasarım, CampaignCell'in kampanya yönetimi, yapay zeka önerileri, optimizasyon vakaları, gamification ve yönetim dashboard'u gereksinimlerine özgü bir ürün arayüzüne dönüştürülmelidir.

Temel hedefler:

1. Turkcell hissini ilk bakışta veren tutarlı bir tasarım sistemi oluştur.
2. Abone, Kampanya Uzmanı, Süpervizör/Kampanya Yöneticisi ve Admin rollerini ayrı kullanıcı akışlarıyla destekle.
3. Login ekranından dashboard, detay sayfaları, tablolar, grafikler, modal/drawer akışları ve tüm loading/error/empty state'lere kadar eksiksiz frontend üret.
4. UI kararlarını yalnızca estetik açıdan değil; veri yoğunluğu, erişilebilirlik, güvenlik, responsive davranış ve canlı demo kolaylığı açısından da mühendislik yaklaşımıyla uygula.
5. Backend iş mantığı yazma. API henüz hazır değilse typed mock adapter kullan; gerçek endpoint geldiğinde bileşenlerin değiştirilmesine gerek kalmayacak şekilde frontend servis katmanı kur.
6. Var olan repository yapısını incele. Mevcut frontend stack çalışıyorsa onu koru; gereksiz framework dönüşümü yapma. Greenfield ise aşağıdaki varsayılan stack'i kullan.

---

## 1. Kaynak Önceliği ve Gereksinim Çakışması

Kaynakların öncelik sırası:

1. Case dokümanındaki zorunlu fonksiyonel gereksinimler
2. Backend'in yayınlanmış OpenAPI/Swagger sözleşmesi
3. Bu frontend tasarım dokümanı
4. Mevcut repository'nin çalışan bileşenleri
5. Mock veri

Case dokümanında rol matrisi ile demo akışı arasında olası tutarsızlık bulunursa UI tarafında şu yaklaşımı uygula:

- Butonları yalnızca rol adına göre hard-code etme.
- Backend'den gelen `permissions` veya `capabilities` bilgisine göre aksiyonları göster/gizle.
- Backend capability endpoint'i yoksa aşağıdaki varsayılan rol davranışlarını kullan:
  - **Abone:** kişiselleştirilmiş teklifleri görür, kabul/reddeder, puanlar.
  - **Kampanya Uzmanı:** kampanya oluşturur, atanmış optimizasyon vakalarını yönetir, A/B testi ve optimizasyon notu girer, puan/rozet kazanır.
  - **Süpervizör/Kampanya Yöneticisi:** tüm operasyonu izler, KPI'ları görür, manuel atama yapar, kampanya/vaka durumlarını denetler.
  - **Admin:** personel hesapları, roller ve audit log ekranlarını yönetir.

Frontend'de görünmeyen bir buton güvenlik önlemi değildir. Backend yetkilendirmesi daima nihai otoritedir.

---

## 2. Görsel Yön: Turkcell Esintili, CampaignCell'e Özgü

### 2.1 Referans alınacak görsel ilkeler

Turkcell web deneyiminden alınacak temel karakteristikler:

- Güçlü ve geniş mavi üst alanlar
- Sarı rengin ana vurgu ve CTA rengi olarak kullanılması
- Koyu lacivert hero/kampanya yüzeyleri
- Büyük, yuvarlatılmış köşeler
- Beyaz ve ferah içerik yüzeyleri
- Az ama güçlü renk blokları
- Net hiyerarşi, büyük başlıklar ve yuvarlak-geometrik sans-serif görünüm
- Pill formunda butonlar
- Kart temelli içerik grupları
- Geniş yatay boşluk ve kontrollü gölge
- Login ekranında merkezlenmiş beyaz kart, yumuşak açık arka plan, segment/tab seçimi ve tam genişlik birincil buton

### 2.2 Kopyalanmaması gerekenler

- Turkcell ana sayfasının menü yapısını dashboard içine aynen taşımak
- Ticari ürün banner'larını veya kampanya görsellerini kopyalamak
- Turkcell'in tescilli illüstrasyonlarını izinsiz kullanmak
- Tasarımı bir e-ticaret sitesi gibi kurmak
- Kullanıcıyı yanıltacak şekilde gerçek Turkcell üretim sistemi izlenimi vermek

CampaignCell bir **B2B operasyon paneli + abone teklif deneyimi** olarak ele alınmalıdır.

### 2.3 Marka kullanımı

- Repository içinde resmi ve kullanıma izinli Turkcell logo asset'i varsa onu kullan.
- Logo asset'i yoksa internetten rastgele logo indirme. Geçici olarak `CampaignCell` wordmark ve sarı bir dairesel işaret kullan.
- Demo ortamında üst bölümde küçük bir `CodeNight 2026` etiketi kullanılabilir.

---

## 3. Önerilen Frontend Teknoloji Stack'i

Greenfield frontend için:

- React + TypeScript
- Vite
- React Router
- TanStack Query
- Zustand yalnızca küçük istemci state'i için
- React Hook Form + Zod
- Tailwind CSS veya mevcut projede kullanılan token tabanlı CSS çözümü
- Recharts veya mevcut chart kütüphanesi
- Lucide React ikonları
- date-fns
- Vitest + React Testing Library
- Playwright veya Cypress ile kritik akış E2E testleri
- Storybook mevcutsa tasarım sistemi bileşenlerini dokümante et

Kurallar:

- Framework ve paket sürümlerini körlemesine yükseltme.
- Aynı işi yapan iki farklı UI library ekleme.
- Ağır bir component library kullanılıyorsa ham stilleri olduğu gibi bırakma; tüm bileşenleri tasarım token'larıyla CampaignCell görünümüne uyarla.
- Server state'i Zustand/Redux içine kopyalama; TanStack Query cache kullan.
- Form state'ini global store'a taşıma.

---

## 4. Bilgi Mimarisi ve Route Haritası

### 4.1 Public/Auth

| Route | Ekran | Erişim |
|---|---|---|
| `/login` | Rol seçimi içeren birleşik login | Public |
| `/login/subscriber` | GSM ile abone girişi | Public |
| `/login/staff` | E-posta ve şifre ile personel girişi | Public |
| `/verify-otp` | OTP doğrulama | Public / geçici session |
| `/forgot-password` | Personel şifre sıfırlama | Public |
| `/403` | Yetkisiz erişim | Herkes |
| `/404` | Sayfa bulunamadı | Herkes |
| `/service-unavailable` | Kısmi servis kesintisi | Herkes |

### 4.2 Abone Portalı

| Route | Ekran |
|---|---|
| `/app/offers` | Kişiselleştirilmiş teklifler |
| `/app/offers/:offerId` | Teklif detayı |
| `/app/accepted` | Kabul edilen kampanyalar |
| `/app/history` | Geçmiş teklif etkileşimleri |
| `/app/profile` | Profil ve iletişim bilgileri |

### 4.3 Kampanya Uzmanı Paneli

| Route | Ekran |
|---|---|
| `/panel/overview` | Uzman ana dashboard |
| `/panel/cases` | Atanmış optimizasyon vakaları |
| `/panel/cases/:caseId` | Vaka detay ve çalışma alanı |
| `/panel/campaigns` | Kampanya listesi |
| `/panel/campaigns/new` | Kampanya oluşturma wizard'ı |
| `/panel/campaigns/:campaignId` | Kampanya detayı ve performans |
| `/panel/leaderboard` | Günlük/haftalık liderlik |
| `/panel/profile` | Puan, seviye, rozet ve performans |
| `/panel/notifications` | Bildirim merkezi |

### 4.4 Süpervizör / Kampanya Yöneticisi

| Route | Ekran |
|---|---|
| `/supervisor/dashboard` | Operasyonel dashboard |
| `/supervisor/cases` | Tüm vakalar |
| `/supervisor/queue` | Bekleyen ve BELIRSIZ vakalar |
| `/supervisor/experts` | Uzman performansı ve kapasite |
| `/supervisor/ai-insights` | AI doğruluğu ve kategori kırılımı |
| `/supervisor/campaigns` | Tüm kampanyalar |
| `/supervisor/notifications` | Kritik operasyon bildirimleri |

### 4.5 Admin

| Route | Ekran |
|---|---|
| `/admin/users` | Personel hesapları |
| `/admin/users/new` | Yeni personel oluşturma |
| `/admin/users/:userId` | Kullanıcı rol/uzmanlık/bölge düzenleme |
| `/admin/audit-logs` | Audit log görüntüleme |
| `/admin/system` | Frontend'e sunulan servis sağlık durumu |

---

## 5. Tasarım Sistemi

### 5.1 Renk Token'ları

Aşağıdaki renkler başlangıç tasarım token'larıdır. Görsel referanslarla uyumludur ve erişilebilirlik testinden geçirilmelidir.

```css
:root {
  --color-brand-blue-50: #EEF4FF;
  --color-brand-blue-100: #DCE8FF;
  --color-brand-blue-500: #2855AC;
  --color-brand-blue-600: #214B9D;
  --color-brand-blue-700: #193E86;
  --color-brand-navy: #07075F;
  --color-brand-navy-deep: #04043F;

  --color-brand-yellow: #FFC900;
  --color-brand-yellow-hover: #F0BB00;
  --color-brand-yellow-active: #DDAE00;

  --color-accent-cyan: #169CC5;
  --color-accent-orange: #F9A12B;

  --color-bg-app: #F5F7FB;
  --color-bg-soft: #EEF2F7;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;

  --color-text-primary: #172033;
  --color-text-secondary: #5F6B7A;
  --color-text-muted: #8B95A5;
  --color-text-on-dark: #FFFFFF;

  --color-success: #168A45;
  --color-success-bg: #EAF8F0;
  --color-warning: #C77800;
  --color-warning-bg: #FFF5DE;
  --color-danger: #D92D20;
  --color-danger-bg: #FEEDEC;
  --color-info: #2563EB;
  --color-info-bg: #EFF6FF;
}
```

### 5.2 Rol bazlı vurgu

Ana marka rengi değişmemeli. Rol ayrımı için yalnızca küçük ikincil vurgular kullan:

- Abone: sarı + mavi
- Uzman: mavi + cyan
- Süpervizör: lacivert + sarı
- Admin: lacivert + nötr gri

### 5.3 Segment renkleri

| Segment | Renk | Not |
|---|---|---|
| `YUKSEK_DEGER` | `#2855AC` | Birincil mavi |
| `RISKLI_KAYIP` | `#D92D20` | Risk göstergesi |
| `YENI_ABONE` | `#169CC5` | Canlı cyan |
| `PASIF` | `#7A8699` | Nötr gri |
| `BELIRSIZ` | `#C77800` | Uyarı turuncusu |

Renk tek başına anlam taşımamalı. Her segmentte metin etiketi ve gerekiyorsa ikon bulunmalı.

### 5.4 Öncelik renkleri

| Öncelik | Renk | UI davranışı |
|---|---|---|
| `KRITIK` | Kırmızı | Sol şerit + ikon + belirgin badge |
| `YUKSEK` | Turuncu | Sol şerit + badge |
| `ORTA` | Mavi/gri | Standart badge |
| `DUSUK` | Gri | Düşük görsel ağırlık |

### 5.5 Tipografi

- Yetkili kurumsal font asset'i mevcutsa onu kullan.
- Aksi durumda: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Başlıklar yüksek ağırlıklı ve kompakt olabilir; gövde metinleri okunabilir tutulmalı.

Önerilen ölçek:

| Token | Desktop | Mobile | Ağırlık |
|---|---:|---:|---:|
| Display | 40/48 | 32/40 | 700 |
| H1 | 32/40 | 28/36 | 700 |
| H2 | 24/32 | 22/30 | 700 |
| H3 | 20/28 | 18/26 | 650 |
| Body L | 16/24 | 16/24 | 400 |
| Body | 14/22 | 14/22 | 400 |
| Caption | 12/18 | 12/18 | 500 |

### 5.6 Spacing

4 px tabanlı sistem kullan:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Dashboard içerik alanı:

- Desktop yatay padding: 32 px
- Büyük ekran maksimum içerik: 1600 px
- Tablet: 24 px
- Mobil: 16 px
- Kart aralığı: 16-24 px

### 5.7 Radius

- Küçük element: 8 px
- Input/select: 12 px
- Kart: 16 px
- Büyük kampanya/hero kartı: 20-24 px
- Pill button/chip: 999 px

### 5.8 Gölge

Gölge sınırlı kullanılmalı:

```css
--shadow-card: 0 8px 24px rgba(15, 23, 42, 0.06);
--shadow-elevated: 0 16px 44px rgba(15, 23, 42, 0.12);
--shadow-focus: 0 0 0 4px rgba(40, 85, 172, 0.18);
```

### 5.9 Motion

- Mikro etkileşim: 120-180 ms
- Drawer/modal: 200-260 ms
- Grafik giriş animasyonu: en fazla 350 ms
- `prefers-reduced-motion` desteklenmeli
- Kritik dashboard verileri gereksiz animasyonla geciktirilmemeli

---

## 6. Global Uygulama Shell'i

### 6.1 Desktop shell

- Sol tarafta 248 px genişlikte sidebar
- Üstte 64 px header
- Sidebar koyu lacivert veya beyaz olabilir; önerilen tercih koyu laciverttir
- Aktif menü öğesi sarı küçük çizgi/nokta ve açık mavi yüzeyle belirtilir
- Header içinde:
  - Sayfa başlığı veya breadcrumb
  - Global arama
  - Servis durumu göstergesi
  - Bildirim ikonu ve okunmamış sayısı
  - Kullanıcı avatarı/rol menüsü

### 6.2 Sidebar içeriği

Rol bazında menü değişmeli. Menü öğeleri backend permission verisine göre filtrelenmeli.

Alt alanda:

- Kullanıcı adı
- Rol etiketi
- Çıkış
- Gerekirse `CodeNight Demo` etiketi

### 6.3 Tablet ve mobil

- 1024 px altında sidebar collapsed
- 768 px altında sidebar drawer'a dönüşür
- Abone portalında mobil için alt navigation tercih edilir
- Personel panellerinde mobil alt navigation yerine hamburger + drawer kullanılabilir

### 6.4 Global service status

Case gereği bir servis kapatıldığında sistemin geri kalanının çalışmaya devam ettiği gösterilmelidir. Frontend shell'de servis durumları için küçük bir durum alanı ekle:

- `Tüm servisler aktif`
- `AI Service geçici olarak kullanılamıyor`
- `Gamification gecikmeli güncelleniyor`

Kısmi kesinti tüm uygulamayı kırmamalı. İlgili modül içinde degrade state göster.

---

## 7. Login ve Kimlik Doğrulama Tasarımı

### 7.1 Genel görünüm

Login ekranı referans görseldeki gibi:

- Açık gri/beyaz, çok hafif mavi-mor gradient arka plan
- Üst merkezde marka işareti
- Merkezde 560-660 px genişliğinde beyaz kart
- 20-24 px radius
- Yumuşak gölge
- Üstte `CampaignCell` veya `Hızlı Giriş` başlığı
- Segment control/tab ile `Abone` ve `Personel` seçimi
- Tam genişlik birincil CTA
- Alt bölümde aydınlatma/gizlilik bağlantıları

### 7.2 Abone login

Alanlar:

- Ülke kodu: sabit `+90`
- GSM numarası
- `Beni hatırla` checkbox
- `Doğrulama kodu gönder` butonu

Validasyon:

- 10 haneli GSM
- Başlangıç sıfırı kullanıcıdan alınmamalı veya normalize edilmeli
- Hata mesajı input altında görünmeli
- Submit sırasında input ve buton kilitlenmeli

### 7.3 OTP ekranı

- 4 ayrı kutu veya erişilebilir tek input görselleştirmesi
- Yapıştırma desteği
- Otomatik ileri fokus
- Backspace ile geri dönme
- `Kodu yeniden gönder 00:45`
- Demo ortamında küçük, yalnızca geliştirme modunda görünen `Demo OTP: 1234` bilgisi eklenebilir
- Production build'de demo OTP görünmemeli

### 7.4 Personel login

Alanlar:

- E-posta
- Şifre
- Şifre görünürlük toggle
- `Beni hatırla`
- `Şifremi unuttum`
- `Giriş Yap`

Hata durumları:

- E-posta/şifre hatalı
- Hesap kilitli ve kalan süre
- Yetki tanımlı değil
- Servis geçici olarak kullanılamıyor
- Çok fazla istek/rate limit

### 7.5 Session davranışı

- 401: Sessiz refresh dene; başarısızsa login'e yönlendir
- 403: Login'e atma; `/403` sayfası veya inline yetki uyarısı göster
- Session bitmeden kısa süre önce kullanıcı aktifse refresh akışı çalışmalı
- Çıkış sırasında skeleton değil net bir loading state göster

---

## 8. Abone Deneyimi

### 8.1 Abone ana sayfası

Üst bölüm:

- `Merhaba, Ayşe` başlığı
- `Sana özel teklifler` açıklaması
- Kullanım profili özet kartı, backend sunuyorsa: internet, dakika, SMS veya mevcut tarife

Teklif sıralaması:

1. Öncelikli teklifler
2. Normal teklifler
3. Yakında sona erecek teklifler

Ham AI skoru son kullanıcıya varsayılan olarak gösterilmemeli. Bunun yerine:

- `Sana çok uygun`
- `Popüler tercih`
- `Son 2 gün`

Demo modu etkinse detay drawer'ında AI skoru ve dönüşüm tahmini gösterilebilir.

### 8.2 Teklif kartı

Kart alanları:

- Kampanya tipi ikonu
- Başlık
- Kısa açıklama
- İndirim/avantaj değeri
- Geçerlilik tarihi
- `Sana özel` badge
- Ana CTA: `Teklifi İncele`

Kart renkleri:

- Beyaz yüzey
- Üstte küçük mavi/lacivert gradient alan
- Sarı CTA veya sarı accent
- Ağır görseller yerine temiz veri hiyerarşisi

### 8.3 Teklif detayı

- Kampanya başlığı ve avantaj
- Neden önerildiği hakkında kısa açıklama
- Koşullar
- Geçerlilik
- Kabul CTA'sı
- `İlgilenmiyorum` ikincil aksiyonu
- Geri bildirim confirm modal'ı

Kabul sonrası:

- Başarı ekranı/toast
- `Kabul edilen kampanyalara git`
- Event işlenirken optimistic UI kullanılabilir; başarısızlıkta rollback yapılmalı

### 8.4 Memnuniyet puanı

Teklif etkileşimi sonrası:

- 1-5 yıldız
- Her yıldızın erişilebilir label'ı
- Tek seferlik gönderim
- Gönderim sonrası düzenleme kapalıysa UI bunu belirtmeli
- Düşük puanda opsiyonel kısa neden seçimi: `Alakasız`, `Pahalı`, `Zamanlama uygun değil`, `Diğer`

---

## 9. Kampanya Uzmanı Dashboard'u

### 9.1 Üst KPI kartları

Dört veya beş kart:

- Aktif vakalarım
- Kritik vakalar
- Bugün tamamlanan
- SLA uyum oranım
- Toplam puan / seviye

Kart tasarımı:

- Beyaz kart
- Üstte küçük ikon ve label
- Büyük metrik
- Önceki döneme göre trend
- Kartın tamamı yalnızca detay sayfasına gidiyorsa clickable olmalı

### 9.2 Öncelikli vaka alanı

`Öncelikli vakalarım` tablosu veya kart listesi:

- Vaka no
- Kampanya
- Segment
- Öncelik
- Durum
- Kalan SLA
- AI dönüşüm tahmini
- Aksiyon

Varsayılan sıralama:

1. SLA aşmış
2. KRITIK
3. YUKSEK
4. En az kalan süre

### 9.3 Gamification özeti

- Seviye kartı
- Son kazanılan rozet
- Haftalık sıralama
- Sonraki seviyeye kalan puan progress'i
- `Liderlik tablosunu gör` bağlantısı

### 9.4 Hızlı aksiyonlar

- `Yeni kampanya oluştur`
- `Atanmış vakaları aç`
- `Test sonucu bekleyenler`
- `Bildirimler`

---

## 10. Kampanya Oluşturma Wizard'ı

Tek uzun form yerine 3-4 adımlı wizard kullan.

### Adım 1 - Temel bilgiler

- Başlık
- Kampanya tipi:
  - Ek Paket
  - Tarife Yükseltme
  - Cihaz Fırsatı
  - Sadakat
- Kısa açıklama

### Adım 2 - Hedefleme

- Hedef segment
- Bölge veya ek filtreler backend destekliyorsa
- Hedef abone sayısı tahmini

### Adım 3 - Teklif

- İndirim oranı
- Başlangıç tarihi
- Bitiş tarihi
- Ek koşullar

### Adım 4 - Ön izleme ve yayınlama

- Abone kartı ön izlemesi
- Girilen değerlerin özeti
- AI analizinin tetikleneceğine dair bilgi
- `Kampanyayı Oluştur` CTA

Başarılı sonuç:

- Kampanya numarası
- AI analiz durumu
- İlgili kampanya detayına geçiş

AI Service kapalıysa:

- Kampanya oluşturma başarısız görünmemeli
- Başarı ekranında sarı uyarı:
  - `Kampanya oluşturuldu. AI analizi şu anda kullanılamadığı için segment BELIRSIZ ve öncelik ORTA olarak kaydedildi.`
- `Manuel optimizasyon kuyruğunu aç` aksiyonu

---

## 11. Optimizasyon Vaka Listesi

### 11.1 Filtreler

- Arama: vaka no, kampanya, uzman
- Durum
- Segment
- Öncelik
- SLA durumu
- Atanan uzman
- Tarih aralığı

Filtreler URL query parametrelerine yansıtılmalı.

### 11.2 Desktop tablo

Kolonlar:

- Vaka No
- Kampanya
- Segment
- Öncelik
- Durum
- Uzman
- Dönüşüm Tahmini
- Kalan SLA
- Son Güncelleme
- Aksiyon

Tablo özellikleri:

- Server-side pagination
- Server-side sorting
- Sticky header
- Row selection yalnızca gerçek toplu aksiyon varsa
- Kolon gizleme opsiyonel
- Row click ile detay
- İç içe buton click'leri row navigation'ı tetiklememeli

### 11.3 Mobil görünüm

Tabloyu yatay scroll'a zorlamak yerine kart listesine dönüştür:

- Vaka no + öncelik
- Kampanya
- Durum
- Kalan SLA
- Segment
- `Detayı Aç`

---

## 12. Vaka Detay ve Çalışma Alanı

Desktop için iki kolon:

- Sol: vaka ana içeriği
- Sağ: özet, SLA ve aksiyonlar

### 12.1 Üst özet

- Vaka numarası
- Durum badge
- Öncelik badge
- Kampanya
- Atanan uzman
- Son güncelleme

### 12.2 AI içgörü kartı

- AI segmenti
- Öneri skoru
- Dönüşüm olasılığı
- Önerilen uzman
- Skor açıklaması, backend sağlıyorsa
- `AI çıktısını değiştir` aksiyonu yalnızca yetkili roller için

Override sırasında:

- Yeni segment
- Değişiklik nedeni zorunlu
- `Bu değişiklik AI doğruluk metriğine yansıyacaktır` bilgisi

### 12.3 SLA kartı

- Kalan süre: `01:42:18`
- Başlangıç zamanı
- SLA hedefi
- Aşım durumu
- Progress bar
- Kritik durumda kırmızı ama erişilebilir görünüm

Süre sayacı saniyelik güncellenebilir; tüm tablo hücrelerinde saniyelik re-render yapma. Liste ekranında dakika hassasiyeti yeterlidir.

### 12.4 Timeline

State machine geçmişi:

- YENI
- ATANDI
- OPTIMIZE_EDILIYOR
- TEST_EDILIYOR
- TAMAMLANDI
- YAYINDA
- ARSIVLENDI

Her adımda:

- Tarih/saat
- İşlemi yapan
- Not
- Event türü

### 12.5 A/B test alanı

- Test başlatma formu
- Varyant A ve B özetleri
- Başlangıç tarihi
- Metrik seçimi
- Sonuç kartı
- Test devam ediyorsa durum ve tahmini bitiş

### 12.6 Optimizasyon tamamlama

- Optimizasyon notu zorunlu
- Elde edilen dönüşüm artışı
- İlgili kanıt veya sonuç özeti
- Confirm modal
- Başarılı tamamlamada:
  - Puan toast'u
  - Rozet kazanıldıysa modal/toast
  - Dashboard metriklerinin invalidate edilmesi

State transition butonları yalnızca izin verilen geçişlerde aktif olmalı. İzin verilmeyen geçişleri yalnızca gizlemek yerine uygun durumlarda disabled ve açıklamalı tooltip ile göstermek demo anlatımını kolaylaştırır.

---

## 13. Süpervizör Dashboard'u

Bu ekran jürinin ana değerlendirme ekranlarından biridir. İlk viewport içinde en önemli metrikler görünmelidir.

### 13.1 Header ve filtreler

- Başlık: `Operasyon Dashboard'u`
- Tarih filtresi: 7 gün, 30 gün, 90 gün, özel aralık
- Bölge filtresi
- Segment filtresi
- `Verileri Yenile`
- Son güncellenme zamanı

### 13.2 KPI satırı

En az beş kart:

1. Aktif kampanya
2. Genel dönüşüm oranı
3. SLA uyum oranı
4. AI doğruluk oranı
5. Bekleyen optimizasyon vakası

Opsiyonel altıncı:

6. Kritik aktif vaka

KPI kartlarında:

- Değer
- Trend
- Önceki dönem karşılaştırması
- Kısa tooltip tanımı

### 13.3 Ana grafik grid'i

#### Kampanya dağılımı

- Segment bazlı donut veya bar chart
- Segment label ve değer
- Legend tıklanınca filtre

#### Dönüşüm trendi

- Line chart
- Gerçekleşen dönüşüm
- Tahmin edilen dönüşüm opsiyonel ikinci seri
- Tarih bazlı tooltip

#### SLA uyumu

- Yüzde metrik + bar/gauge
- Uyan, yaklaşan, aşan vaka dağılımı

#### AI doğruluk

- Genel accuracy
- Kategori bazlı breakdown
- Confusion-matrix benzeri görünüm yalnızca veri yeterliyse
- Örnek sayısı gösterilmeli; düşük örnek sayısı yanlış güven yaratmamalı

### 13.4 Uzman performansı tablosu

Kolonlar:

- Uzman
- Aktif vaka
- Kapasite
- Tamamlanan
- Ortalama çözüm süresi
- SLA uyumu
- Ortalama dönüşüm artışı
- Puan

Kapasite görselleştirmesi:

- `7 / 10`
- Progress bar
- Doluysa warning

### 13.5 Bekleyen optimizasyon kuyruğu

- BELIRSIZ segmentler
- Kapasite bekleyenler
- AI Service hatası nedeniyle düşenler
- `Manuel Ata` aksiyonu

Manuel atama drawer'ı:

- Uygun uzmanlar
- Uzmanlık eşleşmesi
- Mevcut yük
- Performans
- Atama skoru, backend sağlıyorsa
- Seçim nedeni
- Onay

---

## 14. AI Insights Ekranı

### 14.1 Üst metrikler

- Genel doğruluk
- Toplam sınıflandırma
- Override sayısı
- En iyi segment
- En düşük doğruluklu segment

### 14.2 Kategori doğruluğu

Her kategori için:

- Doğru / toplam
- Yüzde
- Trend
- Override sayısı

### 14.3 Override tablosu

- Vaka
- AI segmenti
- Yeni segment
- Değiştiren kişi
- Neden
- Tarih

### 14.4 Veri dürüstlüğü

- Veri yokken yüzdeyi `0%` olarak gösterme; `Henüz yeterli veri yok` göster.
- Payda küçükse tooltip ile örnek sayısını belirt.
- Tahmin ve gerçekleşen değerleri görsel olarak ayır.

---

## 15. Gamification ve Liderlik

### 15.1 Profil kartı

- Avatar veya baş harf
- Ad soyad
- Seviye
- Toplam puan
- Sonraki seviyeye kalan puan
- Günlük sıralama
- Haftalık sıralama

### 15.2 Rozet galerisi

Rozetler:

- İlk Kampanya
- Hız Ustası
- Dönüşüm Kralı
- Maratoncu
- Churn Avcısı
- Uzman

Kazanılmayan rozetler tamamen gizlenmemeli. Kilitli halde şartı gösterilebilir. Bu motivasyon sağlar.

### 15.3 Liderlik tablosu

- Günlük / haftalık tab
- İlk 10 kişi
- Kullanıcının sırası ilk 10 dışında olsa bile sabit bir `Senin sıran` satırı
- Puan
- Seviye
- Tamamlanan vaka

### 15.4 Rozet bildirimi

`badge.earned` event'i geldiğinde:

- Ekranın sağ üstünde toast
- Önemli rozetlerde kısa modal
- Reduced motion desteği
- Aynı event iki kez gelirse duplicate bildirim gösterme

---

## 16. Admin Ekranları

### 16.1 Personel listesi

- Ad soyad
- E-posta
- Rol
- Uzmanlık alanları
- Bölgeler
- Durum
- Son giriş
- Aksiyon

### 16.2 Personel oluşturma

- Ad
- Soyad
- E-posta
- Geçici şifre veya davet akışı
- Rol
- Çoklu uzmanlık seçimi
- Çoklu bölge seçimi
- Aktif/pasif

Şifre politikası frontend'de canlı checklist ile gösterilmeli; backend hata mesajı yine nihai kaynak olmalı.

### 16.3 Audit log

Filtreler:

- Kullanıcı
- İşlem tipi
- Sonuç
- IP
- Tarih
- Kaynak ID

Kolonlar:

- Zaman
- Kullanıcı
- İşlem
- Kaynak
- IP
- Sonuç
- Detay

Detaylar drawer içinde gösterilmeli. JSON varsa syntax-highlight ve kopyalama eklenebilir; hassas token/şifre değerleri asla gösterilmemeli.

---

## 17. Bileşen Kataloğu

Aşağıdaki bileşenler ortak, typed ve tekrar kullanılabilir olmalıdır:

### Temel

- `Button`
- `IconButton`
- `Input`
- `PasswordInput`
- `PhoneInput`
- `OtpInput`
- `Textarea`
- `Select`
- `MultiSelect`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `DatePicker`
- `DateRangePicker`
- `FormField`

### Navigation

- `AppSidebar`
- `AppHeader`
- `Breadcrumbs`
- `Tabs`
- `SegmentedControl`
- `MobileNavigation`

### Data display

- `Card`
- `MetricCard`
- `StatusBadge`
- `PriorityBadge`
- `SegmentBadge`
- `Progress`
- `SlaCountdown`
- `Avatar`
- `Tooltip`
- `DataTable`
- `Pagination`
- `Timeline`
- `EmptyState`
- `ErrorState`
- `Skeleton`

### Overlay/feedback

- `Modal`
- `ConfirmDialog`
- `Drawer`
- `Toast`
- `InlineAlert`
- `ServiceDegradationBanner`

### Domain

- `CampaignCard`
- `OfferCard`
- `CaseCard`
- `AiInsightCard`
- `ExpertCapacityCard`
- `BadgeCard`
- `LeaderboardTable`
- `CampaignWizard`
- `ManualAssignmentDrawer`

Her bileşenin:

- loading davranışı
- disabled hali
- error hali
- keyboard davranışı
- mobile davranışı
- test senaryosu

belirlenmelidir.

---

## 18. Loading, Empty, Error ve Offline State'ler

UI/UX puanı için yalnızca başarılı ekranlar yeterli değildir.

### 18.1 Loading

- İlk sayfa yüklemede skeleton
- Buton aksiyonunda spinner + label
- Tablo filtrelemede mevcut veri tamamen kaybolmamalı; hafif loading overlay
- Grafik yüklemede grafik boyutunu koruyan skeleton

### 18.2 Empty

Örnekler:

- `Henüz sana özel teklif bulunmuyor.`
- `Atanmış aktif vakan bulunmuyor.`
- `Bu filtrelerle eşleşen kayıt yok.`
- `AI doğruluk metriği için henüz yeterli veri oluşmadı.`

Empty state'e mümkünse anlamlı CTA ekle.

### 18.3 Error

- Teknik stack trace gösterme
- Hata kodu gerekiyorsa kopyalanabilir referans ID göster
- `Tekrar Dene`
- Yetki hatasını genel ağ hatası gibi sunma
- Validation hatasını toast yerine ilgili alanda göster

### 18.4 Kısmi servis kesintisi

- AI Service yoksa kampanya ve vaka ekranları açılmalı
- Gamification yoksa operasyon tamamlanabilmeli, puan için `Güncelleme bekleniyor` gösterilmeli
- Bir grafik endpoint'i hatalıysa tüm dashboard yerine yalnızca ilgili kart error state olmalı

---

## 19. Responsive Tasarım Kuralları

Breakpoint önerisi:

- `< 640`: mobile
- `640-767`: large mobile
- `768-1023`: tablet
- `1024-1279`: small desktop
- `>= 1280`: desktop

### Mobil öncelikleri

Abone:

- Tek sütun
- Büyük dokunma alanları
- Sabit alt navigation
- Teklif kartlarında CTA görünür

Personel:

- KPI kartları yatay scroll yerine 1-2 sütun grid
- Tablolar kart listesine dönüşür
- Filtreler bottom sheet/drawer
- Kritik aksiyonlar sticky footer olabilir

Minimum dokunma alanı: 44x44 px.

---

## 20. Erişilebilirlik

WCAG 2.1 AA hedefle.

Zorunlu maddeler:

- Tüm form alanlarında görünür label
- Placeholder label yerine geçmez
- Keyboard ile tüm akış tamamlanabilir
- Modal focus trap
- Modal kapanınca focus tetikleyiciye döner
- Görünür focus ring
- Grafikler için metinsel özet veya erişilebilir tablo
- Yalnızca renkle durum anlatma
- `aria-live` ile toast ve form hata özeti
- İkon butonlarda erişilebilir isim
- Kontrast testi
- `prefers-reduced-motion`
- Yıldız puanlama keyboard ile çalışmalı
- OTP input screen reader ile anlamlı okunmalı

---

## 21. Frontend Güvenliği

Frontend güvenlik duvarı değildir; fakat risk yüzeyini büyütmemelidir.

### 21.1 Token

Tercih edilen model:

- Refresh token: secure, httpOnly, sameSite cookie
- Access token: memory veya backend mimarisine uygun güvenli yöntem
- Token'ları URL, console veya error analytics'e yazma
- LocalStorage'a refresh token koyma

Backend mevcutta farklı çalışıyorsa API sözleşmesini bozma; güvenlik riskini dokümante et.

### 21.2 XSS

- `dangerouslySetInnerHTML` kullanma
- Kullanıcı notlarını düz metin olarak render et
- Rich text zorunluysa güvenilir sanitizer kullan
- URL parametrelerini doğrudan DOM'a basma

### 21.3 Yetki

- Route guard uygula
- Menüyü permission'a göre filtrele
- 403 response'u doğru yönet
- ID değiştirilerek veri gelirse frontend bunu güvenli kabul etmemeli; backend kontrolü beklenir

### 21.4 Form ve hata

- Backend hata mesajını kontrolsüz HTML olarak render etme
- Hassas alanlarda autocomplete kararını bilinçli ver
- Şifre input'unda paste'i engelleme
- Brute force/rate limit durumunda geri sayım göster

---

## 22. API Entegrasyon Katmanı

### 22.1 Standart response

Beklenen yapı:

```ts
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
}
```

### 22.2 API client

Tek merkezli client:

- Base URL env'den
- Auth header/cookie yönetimi
- Correlation ID okuma
- Error normalization
- 401 refresh kuyruğu
- Request cancellation
- Timeout

### 22.3 Query key standardı

```ts
queryKeys.campaigns.list(filters)
queryKeys.campaigns.detail(id)
queryKeys.cases.list(filters)
queryKeys.cases.detail(id)
queryKeys.dashboard.supervisor(range, filters)
queryKeys.game.leaderboard(period)
queryKeys.ai.accuracy(filters)
```

### 22.4 Retry

- GET için kısa ve kontrollü retry
- 400/401/403/422 için otomatik retry yok
- Mutation'larda otomatik retry varsayılan olarak kapalı
- Idempotency backend destekliyorsa kritik mutation'larda header kullan

### 22.5 Mock adapter

API hazır değilse:

- UI bileşenleri içinde inline JSON yazma
- `src/mocks` veya adapter katmanı oluştur
- Mock data domain type'larıyla aynı olmalı
- Network delay ve error scenario desteklenmeli
- `VITE_API_MODE=mock|real` benzeri env ile geçiş

---

## 23. Real-time Güncellemeler

Backend WebSocket/SSE sağlıyorsa:

- `badge.earned`
- `case.assigned`
- `case.sla_breached`
- `campaign.optimized`
- `service.status.changed`

Frontend davranışı:

- Event'i deduplicate et
- İlgili query'yi invalidate et
- Kullanıcıya ölçülü toast göster
- Connection lost durumunda banner
- Exponential backoff reconnect

Gerçek zamanlı altyapı yoksa:

- Dashboard için 30-60 saniye polling
- Aktif vaka detayında daha kısa polling
- Arka planda görünmeyen sekmede polling azalt

---

## 24. Klasör Yapısı

Mevcut proje farklı değilse önerilen yapı:

```text
src/
  app/
    router/
    providers/
    layouts/
  assets/
  components/
    ui/
    data-display/
    feedback/
    navigation/
  features/
    auth/
    offers/
    campaigns/
    cases/
    dashboard/
    ai-insights/
    gamification/
    admin/
  services/
    api/
    realtime/
  hooks/
  stores/
  schemas/
  types/
  utils/
  styles/
    tokens.css
    globals.css
  mocks/
  tests/
```

Feature klasöründe:

```text
features/cases/
  api/
  components/
  hooks/
  pages/
  schemas/
  types/
  utils/
```

Kurallar:

- `components/ui` domain bilgisinden bağımsız olmalı
- Domain bileşeni ilgili feature içinde kalmalı
- Barrel export'ları döngüsel bağımlılık yaratacak şekilde abartma
- API DTO ile UI model aynı değilse mapper kullan

---

## 25. İsimlendirme ve Kod Kalitesi

- Component: PascalCase
- Hook: `useXxx`
- Query keys: merkezi
- Route path: kebab-case
- API enum değerlerini UI'da doğrudan gösterme
- Enum label map kullan:

```ts
const caseStatusLabels = {
  YENI: 'Yeni',
  ATANDI: 'Atandı',
  OPTIMIZE_EDILIYOR: 'Optimize Ediliyor',
  TEST_EDILIYOR: 'Test Ediliyor',
  TAMAMLANDI: 'Tamamlandı',
  YAYINDA: 'Yayında',
  ARSIVLENDI: 'Arşivlendi',
} as const;
```

- `any` kullanma; zorunluysa gerekçeli ve dar kapsamlı olsun
- Devasa page component oluşturma
- 300+ satırlık bileşenleri parçala
- İş kurallarını JSX içine gömme
- Tarih/sayı formatlamayı merkezi helper ile yap

---

## 26. Türkçe Lokalizasyon ve Formatlama

- UI dili Türkçe
- Sayılar: `tr-TR`
- Para: `TRY`
- Yüzdeler locale-aware
- Tarih/saat: kullanıcıya `Europe/Istanbul` bağlamında göster
- API ISO tarihlerini parse et; string kesip biçme
- Teknik enum değerlerini kullanıcıya gösterme
- Kampanya numarası gibi kimlikler monospaced olabilir

Örnekler:

- `18 Tem 2026, 17:22`
- `%18,4`
- `₺800/ay`
- `1 sa 42 dk kaldı`

---

## 27. Grafik Kuralları

- Grafik başlığı, açıklaması ve tarih aralığı bulunmalı
- Tooltip değerleri locale formatlı olmalı
- Legend okunabilir olmalı
- Aynı kavram her ekranda aynı renk
- 3D chart kullanma
- Donut chart'ta fazla kategori varsa bar chart tercih et
- Eksen label'larını kesme
- Grafik sıfır durumunu ayırt et
- Export zorunlu değil; gerekiyorsa PNG/CSV aksiyonu eklenebilir
- Mobilde grafik yüksekliği 240-280 px

---

## 28. Test Stratejisi

### 28.1 Unit/component

En az:

- Phone input normalization
- OTP davranışı
- Permission guard
- Status/priority label mapper
- SLA countdown
- API error normalization
- Campaign wizard validation
- Vaka transition aksiyon görünürlüğü

### 28.2 Integration

- Abone login -> OTP -> teklifler
- Personel login -> dashboard
- Kampanya oluşturma -> başarı
- AI Service unavailable -> degrade success
- Vaka tamamlama -> puan/rozet bildirimi
- Manuel uzman atama
- Audit log filtreleme

### 28.3 E2E

Jüri demosuna uyumlu akış:

1. Kampanya uzmanı giriş yapar
2. Kampanya oluşturur
3. AI skoru/segment/tahmin görülür
4. Vaka uzmana atanır
5. Uzman vakayı tamamlar
6. Liderlik puanı güncellenir
7. AI Service kapalı simülasyonunda kampanya yine oluşturulur
8. Yetkisiz kullanıcı supervisor route'una gidince 403 görür

### 28.4 Visual regression

Kritik ekranlar:

- Login desktop/mobile
- Uzman dashboard
- Supervisor dashboard
- Vaka detay
- Kampanya wizard
- Abone teklif listesi

---

## 29. Performans

- Route-level code splitting
- Büyük chart modüllerini lazy load
- Görseller optimize
- Avatar/logo için layout shift önle
- Tablo virtualization yalnızca gerçekten büyük veri varsa
- Filtre input'larında debounce
- Query cache sürelerini veri türüne göre ayarla
- Dashboard isteklerini gereksiz tekrar çağırma
- Saniyelik SLA timer nedeniyle tüm sayfayı re-render etme
- Lighthouse hedefi, demo cihazında makul performans ve layout stability

---

## 30. Telemetri ve Loglama

Frontend telemetry altyapısı varsa:

- Page view
- Login success/failure kategorisi, hassas veri olmadan
- Campaign create success/error
- Offer accept/reject
- Manual assignment
- Case completion
- UI error boundary

Asla loglanmaması gerekenler:

- Şifre
- OTP
- Access/refresh token
- Tam GSM/e-posta, maskeleme olmadan
- Kişisel not içerikleri

---

## 31. Error Boundary ve Recovery

- Uygulama kökünde global error boundary
- Büyük modüllerde feature-level error boundary
- Hata ekranında:
  - Kullanıcı dostu mesaj
  - Tekrar dene
  - Dashboard'a dön
  - Referans ID, varsa
- Development dışında stack trace gösterme

---

## 32. Sayfa Bazlı Kabul Kriterleri

### Login

- Abone/personel geçişi çalışır
- Validasyonlar erişilebilir
- OTP akışı çalışır
- Kilitli hesap kalan süre gösterir
- Mobilde taşma yok

### Abone teklifler

- Öncelikli teklif üstte
- Kabul/reddet çalışır
- Rating akışı çalışır
- Loading/empty/error mevcut

### Uzman dashboard

- KPI'lar
- Öncelikli vakalar
- SLA bilgisi
- Gamification özeti
- Hızlı aksiyonlar

### Vaka detay

- AI içgörü
- State timeline
- SLA countdown
- Test alanı
- Zorunlu optimizasyon notu
- Doğru geçiş aksiyonları

### Supervisor dashboard

- Segment dağılımı
- Dönüşüm trendi
- SLA uyum ve aşım
- AI doğruluk
- Uzman performansı
- Bekleyen kuyruk
- Manuel atama

### Admin

- Personel CRUD UI
- Role/region/expertise alanları
- Audit filtreleri ve detay drawer

---

## 33. Claude Uygulama Sırası

Aşağıdaki sırayı izle ve her faz sonunda build/test çalıştır.

### Faz 0 - Repository inceleme

- Frontend framework'ü belirle
- Mevcut route, auth, API client ve CSS yaklaşımını analiz et
- Kırılacak noktaları listele
- Gereksiz dosya silme

### Faz 1 - Design tokens ve temel UI

- Renk, tipografi, spacing, radius
- Button, input, card, badge, alert, modal, drawer, skeleton
- Global styles

### Faz 2 - App shell ve routing

- Layout
- Sidebar/header
- Permission-aware menu
- Error routes

### Faz 3 - Auth

- Birleşik login
- Abone GSM/OTP
- Personel e-posta/şifre
- Session/route guard

### Faz 4 - Uzman modülü

- Dashboard
- Campaign list/create/detail
- Case list/detail
- Gamification/profile/leaderboard

### Faz 5 - Supervisor modülü

- KPI ve grafikler
- Queue
- Experts
- AI insights
- Manual assignment

### Faz 6 - Abone modülü

- Offers
- Offer detail
- Accept/reject
- Rating

### Faz 7 - Admin

- Users
- User form
- Audit logs

### Faz 8 - Resilience ve responsive

- Loading/empty/error
- Service degradation
- Mobile/tablet
- A11y

### Faz 9 - Test ve final kalite

- Unit/integration/E2E
- Build
- Type-check
- Lint
- Responsive kontrol
- Demo akışı

---

## 34. Claude Çalışma Kuralları

1. Önce repository'yi incele; doğrudan tüm projeyi yeniden yazma.
2. Backend koduna dokunma. Endpoint eksikse mock adapter veya TODO interface oluştur.
3. Her sayfada gerçekçi Türkçe seed/mock veri kullan.
4. Lorem ipsum kullanma.
5. Her aşamada TypeScript hatalarını temizle.
6. Responsive olmayan geçici ekran bırakma.
7. `console.log` ve debug UI bırakma.
8. Secret veya token commit etme.
9. Yalnızca happy path üretme; error/empty/loading state ekle.
10. Tasarım sistemini bypass eden tek seferlik inline renklerden kaçın.
11. Sunum sırasında anlatılabilir bir hiyerarşi kur.
12. Finalde hangi dosyaları değiştirdiğini, hangi route'ları eklediğini ve hangi testleri çalıştırdığını özetle.

---

## 35. Örnek Demo Verileri

### Kullanıcılar

- Abone: `Ayşe Yılmaz`
- Uzman: `Mert Kaya` - Churn Önleme, Marmara
- Süpervizör: `Selin Demir`
- Admin: `Can Arslan`

### Kampanyalar

- `CMP-2026-000123` - 20 GB Ek Paket Fırsatı
- `CMP-2026-000124` - Platinum Tarife Yükseltme
- `CMP-2026-000125` - Yeni Abone Cihaz İndirimi
- `CMP-2026-000126` - Sadakat Yılı Hediyesi

### Örnek metrikler

- Genel dönüşüm: `%18,4`
- SLA uyumu: `%92,6`
- AI doğruluk: `%87,3`
- Aktif vaka: `146`
- Bekleyen kuyruk: `12`
- Kritik vaka: `4`

### Örnek vaka

- No: `CMP-2026-000123`
- Segment: `RISKLI_KAYIP`
- Öncelik: `YUKSEK`
- Durum: `OPTIMIZE_EDILIYOR`
- Dönüşüm tahmini: `%34`
- Öneri skoru: `0,84`
- SLA: `1 sa 42 dk kaldı`

---

## 36. Görsel Kontrol Listesi

- [ ] Turkcell mavi-sarı kimliği hissediliyor
- [ ] Dashboard bir e-ticaret sayfası gibi görünmüyor
- [ ] Sarı yalnızca vurgu ve ana CTA için kontrollü kullanılıyor
- [ ] Koyu lacivert geniş yüzeylerde beyaz metin kontrastı yeterli
- [ ] Kart radius ve gölge değerleri tutarlı
- [ ] Tablolar okunabilir ve aşırı sıkışık değil
- [ ] Grafik renkleri segment eşlemesiyle tutarlı
- [ ] Login referans görseldeki merkezlenmiş, ferah yapıyı koruyor
- [ ] Mobilde yatay overflow yok
- [ ] Loading, empty, error ve service degradation state'leri mevcut
- [ ] Focus ring görünür
- [ ] Kritik durum yalnızca kırmızı renkle anlatılmıyor

---

## 37. Definition of Done

Frontend aşağıdaki koşullar sağlandığında tamamlanmış kabul edilir:

- Tüm rol route'ları çalışır
- Login ve OTP akışı tamamlanır
- Permission-aware navigation uygulanır
- Abone teklif akışı uçtan uca çalışır
- Kampanya oluşturma wizard'ı çalışır
- Vaka state transition UI'ı çalışır
- Uzman gamification ekranları çalışır
- Supervisor dashboard zorunlu tüm bileşenleri içerir
- Manuel atama akışı çalışır
- Admin kullanıcı ve audit ekranları çalışır
- API unavailable ve partial outage state'leri vardır
- Responsive görünüm tamamlanmıştır
- WCAG AA açısından temel kontroller yapılmıştır
- Type-check, lint ve build başarılıdır
- Kritik akış testleri geçer
- Demo sırasında veri hiyerarşisi anlaşılırdır
- Kod içinde secret, hard-coded token veya production'a uygun olmayan demo bilgi yoktur

---

## 38. Final Teslim Çıktısı

Claude çalışma sonunda şunları sağlamalıdır:

1. Çalışan frontend kodu
2. Güncellenmiş route haritası
3. Tasarım token dosyaları
4. Ortak UI bileşenleri
5. Rol bazlı sayfalar
6. Mock/real API geçiş mekanizması
7. Testler
8. `FRONTEND_README.md` içinde:
   - Kurulum
   - Environment değişkenleri
   - Route listesi
   - Demo kullanıcıları
   - Mock mod kullanımı
   - Tasarım sistemi özeti
   - Bilinen sınırlamalar
9. Son mesajda:
   - Değiştirilen dosyalar
   - Uygulanan ekranlar
   - Çalıştırılan komutlar
   - Build/test sonucu
   - Kalan gerçek backend entegrasyon noktaları

---

## 39. Referans Notu

Tasarım dili için aşağıdaki kaynaklar referans alınmıştır:

- Turkcell güncel web ana sayfasının mavi üst navigasyon, sarı CTA, koyu lacivert kampanya alanı, büyük radius ve kart temelli görsel yaklaşımı
- Paylaşılan Hızlı Giriş ekranının merkezlenmiş beyaz kart, telefon/e-posta seçimi, tam genişlik mavi buton ve açık gradient arka plan yapısı
- CampaignCell final case dokümanındaki rol, kampanya, AI, gamification, dashboard, güvenlik, demo ve UI/UX gereksinimleri

Bu dosya frontend implementasyon talimatıdır. Backend iş mantığı ve mikroservis implementasyonu kapsam dışıdır.
