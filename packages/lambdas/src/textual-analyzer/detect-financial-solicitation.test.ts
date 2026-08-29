import { describe, it, expect, vi } from 'vitest';
import { detectFinancialSolicitation, FINANCIAL_PATTERNS } from './detect-financial-solicitation';
import type { ComprehendClient } from './types';

function makeComprehend(entities: { type: string; text: string; score: number }[] = []): ComprehendClient {
  return {
    analyzeSentimentAndEntities: vi.fn().mockResolvedValue({
      sentiment: 'NEUTRAL',
      sentimentScore: 0.5,
      entities,
    }),
    classifyCoercion: vi.fn().mockResolvedValue({
      coercionDetected: false,
      patterns: [],
      confidence: 0,
    }),
  };
}

describe('detectFinancialSolicitation', () => {
  it('detects Bitcoin address pattern', async () => {
    const comprehend = makeComprehend();
    const result = await detectFinancialSolicitation(
      'Send to my wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(true);
    expect(result.matchedPatterns).toContain('bitcoin_address');
  });

  it('detects Ethereum address pattern', async () => {
    const comprehend = makeComprehend();
    const result = await detectFinancialSolicitation(
      'Send ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(true);
    expect(result.matchedPatterns).toContain('ethereum_address');
  });

  it('detects gift card references', async () => {
    const comprehend = makeComprehend();
    const result = await detectFinancialSolicitation(
      'Can you buy me an iTunes card?',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(true);
    expect(result.matchedPatterns).toContain('gift_card');
  });

  it('detects wire transfer keywords', async () => {
    const comprehend = makeComprehend();
    const result = await detectFinancialSolicitation(
      'Please send a wire transfer to my account',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(true);
    expect(result.matchedPatterns).toContain('wire_transfer');
  });

  it('detects crypto references', async () => {
    const comprehend = makeComprehend();
    const result = await detectFinancialSolicitation(
      'I invest in bitcoin and ethereum, you should too',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(true);
    expect(result.matchedPatterns).toContain('crypto_reference');
  });

  it('detects Comprehend financial entities', async () => {
    const comprehend = makeComprehend([{ type: 'QUANTITY', text: '$5000', score: 0.9 }]);
    const result = await detectFinancialSolicitation(
      'I need exactly that amount transferred',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(true);
    expect(result.matchedPatterns).toContain('comprehend_financial_entity');
  });

  it('returns no detection for normal message', async () => {
    const comprehend = makeComprehend();
    const result = await detectFinancialSolicitation(
      'How was your day? Want to grab coffee?',
      comprehend,
    );

    expect(result.financialSolicitationDetected).toBe(false);
    expect(result.matchedPatterns).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('returns safe result on error', async () => {
    const comprehend: ComprehendClient = {
      analyzeSentimentAndEntities: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      classifyCoercion: vi.fn(),
    };
    const result = await detectFinancialSolicitation('Any message', comprehend);

    expect(result.financialSolicitationDetected).toBe(false);
    expect(result.matchedPatterns).toHaveLength(0);
  });
});
