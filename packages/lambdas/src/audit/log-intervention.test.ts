import { describe, it, expect, vi } from 'vitest';
import { logIntervention } from './log-intervention';
import {
  InterventionLevel,
  InterventionType,
  InterventionOutcome,
} from '@safeguard-sentinel/shared';
import type { AuditLogEntry, LogInterventionDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    interventionId: 'int-001',
    timestamp: '2024-06-15T10:30:00Z',
    interventionLevel: InterventionLevel.SafetyPrompt,
    interventionType: InterventionType.SafetyPrompt,
    targetAccounts: ['acc-1'],
    triggeringScore: 65,
    signalBreakdown: { visual: 20, textual: 30, behavioral: 10, temporal: 5 },
    actionTaken: 'Injected safety prompt',
    outcome: InterventionOutcome.Pending,
    humanReviewRequired: false,
    escalationQueueId: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<LogInterventionDeps> = {}): LogInterventionDeps {
  return {
    openSearchClient: { index: vi.fn().mockResolvedValue(undefined) },
    indexName: 'audit-interventions',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('logIntervention', () => {
  it('should call OpenSearch index with correct index name, document ID, and body', async () => {
    const entry = makeEntry();
    const deps = makeDeps();

    await logIntervention(entry, deps);

    expect(deps.openSearchClient.index).toHaveBeenCalledWith({
      indexName: 'audit-interventions',
      documentId: 'int-001',
      body: {
        interventionId: 'int-001',
        timestamp: '2024-06-15T10:30:00Z',
        interventionLevel: InterventionLevel.SafetyPrompt,
        interventionType: InterventionType.SafetyPrompt,
        targetAccounts: ['acc-1'],
        triggeringScore: 65,
        signalBreakdown: { visual: 20, textual: 30, behavioral: 10, temporal: 5 },
        actionTaken: 'Injected safety prompt',
        outcome: InterventionOutcome.Pending,
        humanReviewRequired: false,
        escalationQueueId: null,
      },
    });
  });

  it('should include all required fields in the indexed document', async () => {
    const entry = makeEntry({
      triggeringScore: 82,
      signalBreakdown: { visual: 40, textual: 25, behavioral: 12, temporal: 5 },
      interventionType: InterventionType.Friction,
      targetAccounts: ['acc-a', 'acc-b'],
      timestamp: '2024-07-01T08:00:00Z',
    });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    const body = call.body;

    expect(body).toHaveProperty('triggeringScore', 82);
    expect(body).toHaveProperty('signalBreakdown.visual', 40);
    expect(body).toHaveProperty('signalBreakdown.textual', 25);
    expect(body).toHaveProperty('signalBreakdown.behavioral', 12);
    expect(body).toHaveProperty('signalBreakdown.temporal', 5);
    expect(body).toHaveProperty('interventionType', InterventionType.Friction);
    expect(body).toHaveProperty('targetAccounts', ['acc-a', 'acc-b']);
    expect(body).toHaveProperty('timestamp', '2024-07-01T08:00:00Z');
  });

  it('should handle Level 1 (SafetyPrompt) intervention', async () => {
    const entry = makeEntry({
      interventionLevel: InterventionLevel.SafetyPrompt,
      interventionType: InterventionType.SafetyPrompt,
      triggeringScore: 62,
    });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.body).toHaveProperty('interventionLevel', InterventionLevel.SafetyPrompt);
    expect(call.body).toHaveProperty('interventionType', InterventionType.SafetyPrompt);
  });

  it('should handle Level 2 (Friction) intervention', async () => {
    const entry = makeEntry({
      interventionLevel: InterventionLevel.Friction,
      interventionType: InterventionType.Friction,
      triggeringScore: 78,
    });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.body).toHaveProperty('interventionLevel', InterventionLevel.Friction);
    expect(call.body).toHaveProperty('interventionType', InterventionType.Friction);
  });

  it('should handle Level 3 (InteractionRestriction) intervention', async () => {
    const entry = makeEntry({
      interventionLevel: InterventionLevel.InteractionRestriction,
      interventionType: InterventionType.InteractionRestriction,
      triggeringScore: 91,
      humanReviewRequired: true,
      escalationQueueId: 'queue-l3-001',
    });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.body).toHaveProperty('interventionLevel', InterventionLevel.InteractionRestriction);
    expect(call.body).toHaveProperty('interventionType', InterventionType.InteractionRestriction);
    expect(call.body).toHaveProperty('humanReviewRequired', true);
    expect(call.body).toHaveProperty('escalationQueueId', 'queue-l3-001');
  });

  it('should handle Level 4 (NetworkDisruption) intervention', async () => {
    const entry = makeEntry({
      interventionLevel: InterventionLevel.NetworkDisruption,
      interventionType: InterventionType.NetworkDisruption,
      triggeringScore: 96,
      targetAccounts: ['acc-1', 'acc-2', 'acc-3', 'acc-4'],
      humanReviewRequired: true,
      escalationQueueId: 'queue-l4-001',
    });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.body).toHaveProperty('interventionLevel', InterventionLevel.NetworkDisruption);
    expect(call.body).toHaveProperty('targetAccounts', ['acc-1', 'acc-2', 'acc-3', 'acc-4']);
  });

  it('should handle entry with null escalationQueueId', async () => {
    const entry = makeEntry({ escalationQueueId: null });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.body).toHaveProperty('escalationQueueId', null);
  });

  it('should handle entry with a non-null escalationQueueId', async () => {
    const entry = makeEntry({ escalationQueueId: 'queue-esc-42' });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.body).toHaveProperty('escalationQueueId', 'queue-esc-42');
  });

  it('should use interventionId as the document ID', async () => {
    const entry = makeEntry({ interventionId: 'unique-int-xyz' });
    const deps = makeDeps();

    await logIntervention(entry, deps);

    const call = vi.mocked(deps.openSearchClient.index).mock.calls[0][0];
    expect(call.documentId).toBe('unique-int-xyz');
  });
});
