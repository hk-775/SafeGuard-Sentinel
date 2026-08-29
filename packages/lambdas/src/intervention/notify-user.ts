import { InterventionType } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

export interface SNSNotificationClient {
  publish(userId: string, message: string): Promise<void>;
}

export interface NotifyUserDeps {
  sns: SNSNotificationClient;
}

// ---------------------------------------------------------------------------
// Notification content builders
// ---------------------------------------------------------------------------

/** Human-readable descriptions for each intervention type. */
const ACTION_DESCRIPTIONS: Record<InterventionType, string> = {
  [InterventionType.SafetyPrompt]: 'A safety tip has been added to your conversation.',
  [InterventionType.Friction]: 'A temporary verification hold has been placed on your messages.',
  [InterventionType.InteractionRestriction]: 'Your account interactions have been temporarily restricted.',
  [InterventionType.NetworkDisruption]: 'Your account has been temporarily disabled pending review.',
};

/** Appeal instructions included in every notification. */
const APPEAL_INSTRUCTIONS =
  'If you believe this action was taken in error, you can submit an appeal through the app settings under Safety > Appeal a Decision.';

/**
 * Builds a user-facing notification message.
 *
 * The notification contains:
 *  - A description of the action taken
 *  - The reason category
 *  - Instructions for initiating an appeal
 *
 * The notification does NOT contain:
 *  - Detection methods
 *  - Signal weights
 *  - Confidence scores
 */
export function buildNotificationMessage(
  interventionType: InterventionType,
  reasonCategory: string,
): string {
  const actionDescription = ACTION_DESCRIPTIONS[interventionType];
  return [
    actionDescription,
    `Reason: ${reasonCategory}.`,
    APPEAL_INSTRUCTIONS,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Sensitive content guard
// ---------------------------------------------------------------------------

/** Words/phrases that must never appear in user-facing notifications. */
const FORBIDDEN_PATTERNS = [
  'confidence score',
  'composite score',
  'signal weight',
  'detection method',
  'visual score',
  'textual score',
  'behavioral score',
  'temporal score',
  'threat score',
];

/**
 * Returns true if the message is safe to send (contains no forbidden content).
 */
export function isNotificationSafe(message: string): boolean {
  const lower = message.toLowerCase();
  return FORBIDDEN_PATTERNS.every((pattern) => !lower.includes(pattern));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends a user-facing notification via SNS describing the intervention action,
 * reason category, and appeal instructions.
 *
 * Validates that the notification does not leak detection methods, signal
 * weights, or confidence scores before sending.
 */
export async function notifyUser(
  userId: string,
  interventionType: InterventionType,
  reasonCategory: string,
  deps: NotifyUserDeps,
): Promise<void> {
  const message = buildNotificationMessage(interventionType, reasonCategory);

  if (!isNotificationSafe(message)) {
    throw new Error('Notification contains forbidden sensitive content');
  }

  await deps.sns.publish(userId, message);
}
