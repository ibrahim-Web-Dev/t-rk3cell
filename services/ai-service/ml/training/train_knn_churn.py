"""
════════════════════════════════════════════════════════════════════
KNN İLE CHURN TAHMİN MODELİ — EĞİTİM + MODEL AĞIRLIĞINI KAYDETME
════════════════════════════════════════════════════════════════════
Veri: turkcell_sahte_veri.csv (sentetik)
Hedef: churn (0/1)
Not: KNN mesafe tabanlı bir algoritma olduğu için ölçeklendirme
(StandardScaler) ZORUNLU — aksi halde TL cinsinden büyük değerli
kolonlar (örn. ortalama_fatura_tl) mesafeyi domine eder.
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, roc_auc_score)
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

SEED = 42
DATA_PATH  = 'turkcell_sahte_veri.csv'
MODEL_PATH = 'knn_churn_model.pkl'

# ── 1. Veriyi yükle ─────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)

TARGET = 'churn'
# Model için kullanılmayacak, tanımlayıcı/serbest metin kolonları
DROP_COLS = ['abone_id', 'musteri_no', 'hat_no_maskeli', 'aktivasyon_tarihi', TARGET]

X = df.drop(columns=DROP_COLS)
y = df[TARGET]

CAT_COLS = X.select_dtypes(include=['object', 'bool', 'string']).columns.tolist()
NUM_COLS = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

# pandas 3'ün yeni native "string" dtype'ı sklearn'ün eski object-dtype
# beklentisiyle uyumsuzluk çıkarabiliyor -> kategorikleri klasik object'e sabitle
X[CAT_COLS] = X[CAT_COLS].astype(object)

print(f"Kategorik kolon sayısı : {len(CAT_COLS)}")
print(f"Sayısal kolon sayısı   : {len(NUM_COLS)}")
print(f"Toplam satır           : {len(df)}")
print(f"Churn oranı            : {y.mean():.4f}")

# ── 2. Train / test ayır ─────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=SEED
)

# ── 3. Ön işleme + KNN pipeline ─────────────────────────────────────────
# Sayısal: eksik değer doldurma + standardizasyon (KNN için şart)
# Kategorik: eksik değer doldurma + one-hot encoding
preprocess = ColumnTransformer([
    ('num', Pipeline([
        ('impute', SimpleImputer(strategy='median')),
        ('scale',  StandardScaler()),
    ]), NUM_COLS),
    ('cat', Pipeline([
        ('impute',  SimpleImputer(strategy='most_frequent')),
        ('onehot',  OneHotEncoder(handle_unknown='ignore')),
    ]), CAT_COLS),
])

knn_pipeline = Pipeline([
    ('preprocess', preprocess),
    ('knn', KNeighborsClassifier()),
])

# ── 4. En iyi k / mesafe metriği için küçük bir grid search ─────────────
# NOT: Veri seti büyüdüğü (25k satır) için grid'i küçük tutuyoruz — KNN
# sorgu zamanı örnek sayısıyla doğrusal büyür, geniş grid çok yavaş olur.
param_grid = {
    'knn__n_neighbors': [15, 31, 51],
    'knn__weights'    : ['distance'],
    'knn__p'          : [2],
}
knn_pipeline.set_params(knn__n_jobs=-1)
grid = GridSearchCV(knn_pipeline, param_grid, cv=3, scoring='roc_auc', n_jobs=-1)
grid.fit(X_train, y_train)

best_model = grid.best_estimator_
print(f"\nEn iyi parametreler: {grid.best_params_}")
print(f"CV ROC-AUC (train): {grid.best_score_:.4f}")

# ── 5. Test seti performansı ─────────────────────────────────────────────
y_pred  = best_model.predict(X_test)
y_proba = best_model.predict_proba(X_test)[:, 1]

print(f"\n{'='*50}")
print("TEST SONUÇLARI")
print(f"{'='*50}")
print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
print(f"ROC-AUC  : {roc_auc_score(y_test, y_proba):.4f}")
print(f"\nSınıflandırma raporu:\n{classification_report(y_test, y_pred)}")
print(f"Karmaşıklık matrisi:\n{confusion_matrix(y_test, y_pred)}")

# ── 6. Model ağırlığını (pipeline: preprocessing + KNN) kaydet ─────────
# Not: KNN "ağırlık" olarak eğitilmiş katsayı taşımaz — bütün eğitim
# verisini (komşuluk için) saklar. Bu yüzden inference zamanında
# AYNI ön işleme adımlarının uygulanması şart; bu yüzden preprocessing +
# model TEK bir Pipeline nesnesi olarak birlikte kaydediliyor.
joblib.dump({
    'pipeline'  : best_model,
    'feature_cols_num': NUM_COLS,
    'feature_cols_cat': CAT_COLS,
    'best_params': grid.best_params_,
    'test_auc'  : roc_auc_score(y_test, y_proba),
}, MODEL_PATH)

print(f"\n✓ Model ağırlığı kaydedildi → {MODEL_PATH}")


# ── 7. Kaydedilen modeli tekrar yükleyip kullanma örneği ────────────────
def predict_new_customer(profile: dict) -> float:
    """Kaydedilmiş modeli yükleyip yeni bir abone için churn olasılığı döner."""
    saved = joblib.load(MODEL_PATH)
    pipe  = saved['pipeline']
    cols  = saved['feature_cols_num'] + saved['feature_cols_cat']
    row   = pd.DataFrame([{c: profile.get(c) for c in cols}])
    return float(pipe.predict_proba(row)[:, 1][0])


if __name__ == '__main__':
    ornek = X_test.iloc[0].to_dict()
    p = predict_new_customer(ornek)
    print(f"\nÖrnek abone için tahmini churn olasılığı: {p:.4f} "
          f"(gerçek etiket: {y_test.iloc[0]})")
