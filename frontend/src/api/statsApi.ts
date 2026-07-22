import { apiClient, unwrap } from './client';

export interface SegmentDistributionRow {
  segment: string;
  count: number;
}

export interface SlaCompliance {
  total: number;
  breached: number;
  compliant: number;
  complianceRate: number;
}

export interface ConversionTrendRow {
  day: string;
  total: number;
  accepted: number;
  conversionRate: number;
}

export interface ExpertPerformanceRow {
  expertId: string;
  completedCount: number;
  averageConversionLift: number | null;
  averageDurationHours: number;
}

export function segmentDistribution() {
  return unwrap<SegmentDistributionRow[]>(apiClient.get('/stats/segment-distribution'));
}

export function slaCompliance() {
  return unwrap<SlaCompliance>(apiClient.get('/stats/sla-compliance'));
}

export function slaBreachedActive() {
  return unwrap<import('../types').OptimizationCase[]>(apiClient.get('/stats/sla-breached-active'));
}

export function conversionTrend(days = 14) {
  return unwrap<ConversionTrendRow[]>(apiClient.get('/stats/conversion-trend', { params: { days } }));
}

export function expertPerformance() {
  return unwrap<ExpertPerformanceRow[]>(apiClient.get('/stats/expert-performance'));
}
