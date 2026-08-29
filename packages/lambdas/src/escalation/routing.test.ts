import { describe, it, expect, vi } from 'vitest';
import { shouldEscalate, routeToEscalation } from './routing';
import type {
  EscalationCase,
  ConfidenceBreakdown,
  EscalationDeps,
  EscalationQueueClient,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCase(overrides: Partial<EscalationCase> = {}): EscalationCase {
  return {
    caseId: 'case-1',
    sessionId: 'session-1',
    userId: 'user-1',
    compositeScore: 50,
    isSerious: false,
    isAppeal: false,
    hasLegalImplications: false,
    evidencePackageId: 'evidence-1',
    ...overrides,
  };
}

function makeBreakdown(overrides: Partial<ConfidenceBreakdown> = {}): ConfidenceBreakdown {
  return {
    compositeScore: 50,
    visualScore: 40,
    textualScore: 60,
    behavioralScore: 55,
    temporalScore: 45,
    ...overrides,
  };
}

function makeDeps(): { deps: EscalationDeps; sendMock: ReturnType<typeof vi.fn> } {
  const sendMock = vi.fn().mockResolvedValue(undefined);
  const queueClient: EscalationQueueClient = { send: sendMock };
  return { deps: { queueClient }, sendMock };
}

// ---------------------------------------------------------------------------
// shouldEscalate — pure function tests
// ---------------------------------------------------------------------------

describe('shouldEscalate', () => {
  it('returns shouldRoute=false when no escalation criteria are met', () => {
    const result = shouldEscalate(makeCase({ compositeScore: 50 }));
    expect(result.shouldRoute).toBe(false);
    expect(result.flags).toEqual([]);
  });

  it('routes serious incidents regardless of score', () => {
    const result = shouldEscalate(makeCase({ isSerious: true, compositeScore: 10 }));
    expect(result.shouldRoute).toBe(true);
    expect(result.flags).toContain('serious-incident');
  });

  it('routes appeal submissions', () => {
    const result = shouldEscalate(makeCase({ isAppeal: true }));
    expect(result.shouldRoute).toBe(true);
    expect(result.flags).toContain('appeal');
  });

  it('routes edge-case scores (70 < score < 88)', () => {
    const result = shouldEscalate(makeCase({ compositeScore: 75 }));
    expect(result.shouldRoute).toBe(true);
    expect(result.flags).toContain('edge-case');
  });

  it('does NOT flag edge-case for score exactly 70', () => {
    const result = shouldEscalate(makeCase({ compositeScore: 70 }));
    expect(result.flags).not.toContain('edge-case');
  });

  it('does NOT flag edge-case for score exactly 88', () => {
    const result = shouldEscalate(makeCase({ compositeScore: 88 }));
    expect(result.flags).not.toContain('edge-case');
  });

  it('routes cases with legal implications and includes legal-review flag', () => {
    const result = shouldEscalate(makeCase({ hasLegalImplications: true }));
    expect(result.shouldRoute).toBe(true);
    expect(result.flags).toContain('legal-review');
  });

  it('accumulates multiple flags when multiple criteria are met', () => {
    const result = shouldEscalate(
      makeCase({
        isSerious: true,
        isAppeal: true,
        compositeScore: 80,
        hasLegalImplications: true,
      }),
    );
    expect(result.shouldRoute).toBe(true);
    expect(result.flags).toContain('serious-incident');
    expect(result.flags).toContain('appeal');
    expect(result.flags).toContain('edge-case');
    expect(result.flags).toContain('legal-review');
    expect(result.flags).toHaveLength(4);
  });

  it('does NOT route a low-score case with no special flags', () => {
    const result = shouldEscalate(makeCase({ compositeScore: 30 }));
    expect(result.shouldRoute).toBe(false);
  });

  it('does NOT route a high-score case (>=88) with no special flags', () => {
    const result = shouldEscalate(makeCase({ compositeScore: 95 }));
    expect(result.shouldRoute).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// routeToEscalation — integration with queue client
// ---------------------------------------------------------------------------

describe('routeToEscalation', () => {
  it('sends payload to queue when case should be escalated', async () => {
    const { deps, sendMock } = makeDeps();
    const escalationCase = makeCase({ isSerious: true, compositeScore: 80 });
    const breakdown = makeBreakdown({ compositeScore: 80 });

    const result = await routeToEscalation(escalationCase, breakdown, deps);

    expect(sendMock).toHaveBeenCalledOnce();
    expect(result).not.toBeNull();
    expect(result!.caseId).toBe('case-1');
    expect(result!.evidencePackageId).toBe('evidence-1');
    expect(result!.confidenceBreakdown).toEqual(breakdown);
    expect(result!.flags).toContain('serious-incident');
    expect(result!.flags).toContain('edge-case');
  });

  it('returns null and does NOT call queue when case should not be escalated', async () => {
    const { deps, sendMock } = makeDeps();
    const escalationCase = makeCase({ compositeScore: 50 });
    const breakdown = makeBreakdown();

    const result = await routeToEscalation(escalationCase, breakdown, deps);

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('includes complete evidence package ID and confidence breakdown', async () => {
    const { deps, sendMock } = makeDeps();
    const escalationCase = makeCase({ hasLegalImplications: true });
    const breakdown = makeBreakdown({
      compositeScore: 50,
      visualScore: 10,
      textualScore: 20,
      behavioralScore: 30,
      temporalScore: 40,
    });

    await routeToEscalation(escalationCase, breakdown, deps);

    const payload = sendMock.mock.calls[0][0];
    expect(payload.evidencePackageId).toBe('evidence-1');
    expect(payload.confidenceBreakdown).toEqual(breakdown);
    expect(payload.flags).toContain('legal-review');
  });

  it('includes legal-review flag for legal cases', async () => {
    const { deps, sendMock } = makeDeps();
    const escalationCase = makeCase({ hasLegalImplications: true });
    const breakdown = makeBreakdown();

    await routeToEscalation(escalationCase, breakdown, deps);

    const payload = sendMock.mock.calls[0][0];
    expect(payload.flags).toContain('legal-review');
  });
});
