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

export function accuracyOverall() {
  return unwrap<AccuracyOverall>(apiClient.get('/ai/accuracy'));
}

export function accuracyByCategory() {
  return unwrap<AccuracyByCategory[]>(apiClient.get('/ai/accuracy/by-category'));
}
