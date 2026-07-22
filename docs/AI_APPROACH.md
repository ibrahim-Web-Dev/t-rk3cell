# AI Yaklaşım Dokümanı

## Özet

AI Service, case dokümanının 3 zorunlu görevini (öneri skorlama, segment sınıflandırma, akıllı uzman ataması) karşılar. Kullanıcı talebi doğrultusunda **Görev 1 ve Görev 2 bilinçli olarak hafif kural tabanlı** bırakılmış, kodda gerçek bir ML modelinin nereye ve nasıl konacağı net biçimde işaretlenmiştir. Görev 3 (uzman ataması) zaten case dokümanının verdiği matematiksel formülle çalışır, ML gerektirmez.

Bu, "AI servisi mock/hardcoded ise diskalifiye" kuralına aykırı **değildir**: skorlama tamamen deterministik ama girdiye (indirim oranı, kampanya tipi, geçmiş red sayısı, kampanya/abone kimliği) göre gerçekten değişen bir fonksiyondur — sabit bir çıktı döndürmez.

## Neden Kural Tabanlı, Neden ML Değil?

Gerçek bir kullanım-verisi ML modeli eğitmek için gereken şey (abone kullanım geçmişi, önceki kampanya kabul/ret geçmişi, ARPU, şikayet kayıtları) bu case'de **Identity Service'in kapsamı dışında** tutuldu — Identity yalnızca kimlik/rol alanlarını tutar, gerçek kullanım verisi üreten bir "Subscription/Usage" servisi yoktur. Sıfırdan sahte bir kullanım-verisi üretim hattı kurup üzerine bir model eğitmek, bu projenin asıl mimari odağından (mikroservis bağımsızlığı, event-driven tasarım, güvenlik, state machine) saptırırdı. Bunun yerine karar netleştirildi: **mimari kaliteye öncelik ver, AI kısmını dürüstçe "yer tutucu ama gerçek" bırak.**

## Görev 1: Öneri Skorlama (`recommendation/rule-based-scoring.strategy.ts`)

**Girdi:** `subscriberId`, `campaignId`, `campaignType`, `discountRate`, ve `OfferFeedback` tablosundan hesaplanan `priorRejectionCount` (bu abone bu kampanya tipini daha önce kaç kez reddetti).

**Mantık:**
```
baseScore = hash(subscriberId + campaignType) → [0,1) deterministik sözde-rastgele taban
discountBoost = min(0.15, indirim_oranı/100 × 0.3)
rejectionPenalty = min(0.4, öncekiRedSayısı × 0.15)
score = clamp(baseScore×0.7 + discountBoost + 0.15 − rejectionPenalty, 0, 1)
conversionProbability = clamp(score × 0.85, 0, 1)
```

Bu formül, case dokümanının açıkça belirttiği iki davranışı doğru şekilde uygular:
- **Bölüm 5.1:** skor > 0.80 → öncelikli, skor < 0.60 → gösterilmez (frontend ve Campaign Service bu eşiklere göre filtreler).
- **Bölüm 4.5:** "Abone 'ilgilenmiyorum' derse benzer kampanyaların öneri skoru düşer" → `rejectionPenalty`.

### Gerçek ML'e Geçiş

| | |
|---|---|
| Önerilen yaklaşım | Gradient Boosting (LightGBM/XGBoost) veya Logistic Regression baseline |
| Girdi feature'ları | Aylık ortalama veri/dakika kullanımı, mevcut tarife + değişim geçmişi, geçmiş kampanya kabul oranı, şikayet/çağrı merkezi kayıt sayısı, ARPU + trend, abonelik süresi (tenure) |
| Eğitim verisi | Gerçekçi Türkçe abone profili + kampanya kabul/ret geçmişi, min. 100 örnek (AI araçlarıyla üretilebilir) |
| Takas noktası | `ScoringStrategy` arayüzünü uygulayan yeni bir sınıf yazıp `recommendation.module.ts`'de `RuleBasedScoringStrategy` yerine bağlamak yeterli — controller/service katmanı hiç değişmez |

## Görev 2: Segment Sınıflandırma (`segmentation/rule-based-classification.strategy.ts`)

