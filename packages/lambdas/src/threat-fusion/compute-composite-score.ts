import type { ScoreWeights } from '@safeguard-sentinel/shared';
import type { CompositeScoreInput } from './types';

/**
 * Default weights configured so that a single domain at 100% can push
 * the composite above the 60% intervention threshold.
 *
 * With these defaults the minimum single-domain contribution is
 * 0.65 * 100 = 65, which exceeds the 60% threshold.
 */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  visual: 0.65,
  textual: 0.65,
  behavioral: 0.65,
  temporal: 0.65,
};

/**
 * Computes a weighted composite threat score (0-100).
 *
 * Formula: score = w_v * visual + w_t * textual + w_b * behavioral + w_tm * temporal
 *
 * The result is clamped to [0, 100].
 *
 * The default weights are intentionally set so that any single domain
 * scoring 100 produces a composite above 60 even when all other domains
 * report zero — satisfying Requirement 1.4.
 */
export function computeCompositeScore(input: CompositeScoreInput): number {
  const { visualScore, textualScore, behavioralScore, temporalScore, weights } = input;

  const raw =
    weights.visual * visualScore +
    weights.textual * textualScore +
    weights.behavioral * behavioralScore +
    weights.temporal * temporalScore;

  return Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
}
