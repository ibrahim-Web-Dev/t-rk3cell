import { CampaignType, CaseStatus, OfferResponse, Priority, SegmentType } from '@campaigncell/shared-types';

export interface Campaign {
  id: string;
  campaignNumber: string;
  title: string;
  type: CampaignType;
  targetSegmentHint: SegmentType | null;
  discountRate: number;
  validUntil: string;
  createdBy: string;
  createdAt: string;
  /** AI Service Task 2 classification - always populated when AI was reachable, independent of whether a case was opened. */
  aiSegment: SegmentType | null;
  aiPriority: Priority | null;
  aiConfidence: number | null;
  aiConversionProbability: number | null;
  wasAiClassified: boolean;
  optimizationCase?: OptimizationCase | null;
  offers?: SubscriberOffer[];
}

export interface OptimizationCase {
  id: string;
  campaignId: string;
  segment: SegmentType;
  priority: Priority;
  status: CaseStatus;
  assignedExpertId: string | null;
  assignmentScore: number | null;
  conversionProbability: number | null;
  aiConfidence: number | null;
  wasAiClassified: boolean;
  optimizationNote: string | null;
  conversionLift: number | null;
  abTestStartedAt: string | null;
  slaStartedAt: string;
  slaDueAt: string;
  slaBreached: boolean;
  completedAt: string | null;
  createdAt: string;
  campaign?: Campaign;
}

export interface SubscriberOffer {
  id: string;
  campaignId: string;
  subscriberId: string;
  score: number;
  conversionProbability: number;
  response: OfferResponse | null;
  respondedAt: string | null;
  satisfactionStars: number | null;
  satisfactionRatedAt: string | null;
  createdAt: string;
  campaign?: Campaign;
}
