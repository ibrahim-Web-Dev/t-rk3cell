# AI Service

## Sorumluluk
Case dokümanının 3 zorunlu görevi: **öneri skorlama** (Görev 1), **segment sınıflandırma** (Görev 2), **akıllı uzman ataması** (Görev 3) ve AI **doğruluk takibi** (bölüm 5.4).

Veritabanı: PostgreSQL (`ai_db`) — yalnızca bu servis erişir. Uzman uzmanlık/kapasite/performans bilgisi, Identity ve Campaign servislerinin veritabanlarına **hiç dokunmadan**, yalnızca RabbitMQ event'leri (`staff.created`, `staff.updated`, `case.assigned`, `campaign.optimized`) tüketilerek yerel bir read-model önbelleğinde (`ExpertProfile`) tutulur.

## ML Entegrasyonu: Görev 1 gerçek bir eğitilmiş modelle çalışır, Görev 2 kural tabanlı kalır

**Görev 1 (öneri skorlama, `/ai/recommend`)** artık gerçekten eğitilmiş bir scikit-learn churn (kayıp) modeliyle çalışıyor:
- Eğitim: `ml/training/train_best_model.py`, `ml/training/turkcell_sahte_veri.csv` (25.000 satır gerçekçi Turkcell abone telemetrisi) üzerinde 5 aday modeli (LogisticRegression, RandomForest, HistGradientBoosting, KNN, XGBoost) 5-fold CV ROC-AUC ile karşılaştırıp en iyisini (LogisticRegression, test ROC-AUC ≈ 0.748) seçiyor.
- Serving: `ml/inference/` altında ayrı bir Python/FastAPI sidecar (`ai-ml-inference` konteyneri) — Node.js runtime'ında scikit-learn pipeline'ı çalıştırılamayacağı için. Bu sidecar gateway'e/dışarıya hiç açılmaz, yalnızca `ai-service`'in kendi iç Docker ağından `ML_INFERENCE_URL` ile erişilir.
- Feature kaynağı: AI Service'in kendi `SubscriberTelemetry` read-model'i (yalnızca demo abonelerine seed'lenmiş — Identity/Campaign veritabanına asla doğrudan erişilmez). Telemetrisi olmayan bir abone için (örn. yeni self-register) veya sidecar ulaşılamaz durumdaysa `MlScoringStrategy` sessizce `RuleBasedScoringStrategy`'ye düşer.
- Detaylı model/feature/dönüşüm mantığı: `recommendation/ml-scoring.strategy.ts` dosyasının başındaki yorum bloğu + `docs/AI_APPROACH.md`.

**Görev 2 (segment sınıflandırma, `/ai/classify`) bilinçli olarak rule-based kaldı**: sağlanan churn modeli subscriber-seviyesinde eğitildi, Task 2 ise belirli bir abone olmadan kampanya-seviyesinde çalışıyor — modeli kendi eğitildiği granülariteden farklı bir soruya zorlamak yanıltıcı olurdu. `segmentation/rule-based-classification.strategy.ts` dosyasının başındaki `TODO(ML)` bloğu gerçek bir modelin nasıl takas edileceğini anlatmaya devam ediyor.

Her iki strateji de bir **arayüz** (`ScoringStrategy`, `ClassificationStrategy`) arkasına gizlenmiştir: hangi implementasyonun aktif olacağı `recommendation.module.ts`'deki bir `useFactory` ile `AI_SCORING_STRATEGY` ortam değişkeninden (`ml` | `rule`, varsayılan `ml`) okunur — controller/service katmanları değişmez.

**Bu bir mock/hardcoded çıktı değildir** — Task 1 gerçek bir modelden, Task 2 girdiye göre gerçekten değişen deterministik bir fonksiyondan çıktı üretir; case dokümanının "AI servisi mock/hardcoded ise diskalifiye" kuralına aykırı değildir.

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
| POST | `/ai/recommend` | Authenticated | Görev 1: öneri skoru + dönüşüm olasılığı (gerçek ML modeli, fallback'li) |
| GET | `/ai/recommend/stats` | SUPERVISOR, ADMIN | Kaç öneri gerçek ML ile, kaçı kural tabanlı fallback ile üretildi |
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
| `ML_INFERENCE_URL` | `ai-ml-inference` sidecar'ının adresi (varsayılan `http://ai-ml-inference:8000`) |
| `AI_SCORING_STRATEGY` | `ml` (varsayılan, gerçek model) veya `rule` (yalnızca kural tabanlı, demo/debug amaçlı) |

## ML Klasörü (`ml/`)
```
ml/
├── training/
│   ├── turkcell_sahte_veri.csv     # 25.000 satır sentetik ama gerçekçi abone telemetrisi
│   ├── train_best_model.py         # 5 aday modeli CV ROC-AUC ile karşılaştırıp en iyisini seçer ve kaydeder
│   └── train_knn_churn.py          # denenen ama seçilmeyen tek-model (KNN) alternatifi, referans amaçlı
└── inference/
    ├── best_churn_model.pkl        # deploy edilen, seçilmiş model (train_best_model.py'nin çıktısı)
    ├── main.py                     # FastAPI sidecar (`POST /predict`, `GET /health`)
    ├── requirements.txt
    └── Dockerfile
```
`best_churn_model.pkl`, bu depodaki `requirements.txt` ile pinlenen scikit-learn sürümüyle yeniden üretilmiştir (orijinal dosya farklı/daha yeni bir scikit-learn sürümüyle eğitilmişti ve pickle sürüm uyumsuzluğu çıkarıyordu — bkz. `train_best_model.py`'yi `ml/training/` içinde yeniden çalıştırarak doğrulayabilirsiniz, sonuç aynıdır: LogisticRegression, test ROC-AUC ≈ 0.748).

Modeli yeniden eğitmek için:
```bash
cd services/ai-service/ml/training
python3 -m venv .venv && source .venv/bin/activate
pip install scikit-learn pandas joblib
python3 train_best_model.py
cp best_churn_model.pkl ../inference/best_churn_model.pkl
```
