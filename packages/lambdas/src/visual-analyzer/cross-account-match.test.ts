import { describe, it, expect, vi } from 'vitest';
import { crossAccountMatch } from './cross-account-match';
import type { RekognitionClient } from './types';

function makeRekognition(overrides: Partial<RekognitionClient> = {}): RekognitionClient {
  return {
    detectLabels: vi.fn(),
    compareFaces: vi.fn().mockResolvedValue({ matchedAccounts: [], similarity: 0 }),
    detectCustomLabels: vi.fn(),
    ...overrides,
  };
}

describe('crossAccountMatch', () => {
  it('returns matched accounts when similarity >= 90%', async () => {
    const expected = { matchedAccounts: ['acct-2', 'acct-3'], similarity: 0.95 };
    const rek = makeRekognition({ compareFaces: vi.fn().mockResolvedValue(expected) });

    const result = await crossAccountMatch('photos/user-1/img.jpg', rek);

    expect(result).toEqual(expected);
    expect(rek.compareFaces).toHaveBeenCalledWith('photos/user-1/img.jpg');
  });

  it('returns matched accounts at exactly 90% threshold', async () => {
    const expected = { matchedAccounts: ['acct-5'], similarity: 0.9 };
    const rek = makeRekognition({ compareFaces: vi.fn().mockResolvedValue(expected) });

    const result = await crossAccountMatch('photos/boundary.jpg', rek);

    expect(result.matchedAccounts).toEqual(['acct-5']);
    expect(result.similarity).toBe(0.9);
  });

  it('returns empty matchedAccounts when similarity is below threshold', async () => {
    const rek = makeRekognition({
      compareFaces: vi.fn().mockResolvedValue({ matchedAccounts: ['acct-2'], similarity: 0.85 }),
    });

    const result = await crossAccountMatch('photos/low-match.jpg', rek);

    expect(result.matchedAccounts).toEqual([]);
    expect(result.similarity).toBe(0.85);
  });

  it('returns empty result on Rekognition error', async () => {
    const rek = makeRekognition({
      compareFaces: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    });

    const result = await crossAccountMatch('photos/broken.jpg', rek);

    expect(result).toEqual({ matchedAccounts: [], similarity: 0 });
  });
});
