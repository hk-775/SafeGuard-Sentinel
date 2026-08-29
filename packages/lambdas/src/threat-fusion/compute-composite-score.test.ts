import { describe, it, expect } from 'vitest';
import { computeCompositeScore, DEFAULT_WEIGHTS } from './compute-composite-score';
import type { CompositeScoreInput } from './types';

describe('computeCompositeScore', () => {
  it('returns 0 when all domain scores are 0', () => {
    const input: CompositeScoreInput = {
      visualScore: 0,
      textualScore: 0,
      behavioralScore: 0,
      temporalScore: 0,
      weights: DEFAULT_WEIGHTS,
    };
    expect(computeCompositeScore(input)).toBe(0);
  });

  it('computes weighted sum correctly', () => {
    const input: CompositeScoreInput = {
      visualScore: 50,
      textualScore: 50,
      behavioralScore: 50,
      temporalScore: 50,
      weights: { visual: 0.25, textual: 0.25, behavioral: 0.25, temporal: 0.25 },
    };
    // 0.25*50 + 0.25*50 + 0.25*50 + 0.25*50 = 50
    expect(computeCompositeScore(input)).toBe(50);
  });

  it('single domain at 100 with default weights exceeds 60', () => {
    const input: CompositeScoreInput = {
      visualScore: 100,
      textualScore: 0,
      behavioralScore: 0,
      temporalScore: 0,
      weights: DEFAULT_WEIGHTS,
    };
    expect(computeCompositeScore(input)).toBeGreaterThanOrEqual(60);
  });

  it('any single domain at 100 with default weights exceeds 60', () => {
    const domains = ['visualScore', 'textualScore', 'behavioralScore', 'temporalScore'] as const;
    for (const domain of domains) {
      const input: CompositeScoreInput = {
        visualScore: 0,
        textualScore: 0,
        behavioralScore: 0,
        temporalScore: 0,
        weights: DEFAULT_WEIGHTS,
      };
      input[domain] = 100;
      expect(computeCompositeScore(input)).toBeGreaterThanOrEqual(60);
    }
  });

  it('clamps result to 100 when weighted sum exceeds 100', () => {
    const input: CompositeScoreInput = {
      visualScore: 100,
      textualScore: 100,
      behavioralScore: 100,
      temporalScore: 100,
      weights: { visual: 0.65, textual: 0.65, behavioral: 0.65, temporal: 0.65 },
    };
    expect(computeCompositeScore(input)).toBe(100);
  });

  it('clamps result to 0 for negative scores', () => {
    const input: CompositeScoreInput = {
      visualScore: -10,
      textualScore: 0,
      behavioralScore: 0,
      temporalScore: 0,
      weights: { visual: 1, textual: 0, behavioral: 0, temporal: 0 },
    };
    expect(computeCompositeScore(input)).toBe(0);
  });

  it('respects custom weights', () => {
    const input: CompositeScoreInput = {
      visualScore: 100,
      textualScore: 0,
      behavioralScore: 0,
      temporalScore: 0,
      weights: { visual: 0.5, textual: 0.2, behavioral: 0.2, temporal: 0.1 },
    };
    // 0.5 * 100 = 50
    expect(computeCompositeScore(input)).toBe(50);
  });
});
