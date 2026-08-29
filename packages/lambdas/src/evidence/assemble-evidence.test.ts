import { describe, it, expect, vi } from 'vitest';
import { assembleEvidencePackage } from './assemble-evidence';
import { InterventionLevel } from '@safeguard-sentinel/shared';
import type { AssembleEvidenceDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeDeps(overrides: Partial<AssembleEvidenceDeps> = {}): AssembleEvidenceDeps {
  return {
    conversationHistory: {
      getHistory: vi.fn().mockResolvedValue([
        { messageId: 'm1', senderId: 'u1', content: 'hello', timestamp: '2024-01-01T00:00:00Z' },
      ]),
    },
    photoMetadata: {
      getMetadata: vi.fn().mockResolvedValue([{ photoId: 'p1' }]),
    },
    behavioralTimeline: {
      getTimeline: vi.fn().mockResolvedValue([{ event: 'interaction', ts: '2024-01-01T00:01:00Z' }]),
    },
    crossReference: {
      getCrossReferences: vi.fn().mockResolvedValue([{ refId: 'r1' }]),
    },
    networkGraph: {
      getNetworkGraph: vi.fn().mockResolvedValue({
        nodes: [{ id: 'n1' }],
        edges: [{ from: 'n1', to: 'n2' }],
      }),
    },
    aiResponseDraft: {
      getDrafts: vi.fn().mockResolvedValue([{ draftId: 'd1', text: 'draft' }]),
    },
    threatScore: {
      getScoreRecord: vi.fn().mockResolvedValue({
        compositeScore: 85,
        visualScore: 70,
        textualScore: 90,
        behavioralScore: 60,
        temporalScore: 40,
      }),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assembleEvidencePackage', () => {
  const sessionId = 'session-123';
  const userId = 'user-456';
  const targetAccounts = ['acc-1', 'acc-2'];
  const interventionLevel = InterventionLevel.InteractionRestriction;

  it('should return a package with all required fields', async () => {
    const deps = makeDeps();
    const pkg = await assembleEvidencePackage(sessionId, userId, targetAccounts, interventionLevel, deps);

    expect(pkg.packageId).toBeDefined();
    expect(pkg.caseId).toBeDefined();
    expect(pkg.createdAt).toBeDefined();
    expect(pkg.targetAccounts).toEqual(targetAccounts);
    expect(pkg.interventionLevel).toBe(interventionLevel);
    expect(pkg.compositeScoreAtIntervention).toBe(85);
    expect(pkg.signalBreakdown).toBeDefined();
    expect(pkg.conversationHistory).toBeDefined();
    expect(pkg.photoMetadata).toBeDefined();
    expect(pkg.behavioralTimeline).toBeDefined();
    expect(pkg.crossReferences).toBeDefined();
    expect(pkg.networkGraph).toBeDefined();
    expect(pkg.chainOfCustody).toBeDefined();
    expect(pkg.aiResponseDrafts).toBeDefined();
  });

  it('should generate valid UUIDs for packageId and caseId', async () => {
    const deps = makeDeps();
    const pkg = await assembleEvidencePackage(sessionId, userId, targetAccounts, interventionLevel, deps);

    expect(pkg.packageId).toMatch(UUID_REGEX);
    expect(pkg.caseId).toMatch(UUID_REGEX);
    expect(pkg.packageId).not.toBe(pkg.caseId);
  });

  it('should populate chain-of-custody with SHA-256 checksum, timestamps, and creator ID', async () => {
    const deps = makeDeps();
    const pkg = await assembleEvidencePackage(sessionId, userId, targetAccounts, interventionLevel, deps);

    const coc = pkg.chainOfCustody;
    expect(coc.createdBy).toBe('safeguard-sentinel-system');
    expect(coc.createdAt).toBe(pkg.createdAt);
    // SHA-256 hex is 64 characters
    expect(coc.checksumSHA256).toMatch(/^[0-9a-f]{64}$/);
    // s3ObjectLockRetainUntil should be a valid ISO date in the future
    const retainDate = new Date(coc.s3ObjectLockRetainUntil);
    const createdDate = new Date(coc.createdAt);
    expect(retainDate.getTime()).toBeGreaterThan(createdDate.getTime());
    // Should be ~30 days after creation
    const diffDays = (retainDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  it('should correctly aggregate data from all injected clients', async () => {
    const deps = makeDeps();
    const pkg = await assembleEvidencePackage(sessionId, userId, targetAccounts, interventionLevel, deps);

    // Verify data from each client is present
    expect(pkg.conversationHistory).toEqual([
      { messageId: 'm1', senderId: 'u1', content: 'hello', timestamp: '2024-01-01T00:00:00Z' },
    ]);
    expect(pkg.photoMetadata).toEqual([{ photoId: 'p1' }]);
    expect(pkg.behavioralTimeline).toEqual([{ event: 'interaction', ts: '2024-01-01T00:01:00Z' }]);
    expect(pkg.crossReferences).toEqual([{ refId: 'r1' }]);
    expect(pkg.networkGraph).toEqual({
      nodes: [{ id: 'n1' }],
      edges: [{ from: 'n1', to: 'n2' }],
    });
    expect(pkg.aiResponseDrafts).toEqual([{ draftId: 'd1', text: 'draft' }]);

    // Verify signal breakdown uses scores from threat score client
    expect(pkg.signalBreakdown.visual.score).toBe(70);
    expect(pkg.signalBreakdown.textual.score).toBe(90);
    expect(pkg.signalBreakdown.behavioral.score).toBe(60);
    expect(pkg.signalBreakdown.temporal.score).toBe(40);

    // Verify each client was called with correct arguments
    expect(deps.conversationHistory.getHistory).toHaveBeenCalledWith(sessionId, targetAccounts);
    expect(deps.photoMetadata.getMetadata).toHaveBeenCalledWith(targetAccounts);
    expect(deps.behavioralTimeline.getTimeline).toHaveBeenCalledWith(sessionId, userId);
    expect(deps.crossReference.getCrossReferences).toHaveBeenCalledWith(targetAccounts);
    expect(deps.networkGraph.getNetworkGraph).toHaveBeenCalledWith(targetAccounts);
    expect(deps.aiResponseDraft.getDrafts).toHaveBeenCalledWith(sessionId);
    expect(deps.threatScore.getScoreRecord).toHaveBeenCalledWith(sessionId);
  });

  it('should use 0 scores when score record is null', async () => {
    const deps = makeDeps({
      threatScore: { getScoreRecord: vi.fn().mockResolvedValue(null) },
    });
    const pkg = await assembleEvidencePackage(sessionId, userId, targetAccounts, interventionLevel, deps);

    expect(pkg.compositeScoreAtIntervention).toBe(0);
    expect(pkg.signalBreakdown.visual.score).toBe(0);
    expect(pkg.signalBreakdown.textual.score).toBe(0);
    expect(pkg.signalBreakdown.behavioral.score).toBe(0);
    expect(pkg.signalBreakdown.temporal.score).toBe(0);
  });
});
