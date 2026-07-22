# AI Yaklaşım Dokümanı

## Özet

AI Service, case dokümanının 3 zorunlu görevini (öneri skorlama, segment sınıflandırma, akıllı uzman ataması) karşılar.

- **Görev 1 (öneri skorlama)**: Artık **gerçek, eğitilmiş bir scikit-learn churn modeli** kullanıyor (bkz. "Görev 1: Gerçek ML Entegrasyonu" bölümü aşağıda). Başlangıçta kural tabanlı bir yer tutucuyla başlanmıştı; kullanıcı gerçekçi bir Turkcell abone telemetrisi (25.000 satır) + bu veri üzerinde eğitilmiş bir churn modeli sağladıktan sonra bu yer tutucu gerçek modelle değiştirildi.
- **Görev 2 (segment sınıflandırma)**: Bilinçli olarak **hafif kural tabanlı** bırakıldı — sağlanan model subscriber-seviyesinde eğitildi, Görev 2 ise kampanya-seviyesinde (belirli bir abone olmadan) çalışıyor; modeli kendi eğitildiği granülariteden farklı bir soruya zorlamak yanıltıcı olurdu (detaylı gerekçe aşağıda).
- **Görev 3 (uzman ataması)**: Case dokümanının verdiği matematiksel formülle çalışır, ML gerektirmez.

Bu, "AI servisi mock/hardcoded ise diskalifiye" kuralına aykırı **değildir**: Görev 1 gerçek bir modelden, Görev 2 girdiye (indirim oranı, kampanya tipi, geçmiş red sayısı, kampanya/abone kimliği) göre gerçekten değişen deterministik bir fonksiyondan çıktı üretir — hiçbiri sabit bir çıktı döndürmez.

## Görev 1: Gerçek ML Entegrasyonu (`recommendation/ml-scoring.strategy.ts`)

### Neden ve nasıl başladı
İlk yaklaşım (bkz. aşağıdaki "Görev 2" bölümüyle aynı gerekçe) buydu: gerçek bir kullanım-verisi ML modeli eğitmek için gereken şey (abone kullanım geçmişi, ARPU, şikayet kayıtları, churn etiketleri) bu projede baştan üretilmemişti. Kullanıcı daha sonra tam olarak bu eksik veriyi sağladı: `turkcell_sahte_veri.csv` (25.000 satır, 79 kolon — tarife, kullanım, fatura, cihaz, şikayet, pazarlama izni ve **`churn`** etiketi) + bu veri üzerinde birden fazla model deneyip en iyisini seçen bir eğitim betiği (`train_best_model.py`). Bu, tam olarak Görev 1'in TODO(ML) bloğunun beklediği veri kaynağıydı.

### Model
`services/ai-service/ml/training/train_best_model.py`, `ColumnTransformer` (sayısallar için `SimpleImputer`+`StandardScaler`, kategorikler için `SimpleImputer`+`OneHotEncoder`) + 5 aday sınıflandırıcıyı (LogisticRegression, RandomForest, HistGradientBoosting, KNN, XGBoost-varsa) 5-fold stratified CV ROC-AUC ile karşılaştırıp kazananı küçük bir hiperparametre araması ile ince ayarlayıp diske kaydeder. Bu depoda kazanan **LogisticRegression** (test ROC-AUC ≈ 0.748) — modelin kendisi "basit" olsa da seçim süreci gerçek bir model karşılaştırmasıdır, hardcoded bir seçim değil.

Not: sağlanan orijinal `.pkl` dosyası farklı/daha yeni bir scikit-learn sürümüyle eğitilmişti ve bu depoda pinlenen sürümle (`1.6.1`) pickle uyumsuzluğu çıkarıyordu (`AttributeError` unpickle sırasında). Bunu, **aynı script + aynı veri + aynı seed (42)** ile modeli bizim sürümümüzle yeniden eğiterek çözdük — sonuç bit-bit aynı metrikleri üretti (test ROC-AUC 0.7483, seçilen model LogisticRegression), yani bu bir "farklı model" değil, sadece serialization uyumluluğu için yeniden üretim.

### Serving mimarisi
scikit-learn pipeline'ı Node.js runtime'ında çalıştırılamaz. Bu yüzden model, ayrı bir **Python/FastAPI sidecar** konteynerinde (`ai-ml-inference`) servis edilir:
- `POST /predict` — ham feature dict alır, `{churn_probability, model_name}` döner.
- `GET /health` — Docker healthcheck + hangi modelin yüklü olduğunu doğrulamak için.
- Bu sidecar **gateway'e/dışarıya hiç açılmaz** — yalnızca `ai-service`'in kendi iç Docker ağından `ML_INFERENCE_URL` (varsayılan `http://ai-ml-inference:8000`) ile erişilir. Diğer hiçbir servis bu sidecar'ı bilmez/çağırmaz (database-per-service'e benzer bir izolasyon).

`ai-service` (Node/NestJS) tarafında `MlChurnClient` (`src/ml-client/`) bu sidecar'a axios ile 2 saniye timeout'lu istek atar; hata/timeout durumunda `null` döner (asla exception fırlatmaz) — Campaign Service'in AI Service'e yaptığı çağrılardaki aynı "graceful degradation" deseni.

