import { SegmentType, Priority } from '@campaigncell/shared-types';

export interface AiClassifyRequest {
  campaignId: string;
  campaignNumber: string;
  type: string;
  targetSegmentHint?: SegmentType | null;
  discountRate: number;
}

export interface AiClassifyResult {
  segment: SegmentType;
  priority: Priority;
  confidence: number;
  conversionProbability: number;
}

export interface AiAssignRequest {
  caseId: string;
  segment: SegmentType;
  priority: Priority;
}

export interface AiAssignResult {
  expertId: string | null;
  score: number | null;
  queued: boolean;
}

export interface AiRecommendRequest {
  campaignId: string;
  subscriberId: string;
  campaignType: string;
  discountRate: number;
}

export interface AiRecommendResult {
  score: number;
  conversionProbability: number;
}
