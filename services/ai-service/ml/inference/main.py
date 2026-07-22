"""
Churn olasılık tahmini için ince bir FastAPI sarmalayıcı.

Bu, AI Service'in (NestJS) `/ai/recommend` uç noktasındaki
`ScoringStrategy` yer tutucusunun (bkz. rule-based-scoring.strategy.ts
TODO(ML) yorumu) yerine geçen GERÇEK eğitilmiş modeldir - scikit-learn
pipeline'ları Node.js runtime'ında çalışmadığı için ayrı, minimal bir
Python servisi olarak paketlenir. AI Service bu servise dahili Docker
ağı üzerinden HTTP ile çağrı yapar; bu servis dışarıya (gateway'e) hiç
açılmaz - yalnızca ai-service'in bir "model sunucusu" sidecar'ıdır.

Model: services/ai-service/ml/training/train_best_model.py betiğiyle
turkcell_sahte_veri.csv üzerinde eğitilmiş, 5-fold CV ROC-AUC'a göre
LogisticRegression/RandomForest/HistGradientBoosting/KNN/XGBoost
arasından seçilmiş en iyi model (bkz. best_churn_model.pkl metadata).
"""

import warnings
from typing import Any, Dict, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

warnings.filterwarnings("ignore", category=UserWarning)

MODEL_PATH = "best_churn_model.pkl"

app = FastAPI(title="CampaignCell AI - Churn Inference Sidecar")

_saved = joblib.load(MODEL_PATH)
_pipeline = _saved["pipeline"]
_feature_cols = _saved["feature_cols_num"] + _saved["feature_cols_cat"]
_model_name = _saved["model_name"]
_test_auc = _saved["test_auc"]


class PredictRequest(BaseModel):
    features: Dict[str, Optional[Any]]


class PredictResponse(BaseModel):
    churn_probability: float
    model_name: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_name": _model_name, "test_auc": round(_test_auc, 4)}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    missing = [c for c in _feature_cols if c not in req.features]
    if missing:
        raise HTTPException(status_code=422, detail=f"Eksik feature kolonları: {missing}")

    row = {c: req.features.get(c) for c in _feature_cols}
    df = pd.DataFrame([row], columns=_feature_cols)

    try:
        proba = float(_pipeline.predict_proba(df)[:, 1][0])
    except Exception as exc:  # noqa: BLE001 - modele ait herhangi bir hatayı 500 olarak döndür
        raise HTTPException(status_code=500, detail=f"Model tahmini başarısız: {exc}") from exc

    return PredictResponse(churn_probability=round(proba, 4), model_name=_model_name)
