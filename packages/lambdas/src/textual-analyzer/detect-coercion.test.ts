import { describe, it, expect, vi } from 'vitest';
import { detectCoercion } from './detect-coercion';
import type { ComprehendClient } from './types';

function makeComprehend(
  coercionDetected: boolean,
  patterns: ('pressure' | 'isolation' | 'urgency')[] = [],
  confidence = 0,
): ComprehendClient {
  return {
    analyzeSentimentAndEntities: vi.fn().mockResolvedValue({
      sentiment: 'NEUTRAL',
      sentimentScore: 0.5,
      entities: [],
    }),
    classifyCoercion: vi.fn().mockResolvedValue({
      coercionDetected,
      patterns,
      confidence,
    }),
  };
}

describe('detectCoercion', () => {
  it('detects coercion with pressure pattern', async () => {
    const comprehend = makeComprehend(true, ['pressure'], 0.85);
    const result = await detectCoercion('You must do this now or else', comprehend);

    expect(result.coercionDetected).toBe(true);
    expect(result.patterns).toContain('pressure');
    expect(result.confidence).toBe(0.85);
  });

  it('detects coercion with multiple patterns', async () => {
    const comprehend = makeComprehend(true, ['pressure', 'isolation', 'urgency'], 0.95);
    const result = await detectCoercion('Dont tell anyone, do it now', comprehend);

    expect(result.coercionDetected).toBe(true);
    expect(result.patterns).toEqual(['pressure', 'isolation', 'urgency']);
  });

  it('returns no detection for normal message', async () => {
    const comprehend = makeComprehend(false);
    const result = await detectCoercion('How was your day?', comprehend);

    expect(result.coercionDetected).toBe(false);
    expect(result.patterns).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('returns safe result on error', async () => {
    const comprehend: ComprehendClient = {
      analyzeSentimentAndEntities: vi.fn(),
      classifyCoercion: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    };
    const result = await detectCoercion('Any message', comprehend);

    expect(result.coercionDetected).toBe(false);
    expect(result.patterns).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });
});
