"""
════════════════════════════════════════════════════════════════════
BİRDEN FAZLA MODEL DENEYİP EN İYİSİNİ SEÇME + AĞIRLIĞINI KAYDETME
════════════════════════════════════════════════════════════════════
Veri: turkcell_sahte_veri.csv | Hedef: churn (0/1)

Denenen modeller: Lojistik Regresyon, Random Forest, HistGradientBoosting,
XGBoost (kuruluysa), KNN.
Seçim kriteri: 5-fold stratified CV ROC-AUC (ortalama).
Kazanan model üzerinde küçük bir hiperparametre araması yapılıp, TEST
setinde doğrulanıp diske kaydedilir.
"""
import warnings
warnings.filterwarnings('ignore')

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, roc_auc_score)
from sklearn.model_selection import (GridSearchCV, StratifiedKFold,
                                      cross_val_score, train_test_split)
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

SEED = 42
DATA_PATH  = 'turkcell_sahte_veri.csv'
MODEL_PATH = 'best_churn_model.pkl'

# ── 1. Veri ──────────────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)
TARGET = 'churn'
DROP_COLS = ['abone_id', 'musteri_no', 'hat_no_maskeli', 'aktivasyon_tarihi', TARGET]

X = df.drop(columns=DROP_COLS)
y = df[TARGET]

CAT_COLS = X.select_dtypes(include=['object', 'bool', 'string']).columns.tolist()
NUM_COLS = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
X[CAT_COLS] = X[CAT_COLS].astype(object)   # pandas 3 string-dtype uyumu

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=SEED
)

preprocess = ColumnTransformer([
    ('num', Pipeline([
        ('impute', SimpleImputer(strategy='median')),
        ('scale',  StandardScaler()),
    ]), NUM_COLS),
    ('cat', Pipeline([
        ('impute', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore')),
    ]), CAT_COLS),
])

# ── 2. Aday modeller ─────────────────────────────────────────────────────
candidates = {
    'LogisticRegression': LogisticRegression(max_iter=2000, class_weight='balanced', random_state=SEED),
    'RandomForest'      : RandomForestClassifier(n_estimators=400, max_depth=8, class_weight='balanced',
                                                   random_state=SEED, n_jobs=-1),
    'HistGradientBoosting': HistGradientBoostingClassifier(max_iter=300, max_depth=6,
                                                              random_state=SEED),
    'KNN'               : KNeighborsClassifier(n_neighbors=51, weights='distance', p=2),
}
if HAS_XGB:
    candidates['XGBoost'] = XGBClassifier(
        n_estimators=400, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, eval_metric='auc',
        random_state=SEED, verbosity=0,
        scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
    )

print("Modeller 5-fold CV ROC-AUC ile karşılaştırılıyor...\n")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
cv_results = {}

for name, clf in candidates.items():
    pipe = Pipeline([('preprocess', preprocess), ('model', clf)])
    scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring='roc_auc', n_jobs=-1)
    cv_results[name] = scores
    print(f"  {name:<20s} ROC-AUC = {scores.mean():.4f} ± {scores.std():.4f}")

best_name = max(cv_results, key=lambda k: cv_results[k].mean())
print(f"\n>> En iyi model: {best_name} (CV ROC-AUC = {cv_results[best_name].mean():.4f})")

# ── 3. Kazanan model için küçük hiperparametre araması ──────────────────
PARAM_GRIDS = {
    'LogisticRegression': {'model__C': [0.01, 0.1, 1, 3, 10]},
    'RandomForest'      : {'model__n_estimators': [300, 600],
                            'model__max_depth': [6, 10, None],
                            'model__min_samples_leaf': [1, 5, 20]},
    'HistGradientBoosting': {'model__max_iter': [200, 400],
                              'model__max_depth': [4, 6, None],
                              'model__learning_rate': [0.03, 0.06, 0.1]},
    'KNN'               : {'model__n_neighbors': [21, 51, 81],
                            'model__weights': ['uniform', 'distance']},
    'XGBoost'           : {'model__n_estimators': [300, 600],
                            'model__max_depth': [3, 4, 6],
                            'model__learning_rate': [0.03, 0.05, 0.1]},
}

best_pipe = Pipeline([('preprocess', preprocess), ('model', candidates[best_name])])
grid = GridSearchCV(best_pipe, PARAM_GRIDS[best_name], cv=5, scoring='roc_auc', n_jobs=-1)
grid.fit(X_train, y_train)

final_model = grid.best_estimator_
print(f"\nİnce ayar sonrası en iyi parametreler: {grid.best_params_}")
print(f"CV ROC-AUC (ince ayar sonrası): {grid.best_score_:.4f}")

# ── 4. Test seti üzerinde son değerlendirme ─────────────────────────────
y_pred  = final_model.predict(X_test)
y_proba = final_model.predict_proba(X_test)[:, 1]

print(f"\n{'='*50}")
print(f"SEÇİLEN MODEL: {best_name}")
print(f"{'='*50}")
print(f"Test Accuracy : {accuracy_score(y_test, y_pred):.4f}")
print(f"Test ROC-AUC  : {roc_auc_score(y_test, y_proba):.4f}")
print(f"\n{classification_report(y_test, y_pred)}")
print(f"Karmaşıklık matrisi:\n{confusion_matrix(y_test, y_pred)}")

# ── 5. Model ağırlığını kaydet ──────────────────────────────────────────
joblib.dump({
    'pipeline'        : final_model,
    'model_name'      : best_name,
    'best_params'     : grid.best_params_,
    'cv_auc_all_models': {k: float(v.mean()) for k, v in cv_results.items()},
    'test_auc'        : float(roc_auc_score(y_test, y_proba)),
    'feature_cols_num': NUM_COLS,
    'feature_cols_cat': CAT_COLS,
}, MODEL_PATH)

print(f"\n✓ En iyi model ({best_name}) ağırlığı kaydedildi → {MODEL_PATH}")


# ── 6. Kayıtlı modeli tekrar yükleyip kullanma örneği ───────────────────
def predict_new_customer(profile: dict) -> float:
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
