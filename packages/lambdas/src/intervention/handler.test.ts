import { describe, it, expect, vi } from 'vitest';
import { selectInterventionLevel, executeIntervention } from './handler';
import type { InterventionDeps, ThreatEvent } from './types';
import { InterventionLevel, InterventionType } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThreatEvent(overrides: Partial<ThreatEvent> = {}): ThreatEvent {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    compositeScore: 70,
    visualScore: 80,
    textualScore: 60,
    behavioralScore: 50,
    temporalScore: 40,
    correlatedAccounts: [],
    threatSignals: ['relationship_scam'],
    ...overrides,
  };
}

function makeDeps(): InterventionDeps {
  return {
    safetyPrompt: { injectPrompt: vi.fn().mockResolvedValue(undefined) },
    friction: { deployFriction: vi.fn().mockResolvedValue(undefined) },
    accountSuspension: { suspendAccount: vi.fn().mockResolvedValue(undefined) },
    networkDisruption: { disruptNetwork: vi.fn().mockResolvedValue(undefined) },
    notification: { notifyUser: vi.fn().mockResolvedValue(undefined) },
    evidence: { assembleEvidencePackage: vi.fn().mockResolvedValue(undefined) },
    escalationQueue: { enqueue: vi.fn().mockResolvedValue(undefined) },
    approvalGate: { verifyApproval: vi.fn().mockResolvedValue(true) },
    auditLog: { logIntervention: vi.fn().mockResolvedValue(undefined) },
  };
}

// ---------------------------------------------------------------------------
// selectInterventionLevel (pure function)
// ---------------------------------------------------------------------------

describe('selectInterventionLevel', () => {
  it('returns None for score < 60', () => {
    expect(selectInterventionLevel(0, 0)).toBe(InterventionLevel.None);
    expect(selectInterventionLevel(59, 0)).toBe(InterventionLevel.None);
    expect(selectInterventionLevel(59.99, 0)).toBe(InterventionLevel.None);
  });

  it('returns SafetyPrompt for score in [60, 75)', () => {
    expect(selectInterventionLevel(60, 0)).toBe(InterventionLevel.SafetyPrompt);
    expect(selectInterventionLevel(65, 0)).toBe(InterventionLevel.SafetyPrompt);
    expect(selectInterventionLevel(74.99, 0)).toBe(InterventionLevel.SafetyPrompt);
  });

  it('returns Friction for score in [75, 88)', () => {
    expect(selectInterventionLevel(75, 0)).toBe(InterventionLevel.Friction);
    expect(selectInterventionLevel(80, 0)).toBe(InterventionLevel.Friction);
    expect(selectInterventionLevel(87.99, 0)).toBe(InterventionLevel.Friction);
  });

  it('returns InteractionRestriction for score in [88, 94)', () => {
    expect(selectInterventionLevel(88, 0)).toBe(InterventionLevel.InteractionRestriction);
    expect(selectInterventionLevel(90, 0)).toBe(InterventionLevel.InteractionRestriction);
    expect(selectInterventionLevel(93.99, 0)).toBe(InterventionLevel.InteractionRestriction);
  });

  it('returns NetworkDisruption for score >= 94 with 3+ correlated accounts', () => {
    expect(selectInterventionLevel(94, 3)).toBe(InterventionLevel.NetworkDisruption);
    expect(selectInterventionLevel(100, 5)).toBe(InterventionLevel.NetworkDisruption);
    expect(selectInterventionLevel(94, 10)).toBe(InterventionLevel.NetworkDisruption);
  });

  it('falls back to InteractionRestriction for score >= 94 with < 3 correlated accounts', () => {
    expect(selectInterventionLevel(94, 0)).toBe(InterventionLevel.InteractionRestriction);
    expect(selectInterventionLevel(94, 1)).toBe(InterventionLevel.InteractionRestriction);
    expect(selectInterventionLevel(94, 2)).toBe(InterventionLevel.InteractionRestriction);
    expect(selectInterventionLevel(100, 0)).toBe(InterventionLevel.InteractionRestriction);
  });

  it('returns SafetyPrompt at exact boundary of 60', () => {
    expect(selectInterventionLevel(60, 0)).toBe(InterventionLevel.SafetyPrompt);
  });

  it('returns Friction at exact boundary of 75', () => {
    expect(selectInterventionLevel(75, 0)).toBe(InterventionLevel.Friction);
  });

  it('returns InteractionRestriction at exact boundary of 88', () => {
    expect(selectInterventionLevel(88, 0)).toBe(InterventionLevel.InteractionRestriction);
  });

  it('returns NetworkDisruption at exact boundary of 94 with exactly 3 accounts', () => {
    expect(selectInterventionLevel(94, 3)).toBe(InterventionLevel.NetworkDisruption);
  });
});

// ---------------------------------------------------------------------------
// executeIntervention handler
// ---------------------------------------------------------------------------

