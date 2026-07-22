import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const TIMEOUT_MS = 2000;

/**
 * Thin REST client to the ai-ml-inference sidecar (Python/FastAPI, wraps the
 * trained scikit-learn churn model - see services/ai-service/ml/). Kept
 * separate from AiClientService (campaign-service's client to THIS service)
 * because this is a purely internal, service-to-service call that never
 * crosses the gateway and needs no JWT.
 *
 * Every call is wrapped so that if the sidecar is unreachable or times out,
 * callers (MlScoringStrategy) fall back to the rule-based strategy instead
 * of failing the request - same graceful-degradation philosophy used
 * everywhere else AI Service is called (see campaign-service/ai-client).
 */
@Injectable()
export class MlChurnClient {
  private readonly logger = new Logger(MlChurnClient.name);
  private readonly baseUrl = process.env.ML_INFERENCE_URL ?? 'http://ai-ml-inference:8000';

  async predictChurnProbability(features: Record<string, unknown>): Promise<number | null> {
    try {
      const res = await axios.post(`${this.baseUrl}/predict`, { features }, { timeout: TIMEOUT_MS });
      return res.data.churn_probability as number;
    } catch (err) {
      this.logger.warn(`ML inference sidecar çağrısı başarısız: ${(err as Error).message}`);
      return null;
    }
  }
}
