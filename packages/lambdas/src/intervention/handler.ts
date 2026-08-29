import {
  InterventionLevel,
  InterventionType,
  INTERVENTION_THRESHOLDS,
  NETWORK_DISRUPTION_MIN_ACCOUNTS,
} from '@safeguard-sentinel/shared';

import type {
  ThreatEvent,
  InterventionApprovalStatus,
  InterventionDeps,
  InterventionResult,
} from './types';

// ---------------------------------------------------------------------------
// Pure function — intervention level selection
// ---------------------------------------------------------------------------

/**
 * Selects the appropriate intervention level based on the composite threat
 * score and the number of correlated accounts.
 *
 * Thresholds:
 *   L1 [60, 75)  — Safety Prompt
 *   L2 [75, 88)  — Friction
 *   L3 [88, 94)  — Interaction Restriction
 *   L4 >= 94 with 3+ correlated accounts — Network Disruption
 *   >= 94 with < 3 accounts — falls back to L3
 *   < 60 — No intervention
 */
export function selectInterventionLevel(
  compositeScore: number,
  correlatedAccountCount: number,
): InterventionLevel {
  if (
    compositeScore >= INTERVENTION_THRESHOLDS.LEVEL_4 &&
    correlatedAccountCount >= NETWORK_DISRUPTION_MIN_ACCOUNTS
  ) {
    return InterventionLevel.NetworkDisruption;
  }
  if (compositeScore >= INTERVENTION_THRESHOLDS.LEVEL_3) {
    return InterventionLevel.InteractionRestriction;
  }
  if (compositeScore >= INTERVENTION_THRESHOLDS.LEVEL_2) {
    return InterventionLevel.Friction;
  }
  if (compositeScore >= INTERVENTION_THRESHOLDS.LEVEL_1) {
    return InterventionLevel.SafetyPrompt;
  }
  return InterventionLevel.None;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function interventionTypeForLevel(level: InterventionLevel): InterventionType | null {
  switch (level) {
    case InterventionLevel.SafetyPrompt:
      return InterventionType.SafetyPrompt;
    case InterventionLevel.Friction:
      return InterventionType.Friction;
    case InterventionLevel.InteractionRestriction:
      return InterventionType.InteractionRestriction;
    case InterventionLevel.NetworkDisruption:
      return InterventionType.NetworkDisruption;
    default:
      return null;
  }
}

function requiresHumanApproval(level: InterventionLevel): boolean {
  return (
    level === InterventionLevel.InteractionRestriction ||
    level === InterventionLevel.NetworkDisruption
  );
}

// ---------------------------------------------------------------------------
// Handler — orchestrates the full intervention workflow
// ---------------------------------------------------------------------------

/**
 * Receives a threat event from EventBridge, selects the correct intervention
 * level, executes the corresponding intervention task, and logs the action.
 */
export async function executeIntervention(
  event: ThreatEvent,
  deps: InterventionDeps,
): Promise<InterventionResult> {
  const {
    sessionId,
    userId,
    compositeScore,
    visualScore,
    textualScore,
    behavioralScore,
    temporalScore,
    correlatedAccounts,
    threatSignals,
    approvalReference,
  } = event;

  const uniqueCorrelatedAccounts = [...new Set(correlatedAccounts)].filter(
    (accountId) => accountId !== userId,
  );
  const correlatedAccountCount = uniqueCorrelatedAccounts.length;
  const level = selectInterventionLevel(compositeScore, correlatedAccountCount);
  const interventionType = interventionTypeForLevel(level);
  const targetAccountIds =
    level === InterventionLevel.NetworkDisruption
      ? [userId, ...uniqueCorrelatedAccounts]
      : [userId];
  let approvalStatus: InterventionApprovalStatus = requiresHumanApproval(level)
    ? 'required'
    : 'not_required';

  const logResult = async (executed: boolean): Promise<void> => {
    await deps.auditLog.logIntervention({
      sessionId,
      userId,
      interventionLevel: level,
      interventionType,
      compositeScore,
      visualScore,
      textualScore,
      behavioralScore,
      temporalScore,
      executed,
      approvalStatus,
    });
  };

  // No intervention needed
  if (level === InterventionLevel.None) {
    await logResult(false);

    return {
      interventionLevel: level,
      interventionType: null,
      sessionId,
      userId,
      executed: false,
      approvalStatus,
    };
  }

  // Consequential actions fail closed until a separate human approval is
  // present and cryptographically or transactionally verified by the adopter.
  if (requiresHumanApproval(level) && interventionType) {
    await deps.evidence.assembleEvidencePackage(sessionId, userId, uniqueCorrelatedAccounts);
    await deps.escalationQueue.enqueue(
      sessionId,
      userId,
      level === InterventionLevel.NetworkDisruption
        ? 'network_disruption'
        : 'interaction_restriction',
    );

    let approvalVerified = false;
    if (approvalReference) {
      approvalVerified = await deps.approvalGate.verifyApproval({
        approvalReference,
        sessionId,
        userId,
        interventionLevel: level,
        interventionType,
        targetAccountIds,
      });
    }

    if (!approvalVerified) {
      await logResult(false);
      return {
        interventionLevel: level,
        interventionType,
        sessionId,
        userId,
        executed: false,
        approvalStatus,
      };
    }

    approvalStatus = 'verified';
  }

  // Execute the appropriate intervention task
  switch (level) {
    case InterventionLevel.SafetyPrompt:
      await deps.safetyPrompt.injectPrompt(userId, sessionId, threatSignals);
      await deps.notification.notifyUser(userId, InterventionType.SafetyPrompt, 'safety_concern');
      break;

    case InterventionLevel.Friction:
      await deps.friction.deployFriction(userId, sessionId);
      await deps.notification.notifyUser(userId, InterventionType.Friction, 'verification_required');
      break;

    case InterventionLevel.InteractionRestriction:
      await deps.accountSuspension.suspendAccount(userId, sessionId);
      await deps.notification.notifyUser(userId, InterventionType.InteractionRestriction, 'account_restricted');
      break;

    case InterventionLevel.NetworkDisruption:
      await deps.networkDisruption.disruptNetwork(targetAccountIds);
      await deps.notification.notifyUser(userId, InterventionType.NetworkDisruption, 'network_disabled');
      break;
  }

  // Log the intervention for audit
  await logResult(true);

  return {
    interventionLevel: level,
    interventionType,
    sessionId,
    userId,
    executed: true,
    approvalStatus,
  };
}
