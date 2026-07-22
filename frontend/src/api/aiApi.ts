import { apiClient, unwrap } from './client';

export interface AccuracyOverall {
  total: number;
  incorrect: number;
  accuracyRate: number | null;
}

export interface AccuracyByCategory {
  segment: string;
  total: number;
  incorrect: number;
  accuracyRate: number | null;
}

export interface SegmentOverride {
  campaignId: string;
  predictedSegment: string;
  correctedSegment: string | null;
  correctedBy: string | null;
  confidence: number;
  correctedAt: string | null;
  createdAt: string;
}

export interface ExpertProfile {
  userId: string;
  specialties: string[];
  regions: string[];
  activeCaseCount: number;
  completedCaseCount: number;
  performanceScore: number;
}

export function accuracyOverall() {
  return unwrap<AccuracyOverall>(apiClient.get('/ai/accuracy'));
}

export function accuracyByCategory() {
  return unwrap<AccuracyByCategory[]>(apiClient.get('/ai/accuracy/by-category'));
}

export function listOverrides() {
  return unwrap<SegmentOverride[]>(apiClient.get('/ai/accuracy/overrides'));
}

export function listExpertProfiles() {
  return unwrap<ExpertProfile[]>(apiClient.get('/ai/experts'));
}
