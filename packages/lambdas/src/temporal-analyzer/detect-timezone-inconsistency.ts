import type { TimezoneService, ActivityPatternService } from './types';

/** Default threshold in hours for timezone discrepancy detection. */
export const TIMEZONE_DISCREPANCY_THRESHOLD_HOURS = 2;

/** Result of timezone inconsistency detection. */
export interface TimezoneInconsistencyResult {
  /** Whether a timezone inconsistency was detected. */
  isInconsistent: boolean;
  /** The UTC offset (hours) implied by the user's stated location. */
  statedOffset: number;
  /** The UTC offset (hours) inferred from observed activity patterns. */
  observedOffset: number;
  /** The absolute discrepancy in hours. */
  discrepancyHours: number;
  /** The threshold used for detection. */
  thresholdHours: number;
}

/**
 * Compares the timezone implied by a user's stated location with the
 * timezone inferred from their observed peak activity hours. Reports a
 * location-mismatch signal when the discrepancy exceeds the threshold.
 */
export async function detectTimezoneInconsistency(
  userId: string,
  timezoneService: TimezoneService,
  activityPatternService: ActivityPatternService,
  thresholdHours: number = TIMEZONE_DISCREPANCY_THRESHOLD_HOURS,
): Promise<TimezoneInconsistencyResult> {
  const statedTimezone = await timezoneService.getStatedTimezone(userId);
  const statedOffset = await timezoneService.getUtcOffset(statedTimezone);
  const observedOffset = await activityPatternService.getObservedUtcOffset(userId);

  const discrepancyHours = Math.abs(statedOffset - observedOffset);

  return {
    isInconsistent: discrepancyHours > thresholdHours,
    statedOffset,
    observedOffset,
    discrepancyHours,
    thresholdHours,
  };
}
