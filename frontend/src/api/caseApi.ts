import { Priority, SegmentType } from '@campaigncell/shared-types';
import { apiClient, unwrap } from './client';
import { OptimizationCase } from '../types';

export function listCases() {
  return unwrap<OptimizationCase[]>(apiClient.get('/cases'));
}

export function listPendingQueue() {
  return unwrap<OptimizationCase[]>(apiClient.get('/cases/queue/pending'));
}

export function getCase(id: string) {
  return unwrap<OptimizationCase>(apiClient.get(`/cases/${id}`));
}

export function startCase(id: string) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/start`));
}

export function startTest(id: string) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/start-test`));
}

export function completeTest(id: string, conversionLift: number) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/complete-test`, { conversionLift }));
}

export function completeCase(id: string, optimizationNote: string, conversionLift?: number) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/complete`, { optimizationNote, conversionLift }));
}

export function publishCase(id: string) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/publish`));
}

export function updateSegment(id: string, segment: SegmentType) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/segment`, { segment }));
}

export function updatePriority(id: string, priority: Priority) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/priority`, { priority }));
}

export function assignExpert(id: string, expertId: string) {
  return unwrap<OptimizationCase>(apiClient.patch(`/cases/${id}/assign`, { expertId }));
}