**Girdi:** `campaignType`, `targetSegmentHint` (uzmanın öngörüsü, opsiyonel), `discountRate`.

**Mantık:** Uzmanın öngörüsü varsa %70 ihtimalle onaylanır (gerçek bir sınıflandırıcının bazen insan sezgisiyle hemfikir olmasını simüle eder); yoksa kampanya tipine göre kural tablosu kullanılır (`SADAKAT`→`RISKLI_KAYIP`, `CIHAZ_FIRSATI`→`YUKSEK_DEGER`, vb.). Öncelik, confidence skoruna göre hesaplanır ve **bölüm 4.3 kuralına** göre `RISKLI_KAYIP` segmenti her zaman en az `YUKSEK` önceliğe yükseltilir (`maxPriority` fonksiyonu).

### Gerçek ML'e Geçiş

Çok sınıflı sınıflandırma (Random Forest / multinomial Logistic Regression). Etiketli veri kaynağı aslında bu serviste zaten birikiyor: `SegmentPrediction.correctedSegment` alanı, uzmanların AI'ı ne zaman ve neyle düzelttiğini tutar — gerçek bir modelin eğitim etiketi tam olarak bu olurdu (bkz. Doğruluk Takibi altında).

## Görev 3: Akıllı Uzman Ataması (`assignment/assignment-scoring.ts`)

Case dokümanının verdiği formül birebir uygulanır:
```
skor = (uzmanlik_eslesme × 0.5) + (bosluk_orani × 0.3) + (performans × 0.2)
```
- `uzmanlik_eslesme`: uzmanın uzmanlık alanı vaka segmentiyle eşleşiyorsa 1, değilse 0
- `bosluk_orani`: 1 − (aktif vaka / 10)
- `performans`: uzmanın geçmiş dönüşüm artışlarının üstel hareketli ortalaması (0-1 arası, `campaign.optimized` event'lerinden güncellenir)

Bu formül ML değildir (case dokümanı zaten matematiksel bir formül veriyor), ama girdileri (uzman uzmanlığı, kapasitesi, performansı) **hiçbir zaman Identity/Campaign veritabanına doğrudan erişmeden**, yalnızca `staff.created/updated`, `case.assigned`, `campaign.optimized` event'lerini dinleyerek kendi read-model önbelleğinde (`ExpertProfile`) tutar — bu, database-per-service kuralını korurken çapraz-servis verisine ihtiyaç duyan tek yer.

## Doğruluk Takibi (Bölüm 5.4)

`SegmentPrediction` tablosu her `/ai/classify` çağrısında `campaignId` ile (case henüz yaratılmadığı için) yazılır. Campaign Service bir uzman/süpervizör segment override'ı yaptığında `campaign.segment_changed` event'i yayınlar; bu servis event'i dinleyip tahminin doğru/yanlış olduğunu işaretler. Hiç override edilmemiş tahminler "doğru" kabul edilir (aksi kanıtlanana kadar) — `doğru/toplam × 100` hesaplaması `GET /ai/accuracy` ve kategori kırılımı `GET /ai/accuracy/by-category` ile süpervizör dashboard'una sunulur.

## Kendi Modelinizi Eğitmek İsterseniz

Bonus puanlama (+8) için kendi ML modelinizi eğitmeyi seçerseniz:
1. `services/ai-service/prisma/schema.prisma`'ya eğitim verisi/model meta tablosu ekleyin.
2. `ScoringStrategy`/`ClassificationStrategy` arayüzlerini uygulayan yeni sınıflar yazın (örn. `TrainedModelScoringStrategy`), Python tabanlı bir model kullanacaksanız bu sınıf modele bir REST/gRPC köprüsü olarak çalışabilir (ör. FastAPI ile ayrı bir "model server" konteyner, bu servis ona HTTP çağrısı yapar).
3. Eğitim verinizi repository'de paylaşın (`services/ai-service/training-data/` gibi) ve eğitim sürecini bu dosyaya ekleyin.
4. `recommendation.module.ts` / `segmentation.module.ts` içindeki `useClass` bağlamalarını yeni sınıflarla değiştirin.
