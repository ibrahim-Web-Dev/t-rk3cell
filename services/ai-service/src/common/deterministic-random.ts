import { createHash } from 'crypto';

/**
 * Maps an arbitrary string deterministically to a float in [0, 1). Used by
 * the rule-based placeholder scorer/classifier below so that results are
 * reproducible and testable instead of relying on Math.random(). A trained
 * ML model would replace this entirely - see the TODO(ML) blocks in
 * recommendation/rule-based-scoring.strategy.ts and
 * segmentation/rule-based-classification.strategy.ts.
 */
export function hashToUnitInterval(input: string): number {
  const digest = createHash('sha256').update(input).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
