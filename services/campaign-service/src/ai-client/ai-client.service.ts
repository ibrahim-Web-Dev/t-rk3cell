import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  AiAssignRequest,
  AiAssignResult,
  AiClassifyRequest,
  AiClassifyResult,
  AiRecommendRequest,
  AiRecommendResult,
} from './ai-client.dto';

const TIMEOUT_MS = 3000;

/**
 * Thin REST client to the AI Service. Every call is wrapped so that if AI
 * Service is unreachable or times out, Campaign Service degrades gracefully
 * instead of failing the whole request (case doc section 2.2: "AI Service
 * kapalıyken kampanya oluşturulabilmeli"). Callers treat a `null` result as
 * "AI unavailable" and fall back to the manual/BELIRSIZ path.
 *
 * AI Service's endpoints are protected by the same JWT guard as everywhere
 * else (defense-in-depth), so every call here forwards the original caller's
 * bearer token instead of calling anonymously.
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl = process.env.AI_SERVICE_URL ?? 'http://ai-service:3003/api/v1';

  private authHeaders(bearerToken: string) {
    return { headers: { Authorization: bearerToken }, timeout: TIMEOUT_MS };
  }

  async classify(input: AiClassifyRequest, bearerToken: string): Promise<AiClassifyResult | null> {
    try {
      const res = await axios.post(`${this.baseUrl}/ai/classify`, input, this.authHeaders(bearerToken));
      return res.data.data as AiClassifyResult;
    } catch (err) {
      this.logger.warn(`AI classify çağrısı başarısız, BELIRSIZ segmente düşülüyor: ${(err as Error).message}`);
      return null;
    }
  }

  async assignExpert(input: AiAssignRequest, bearerToken: string): Promise<AiAssignResult | null> {
    try {
      const res = await axios.post(`${this.baseUrl}/ai/assign`, input, this.authHeaders(bearerToken));
      return res.data.data as AiAssignResult;
    } catch (err) {
      this.logger.warn(`AI assign çağrısı başarısız, manuel kuyruğa düşülüyor: ${(err as Error).message}`);
      return null;
    }
  }

  async recommend(input: AiRecommendRequest, bearerToken: string): Promise<AiRecommendResult | null> {
    try {
      const res = await axios.post(`${this.baseUrl}/ai/recommend`, input, this.authHeaders(bearerToken));
      return res.data.data as AiRecommendResult;
    } catch (err) {
      this.logger.warn(`AI recommend çağrısı başarısız: ${(err as Error).message}`);
      return null;
    }
  }
}