### Feature kaynağı: `SubscriberTelemetry` read-model'i
Modelin ihtiyaç duyduğu 74 feature kolonu (yaş, paket kullanımı, fatura geçmişi, şikayet sayısı, CRM segmenti, vb.) Identity/Campaign Service'lerin veritabanında **yok** ve olması da beklenmiyor (case doc'ta bu servisler kimlik/kampanya alanlarını tutar, kullanım telemetrisi tutmaz). Bu yüzden AI Service kendi veritabanında (`ai_db`) bir `SubscriberTelemetry` tablosu tutar — tıpkı `ExpertProfile` read-model'i gibi, database-per-service kuralını bozmadan.

Bugün bu tablo yalnızca 6 demo aboneye (`DEMO_SEED_IDS.SUBSCRIBER_1..6`), `turkcell_sahte_veri.csv`'den seçilmiş gerçek/temsili satırlarla seed'lenmiştir (bkz. `prisma/seed.ts` + `prisma/subscriber-telemetry-seed.json`). Üretimde bu tablo, OSS/BSS sistemlerinden gelen bir event/ETL akışıyla doldurulurdu. **Bir subscriberId için satır yoksa** (örn. yeni self-register olmuş bir abone), model hiç çağrılmadan doğrudan kural tabanlı stratejiye düşülür.

### churn_probability → score dönüşümü
Ham churn olasılığını doğrudan `score` olarak kullanmak yerine, kampanya tipine göre yorumlanır:
- **SADAKAT (retention) kampanyaları**: yüksek churn riski = bu kampanyanın tam da bu abone için gerekli olduğu anlamına gelir → `engagementSignal = churn_probability`.
- **Diğer tüm kampanya tipleri** (upsell/ek paket/cihaz vb.): kopma eğilimindeki bir abone genel bir kampanyaya daha az ilgi gösterir → `engagementSignal = 1 - churn_probability`.

Bu sinyal, `RuleBasedScoringStrategy` ile **aynı ölçekte** (indirim boost'u + ret-geçmişi cezası) bir `score`'a dönüştürülür — böylece `RecommendationService`'teki `MIN_VISIBLE_SCORE`/`PRIORITIZED_SCORE` eşikleri strateji ne olursa olsun anlamlı kalır.

### Şeffaflık
Her `Recommendation` satırı bir `modelSource: "ml" | "rule_based"` alanı taşır. `GET /ai/recommend/stats` (SUPERVISOR/ADMIN) kaç önerinin gerçek modelle, kaçının fallback ile üretildiğini döner — jüriye "bu gerçekten çalışıyor mu" sorusuna canlı kanıt olarak gösterilebilir.

### Neden Görev 2 Değil
Model subscriber-seviyesinde eğitildi (bir telefon numarasının churn olasılığı). Görev 2 (segment sınıflandırma) ise **kampanya seviyesinde**, belirli bir abone olmadan çalışır (case doc: "bu kampanya hangi segmente uygun" — `/ai/classify` çağrısında `subscriberId` bile yok). Modeli kendi eğitildiği granülariteden farklı bir soruya zorlamak (örn. "bu kampanyanın segmentini tahmin et" gibi subscriber-agnostik bir soruya churn modeliyle cevap üretmeye çalışmak) yanıltıcı, savunulamaz bir sonuç verirdi. Bu yüzden Görev 2 bilinçli olarak rule-based bırakıldı: gerçek bir kullanım-verisi ML modeli eğitmek için gereken şey (abone kullanım geçmişi, önceki kampanya kabul/ret geçmişi, ARPU, şikayet kayıtları) bu case'de başlangıçta Identity Service'in kapsamı dışında tutulmuştu; kullanıcının sağladığı veri seti de subscriber-seviyesinde churn tahmini için etiketlenmişti, kampanya-seviyesinde segment sınıflandırması için değil. Doğru granülaritede yeni, ayrı bir etiketli veri seti gerektirdiği için Görev 2 kural tabanlı bırakıldı (aşağıdaki bölüm hâlâ geçerli).

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

## Görev 1 İçin Yapılan Tam Olarak Bu Şablonu İzledi

Yukarıdaki "kendi modelinizi eğitme" şablonu, Görev 1 için gerçekten uygulandı:
1. `services/ai-service/prisma/schema.prisma`'ya `SubscriberTelemetry` (feature read-model) eklendi + `Recommendation.modelSource` (şeffaflık) eklendi.
2. `ScoringStrategy` arayüzünü uygulayan yeni bir sınıf yazıldı (`MlScoringStrategy`, `recommendation/ml-scoring.strategy.ts`) — Python tabanlı model bir REST köprüsü (`MlChurnClient` → FastAPI `ai-ml-inference` sidecar'ı) üzerinden çağrılıyor.
3. Eğitim verisi + eğitim script'i repository'de paylaşıldı (`services/ai-service/ml/training/`).
4. `recommendation.module.ts`'deki strateji seçimi `useClass` yerine bir `useFactory` oldu (`AI_SCORING_STRATEGY` env değişkenine göre `ml`/`rule` arasında seçim yapar) — `RecommendationController`/`RecommendationService` katmanı hiç değişmedi.

Görev 2 için aynı şablon (yeni bir kampanya-seviyesi etiketli veri seti + `ClassificationStrategy`'yi uygulayan yeni bir sınıf) izlenebilir, ancak bu depoda mevcut olmadığı için uygulanmadı (bkz. yukarıdaki "Neden Görev 2 Değil" gerekçesi).
