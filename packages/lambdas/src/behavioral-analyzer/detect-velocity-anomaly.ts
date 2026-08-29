import {
  VELOCITY_ANOMALY_THRESHOLD,
  VELOCITY_WINDOW_MINUTES,
} from '@safeguard-sentinel/shared';

import type { SessionStore } from './types';

/** Result of velocity anomaly detection. */
export interface VelocityAnomalyResult {
  isAnomaly: boolean;
  distinctRecipientCount: number;
  windowMinutes: number;
  threshold: number;
}

/**
 * Checks if a user has messaged 47+ distinct accounts in a 10-minute
 * sliding window using DynamoDB atomic counters.
 *
 * Classifies the session as a velocity anomaly when the threshold is met.
 */
export async function detectVelocityAnomaly(
  userId: string,
  timestamp: string,
  sessionStore: SessionStore,
): Promise<VelocityAnomalyResult> {
  const eventTime = new Date(timestamp);
  const windowStart = new Date(eventTime.getTime() - VELOCITY_WINDOW_MINUTES * 60 * 1000);

  const distinctRecipients = await sessionStore.getDistinctRecipientsInWindow(
    userId,
    windowStart.toISOString(),
    eventTime.toISOString(),
  );

  return {
    isAnomaly: distinctRecipients.length >= VELOCITY_ANOMALY_THRESHOLD,
    distinctRecipientCount: distinctRecipients.length,
    windowMinutes: VELOCITY_WINDOW_MINUTES,
    threshold: VELOCITY_ANOMALY_THRESHOLD,
  };
}