describe('executeIntervention', () => {
  it('returns no intervention for score < 60', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(makeThreatEvent({ compositeScore: 50 }), deps);

    expect(result.interventionLevel).toBe(InterventionLevel.None);
    expect(result.interventionType).toBeNull();
    expect(result.executed).toBe(false);
    expect(result.approvalStatus).toBe('not_required');
    expect(deps.auditLog.logIntervention).toHaveBeenCalledTimes(1);
  });

  it('executes Level 1 SafetyPrompt for score in [60, 75)', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(
      makeThreatEvent({ compositeScore: 65, threatSignals: ['coercion'] }),
      deps,
    );

    expect(result.interventionLevel).toBe(InterventionLevel.SafetyPrompt);
    expect(result.interventionType).toBe(InterventionType.SafetyPrompt);
    expect(result.executed).toBe(true);
    expect(result.approvalStatus).toBe('not_required');
    expect(deps.safetyPrompt.injectPrompt).toHaveBeenCalledWith('user-1', 'session-1', ['coercion']);
    expect(deps.notification.notifyUser).toHaveBeenCalledWith(
      'user-1',
      InterventionType.SafetyPrompt,
      'safety_concern',
    );
    expect(deps.auditLog.logIntervention).toHaveBeenCalledTimes(1);
  });

  it('executes Level 2 Friction for score in [75, 88)', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(makeThreatEvent({ compositeScore: 80 }), deps);

    expect(result.interventionLevel).toBe(InterventionLevel.Friction);
    expect(result.interventionType).toBe(InterventionType.Friction);
    expect(result.executed).toBe(true);
    expect(deps.friction.deployFriction).toHaveBeenCalledWith('user-1', 'session-1');
    expect(deps.notification.notifyUser).toHaveBeenCalledWith(
      'user-1',
      InterventionType.Friction,
      'verification_required',
    );
  });

  it('executes Level 3 InteractionRestriction only after verified approval', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(
      makeThreatEvent({
        compositeScore: 90,
        correlatedAccounts: ['acc-2'],
        approvalReference: 'APPROVAL-DEMO-1',
      }),
      deps,
    );

    expect(result.interventionLevel).toBe(InterventionLevel.InteractionRestriction);
    expect(result.interventionType).toBe(InterventionType.InteractionRestriction);
    expect(result.executed).toBe(true);
    expect(result.approvalStatus).toBe('verified');
    expect(deps.approvalGate.verifyApproval).toHaveBeenCalledWith({
      approvalReference: 'APPROVAL-DEMO-1',
      sessionId: 'session-1',
      userId: 'user-1',
      interventionLevel: InterventionLevel.InteractionRestriction,
      interventionType: InterventionType.InteractionRestriction,
      targetAccountIds: ['user-1'],
    });
    expect(deps.accountSuspension.suspendAccount).toHaveBeenCalledWith('user-1', 'session-1');
    expect(deps.evidence.assembleEvidencePackage).toHaveBeenCalledWith('session-1', 'user-1', ['acc-2']);
    expect(deps.escalationQueue.enqueue).toHaveBeenCalledWith('session-1', 'user-1', 'interaction_restriction');
    expect(deps.notification.notifyUser).toHaveBeenCalledWith(
      'user-1',
      InterventionType.InteractionRestriction,
      'account_restricted',
    );
  });

  it('executes Level 4 NetworkDisruption only after verified approval', async () => {
    const deps = makeDeps();
    const correlatedAccounts = ['acc-2', 'acc-3', 'acc-4'];
    const result = await executeIntervention(
      makeThreatEvent({
        compositeScore: 96,
        correlatedAccounts,
        approvalReference: 'APPROVAL-DEMO-2',
      }),
      deps,
    );

    expect(result.interventionLevel).toBe(InterventionLevel.NetworkDisruption);
    expect(result.interventionType).toBe(InterventionType.NetworkDisruption);
    expect(result.executed).toBe(true);
    expect(result.approvalStatus).toBe('verified');
    expect(deps.networkDisruption.disruptNetwork).toHaveBeenCalledWith([
      'user-1',
      'acc-2',
      'acc-3',
      'acc-4',
    ]);
    expect(deps.evidence.assembleEvidencePackage).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      correlatedAccounts,
    );
    expect(deps.escalationQueue.enqueue).toHaveBeenCalledWith('session-1', 'user-1', 'network_disruption');
    expect(deps.notification.notifyUser).toHaveBeenCalledWith(
      'user-1',
      InterventionType.NetworkDisruption,
      'network_disabled',
    );
    expect(deps.approvalGate.verifyApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountIds: ['user-1', 'acc-2', 'acc-3', 'acc-4'],
      }),
    );
  });

  it('falls back to Level 3 for score >= 94 with < 3 correlated accounts', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(
      makeThreatEvent({
        compositeScore: 96,
        correlatedAccounts: ['acc-2'],
        approvalReference: 'APPROVAL-DEMO-3',
      }),
      deps,
    );

    expect(result.interventionLevel).toBe(InterventionLevel.InteractionRestriction);
    expect(result.interventionType).toBe(InterventionType.InteractionRestriction);
    expect(result.executed).toBe(true);
    expect(deps.accountSuspension.suspendAccount).toHaveBeenCalled();
    expect(deps.networkDisruption.disruptNetwork).not.toHaveBeenCalled();
  });

  it('deduplicates correlated accounts before selecting or authorizing an action', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(
      makeThreatEvent({
        compositeScore: 96,
        correlatedAccounts: ['user-1', 'acc-2', 'acc-2', 'acc-2'],
        approvalReference: 'APPROVAL-DEMO-DEDUPED',
      }),
      deps,
    );

    expect(result.interventionLevel).toBe(InterventionLevel.InteractionRestriction);
    expect(deps.networkDisruption.disruptNetwork).not.toHaveBeenCalled();
    expect(deps.accountSuspension.suspendAccount).toHaveBeenCalled();
    expect(deps.evidence.assembleEvidencePackage).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      ['acc-2'],
    );
    expect(deps.approvalGate.verifyApproval).toHaveBeenCalledWith(
      expect.objectContaining({ targetAccountIds: ['user-1'] }),
    );
  });

  it('queues Level 3 for review but does not restrict an account without approval', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(
      makeThreatEvent({ compositeScore: 90, correlatedAccounts: ['acc-2'] }),
      deps,
    );

    expect(result.executed).toBe(false);
    expect(result.approvalStatus).toBe('required');
    expect(deps.evidence.assembleEvidencePackage).toHaveBeenCalled();
    expect(deps.escalationQueue.enqueue).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      'interaction_restriction',
    );
    expect(deps.approvalGate.verifyApproval).not.toHaveBeenCalled();
    expect(deps.accountSuspension.suspendAccount).not.toHaveBeenCalled();
    expect(deps.notification.notifyUser).not.toHaveBeenCalled();
  });

  it('fails closed when an approval reference cannot be verified', async () => {
    const deps = makeDeps();
    vi.mocked(deps.approvalGate.verifyApproval).mockResolvedValue(false);

    const result = await executeIntervention(
      makeThreatEvent({
        compositeScore: 96,
        correlatedAccounts: ['acc-2', 'acc-3', 'acc-4'],
        approvalReference: 'APPROVAL-DEMO-INVALID',
      }),
      deps,
    );

    expect(result.executed).toBe(false);
    expect(result.approvalStatus).toBe('required');
    expect(deps.networkDisruption.disruptNetwork).not.toHaveBeenCalled();
    expect(deps.notification.notifyUser).not.toHaveBeenCalled();
  });

  it('always logs the intervention to the audit log', async () => {
    const deps = makeDeps();
    await executeIntervention(makeThreatEvent({ compositeScore: 80 }), deps);

    expect(deps.auditLog.logIntervention).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'user-1',
        interventionLevel: InterventionLevel.Friction,
        interventionType: InterventionType.Friction,
        compositeScore: 80,
        executed: true,
        approvalStatus: 'not_required',
      }),
    );
  });

  it('includes all four domain scores in the audit log entry', async () => {
    const deps = makeDeps();
    await executeIntervention(
      makeThreatEvent({
        compositeScore: 65,
        visualScore: 80,
        textualScore: 60,
        behavioralScore: 50,
        temporalScore: 40,
      }),
      deps,
    );

    expect(deps.auditLog.logIntervention).toHaveBeenCalledWith(
      expect.objectContaining({
        visualScore: 80,
        textualScore: 60,
        behavioralScore: 50,
        temporalScore: 40,
      }),
    );
  });

  it('does not call intervention services when no intervention needed', async () => {
    const deps = makeDeps();
    await executeIntervention(makeThreatEvent({ compositeScore: 30 }), deps);

    expect(deps.safetyPrompt.injectPrompt).not.toHaveBeenCalled();
    expect(deps.friction.deployFriction).not.toHaveBeenCalled();
    expect(deps.accountSuspension.suspendAccount).not.toHaveBeenCalled();
    expect(deps.networkDisruption.disruptNetwork).not.toHaveBeenCalled();
    expect(deps.notification.notifyUser).not.toHaveBeenCalled();
    expect(deps.evidence.assembleEvidencePackage).not.toHaveBeenCalled();
    expect(deps.escalationQueue.enqueue).not.toHaveBeenCalled();
    expect(deps.approvalGate.verifyApproval).not.toHaveBeenCalled();
  });

  it('returns correct sessionId and userId in result', async () => {
    const deps = makeDeps();
    const result = await executeIntervention(
      makeThreatEvent({ sessionId: 'sess-42', userId: 'usr-99', compositeScore: 70 }),
      deps,
    );

    expect(result.sessionId).toBe('sess-42');
    expect(result.userId).toBe('usr-99');
  });
});
