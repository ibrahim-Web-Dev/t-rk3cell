import { Priority, SegmentType } from '@campaigncell/shared-types';

export interface ClassificationInput {
  campaignId: string;
  campaignType: string;
  targetSegmentHint: SegmentType | null;
  discountRate: number;
}

export interface ClassificationOutput {
  segment: SegmentType;
  priority: Priority;
  confidence: number; // 0.0 - 1.0 - how sure the classifier is about `segment`
  /**
   * Expected conversion probability for this campaign within the assigned
   * segment (0.0 - 1.0). This is what Campaign Service compares against
   * CASE_CONVERSION_THRESHOLD to decide whether a campaign is healthy
   * (no case needed) or needs an optimization case opened - it is NOT the
   * same number as `confidence` (classification correctness) nor the
   * per-subscriber score from Task 1 (/ai/recommend).
   */
  conversionProbability: number;
}

/**
 * Strategy interface for Task 2 (segment sınıflandırma). Swapping the
 * rule-based implementation for a trained classifier means writing a new
 * class implementing this interface and wiring it in segmentation.module.ts.
 */
export interface ClassificationStrategy {
  classify(input: ClassificationInput): ClassificationOutput;
}
