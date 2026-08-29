import { describe, it, expect, vi } from 'vitest';
import { detectManipulation } from './detect-manipulation';
import type { RekognitionClient } from './types';

function makeRekognition(overrides: Partial<RekognitionClient> = {}): RekognitionClient {
  return {
    detectLabels: vi.fn(),
    compareFaces: vi.fn(),
    detectCustomLabels: vi.fn().mockResolvedValue({
      manipulationDetected: false,
      artifactType: null,
      confidence: 0,
    }),
    ...overrides,
  };
}

describe('detectManipulation', () => {
  it('returns the ManipulationResult from Rekognition Custom Labels', async () => {
    const expected = { manipulationDetected: true, artifactType: 'face_swap', confidence: 0.92 };
    const rek = makeRekognition({ detectCustomLabels: vi.fn().mockResolvedValue(expected) });

    const result = await detectManipulation('photos/user-1/img.jpg', rek);

    expect(result).toEqual(expected);
    expect(rek.detectCustomLabels).toHaveBeenCalledWith('photos/user-1/img.jpg');
  });

  it('returns no-manipulation result when no artifacts are detected', async () => {
    const rek = makeRekognition();
    const result = await detectManipulation('photos/clean.jpg', rek);

    expect(result.manipulationDetected).toBe(false);
    expect(result.artifactType).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('returns no-manipulation result on Rekognition error', async () => {
    const rek = makeRekognition({
      detectCustomLabels: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    });

    const result = await detectManipulation('photos/broken.jpg', rek);

    expect(result).toEqual({ manipulationDetected: false, artifactType: null, confidence: 0 });
  });

  it('preserves artifact type from Rekognition response', async () => {
    const expected = { manipulationDetected: true, artifactType: 'generative_ai', confidence: 0.88 };
    const rek = makeRekognition({ detectCustomLabels: vi.fn().mockResolvedValue(expected) });

    const result = await detectManipulation('photos/ai-gen.jpg', rek);

    expect(result.artifactType).toBe('generative_ai');
    expect(result.confidence).toBe(0.88);
  });
});
