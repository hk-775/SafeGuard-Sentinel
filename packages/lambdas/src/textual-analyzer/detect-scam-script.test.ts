import { describe, it, expect, vi } from 'vitest';
import { detectScamScript } from './detect-scam-script';
import type { ScamScriptRepository } from './types';

function makeRepo(similarity: number, matchedScriptId: string | null = null): ScamScriptRepository {
  return {
    findSimilar: vi.fn().mockResolvedValue({ similarity, matchedScriptId }),
  };
}

describe('detectScamScript', () => {
  it('classifies as high-confidence scam when similarity >= 0.94', async () => {
    const repo = makeRepo(0.94, 'script-1');
    const result = await detectScamScript('Send me money please', repo);

    expect(result.isHighConfidenceScam).toBe(true);
    expect(result.similarity).toBe(0.94);
    expect(result.matchedScriptId).toBe('script-1');
  });

  it('classifies as high-confidence scam when similarity > 0.94', async () => {
    const repo = makeRepo(0.98, 'script-2');
    const result = await detectScamScript('I need help urgently', repo);

    expect(result.isHighConfidenceScam).toBe(true);
    expect(result.similarity).toBe(0.98);
  });

  it('does not classify as scam when similarity < 0.94', async () => {
    const repo = makeRepo(0.93);
    const result = await detectScamScript('Hello there', repo);

    expect(result.isHighConfidenceScam).toBe(false);
    expect(result.similarity).toBe(0.93);
    expect(result.matchedScriptId).toBeNull();
  });

  it('does not classify as scam when similarity is 0', async () => {
    const repo = makeRepo(0);
    const result = await detectScamScript('Normal message', repo);

    expect(result.isHighConfidenceScam).toBe(false);
    expect(result.similarity).toBe(0);
  });

  it('returns safe result on error', async () => {
    const repo: ScamScriptRepository = {
      findSimilar: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    };
    const result = await detectScamScript('Any message', repo);

    expect(result.isHighConfidenceScam).toBe(false);
    expect(result.similarity).toBe(0);
    expect(result.matchedScriptId).toBeNull();
  });
});
