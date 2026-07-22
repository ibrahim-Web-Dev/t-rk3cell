FROM python:3.11-slim

WORKDIR /app

COPY services/ai-service/ml/inference/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/ai-service/ml/inference/main.py services/ai-service/ml/inference/best_churn_model.pkl ./

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
