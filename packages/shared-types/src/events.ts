import { CampaignType, CaseStatus, OfferResponse, Priority, SegmentType } from './enums';

/**
 * Canonical event routing keys published on the `campaigncell.events` topic
 * exchange. Full payload schemas are documented in /EVENTS.md at the repo
 * root. Keep this list and EVENTS.md in sync.
 */
export const EventRoutingKey = {
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_TARGETED: 'campaign.targeted',
  CASE_ASSIGNED: 'case.assigned',
  CASE_STATUS_CHANGED: 'case.status_changed',
  CAMPAIGN_OPTIMIZED: 'campaign.optimized',
  CAMPAIGN_SEGMENT_CHANGED: 'campaign.segment_changed',
  OFFER_RESPONDED: 'offer.responded',
  SATISFACTION_RATED: 'satisfaction.rated',
  SLA_BREACHED: 'sla.breached',
  AI_RECOMMENDATION_CREATED: 'ai.recommendation.created',
  AI_SEGMENT_ASSIGNED: 'ai.segment.assigned',
  AI_ASSIGNMENT_SUGGESTED: 'ai.assignment.suggested',
  STAFF_CREATED: 'staff.created',
  STAFF_UPDATED: 'staff.updated',
  BADGE_EARNED: 'badge.earned',
  POINTS_UPDATED: 'points.updated',
  AUDIT_LOG_ENTRY: 'audit.log.entry',
} as const;

export type EventRoutingKeyType = (typeof EventRoutingKey)[keyof typeof EventRoutingKey];

export interface BaseEvent<TPayload> {
  event_type: string;
  timestamp: string;
  payload: TPayload;
}

export interface CampaignCreatedPayload {
  campaign_id: string;
  campaign_number: string;
  type: CampaignType;
  target_segment: SegmentType | null;
  discount_rate: number;
  valid_until: string;
}

export interface CampaignTargetedPayload {
  campaign_id: string;
  campaign_number: string;
  subscriber_ids: string[];
}

export interface CaseAssignedPayload {
  case_id: string;
  campaign_id: string;
  expert_id: string | null;
  segment: SegmentType;
  priority: Priority;
  assignment_score: number | null;
}

export interface CaseStatusChangedPayload {
  case_id: string;
  from_status: CaseStatus;
  to_status: CaseStatus;
  changed_by: string;
  optimization_note?: string;
  conversion_lift?: number;
  created_at: string;
  completed_at?: string;
}

/** Emitted exactly when a case reaches TAMAMLANDI. Gamification Service's primary trigger for scoring. Shape matches case doc section 9.2. */
export interface CampaignOptimizedPayload {
  case_id: string;
  campaign_id: string;
  expert_id: string;
  segment: SegmentType;
  priority: Priority;
  conversion_lift: number | null;
  sla_breached: boolean;
  created_at: string;
  completed_at: string;
}

export interface CampaignSegmentChangedPayload {
  case_id: string;
  campaign_id: string;
  previous_segment: SegmentType;
  new_segment: SegmentType;
  changed_by: string;
  changed_by_role: string;
  was_ai_assigned: boolean;
}

export interface OfferRespondedPayload {
  campaign_id: string;
  subscriber_id: string;
  response: OfferResponse;
}

export interface SatisfactionRatedPayload {
  campaign_id: string;
  subscriber_id: string;
  stars: number;
}

export interface SlaBreachedPayload {
  case_id: string;
  priority: Priority;
  sla_hours: number;
  breached_at: string;
}

export interface AiRecommendationCreatedPayload {
  campaign_id: string;
  subscriber_id: string;
  score: number;
  conversion_probability: number;
}

export interface AiSegmentAssignedPayload {
  case_id: string;
  campaign_id: string;
  segment: SegmentType;
  priority: Priority;
  confidence: number;
}

export interface AiAssignmentSuggestedPayload {
  case_id: string;
  expert_id: string | null;
  score: number | null;
  queued: boolean;
}

export interface StaffCreatedPayload {
  user_id: string;
  specialties: string[];
  regions: string[];
}

export interface StaffUpdatedPayload {
  user_id: string;
  specialties: string[];
  regions: string[];
}

export interface BadgeEarnedPayload {
  user_id: string;
  badge_code: string;
  earned_at: string;
}

export interface PointsUpdatedPayload {
  user_id: string;
  delta: number;
  total_points: number;
  reason: string;
}

export interface AuditLogEntryPayload {
  user_id: string | null;
  action: string;
  ip: string | null;
  result: 'SUCCESS' | 'FAILURE';
  resource_id?: string;
  detail?: string;
}
