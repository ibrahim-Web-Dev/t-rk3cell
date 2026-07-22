import { CampaignType, SegmentType } from '@campaigncell/shared-types';
import { apiClient, unwrap } from './client';
import { Campaign } from '../types';

export interface CreateCampaignInput {
  title: string;
  type: CampaignType;
  targetSegmentHint?: SegmentType;
  discountRate: number;
  validUntil: string;
  targetSubscriberIds?: string[];
}

export function createCampaign(input: CreateCampaignInput) {
  return unwrap<Campaign>(apiClient.post('/campaigns', input));
}

export function listCampaigns() {
  return unwrap<Campaign[]>(apiClient.get('/campaigns'));
}

export function getCampaign(id: string) {
  return unwrap<Campaign>(apiClient.get(`/campaigns/${id}`));
}

/** Kampanyayı ve ilişkili vaka/teklifleri siler (ADMIN). Audit'e "campaign-deleted" olarak yazılır. */
export function deleteCampaign(id: string) {
  return unwrap<{ deleted: boolean; id: string }>(apiClient.delete(`/campaigns/${id}`));
}
