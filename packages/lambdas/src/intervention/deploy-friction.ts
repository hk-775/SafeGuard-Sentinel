// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

export interface MessageDelayClient {
  applyDelay(userId: string, sessionId: string, delayMs: number): Promise<void>;
}

export interface UserNotificationClient {
  sendNotification(userId: string, message: string): Promise<void>;
}

export interface DeployFrictionDeps {
  messageDelay: MessageDelayClient;
  userNotification: UserNotificationClient;
}

/** Default message delivery delay in milliseconds (30 seconds). */
export const DEFAULT_FRICTION_DELAY_MS = 30_000;

/** Notification shown to the user while friction is active. */
export const FRICTION_NOTIFICATION_MESSAGE =
  'Your messages are being held briefly while we complete a routine verification. This helps keep the community safe.';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Level 2 intervention — introduces a message delivery delay and notifies
 * the affected user that verification is in progress.
 *
 * Executes autonomously without human approval.
 */
export async function deployFriction(
  userId: string,
  sessionId: string,
  deps: DeployFrictionDeps,
): Promise<void> {
  await deps.messageDelay.applyDelay(userId, sessionId, DEFAULT_FRICTION_DELAY_MS);
  await deps.userNotification.sendNotification(userId, FRICTION_NOTIFICATION_MESSAGE);
}
