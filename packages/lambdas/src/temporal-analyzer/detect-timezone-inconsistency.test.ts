import { describe, it, expect, vi } from 'vitest';
import { detectTimezoneInconsistency, TIMEZONE_DISCREPANCY_THRESHOLD_HOURS } from './detect-timezone-inconsistency';
import type { TimezoneService, ActivityPatternService } from './types';

function makeTimezoneService(timezone: string, utcOffset: number): TimezoneService {
  return {
    getStatedTimezone: vi.fn().mockResolvedValue(timezone),
    getUtcOffset: vi.fn().mockResolvedValue(utcOffset),
  };
}

function makeActivityService(observedOffset: number): ActivityPatternService {
  return {
    getObservedUtcOffset: vi.fn().mockResolvedValue(observedOffset),
  };
}

describe('detectTimezoneInconsistency', () => {
  it('detects inconsistency when discrepancy exceeds threshold', async () => {
    // Stated: UTC+2, Observed: UTC+8 → discrepancy = 6 hours
    const tz = makeTimezoneService('Synthetic/PlusTwo', 2);
    const activity = makeActivityService(8);

    const result = await detectTimezoneInconsistency('user-1', tz, activity);

    expect(result.isInconsistent).toBe(true);
    expect(result.statedOffset).toBe(2);
    expect(result.observedOffset).toBe(8);
    expect(result.discrepancyHours).toBe(6);
    expect(result.thresholdHours).toBe(TIMEZONE_DISCREPANCY_THRESHOLD_HOURS);
  });

  it('does NOT flag when discrepancy is exactly at threshold', async () => {
    // Stated: UTC+2, Observed: UTC+4 → discrepancy = 2 hours (at threshold, not exceeding)
    const tz = makeTimezoneService('Synthetic/PlusTwo', 2);
    const activity = makeActivityService(4);

    const result = await detectTimezoneInconsistency('user-1', tz, activity);

    expect(result.isInconsistent).toBe(false);
    expect(result.discrepancyHours).toBe(2);
  });

  it('does NOT flag when discrepancy is below threshold', async () => {
    // Stated: UTC+2, Observed: UTC+3 → discrepancy = 1 hour
    const tz = makeTimezoneService('Europe/Athens', 2);
    const activity = makeActivityService(3);

    const result = await detectTimezoneInconsistency('user-1', tz, activity);

    expect(result.isInconsistent).toBe(false);
    expect(result.discrepancyHours).toBe(1);
  });

  it('does NOT flag when offsets connection exactly', async () => {
    const tz = makeTimezoneService('Synthetic/MinusFive', -5);
    const activity = makeActivityService(-5);

    const result = await detectTimezoneInconsistency('user-1', tz, activity);

    expect(result.isInconsistent).toBe(false);
    expect(result.discrepancyHours).toBe(0);
  });

  it('handles negative offset discrepancies correctly', async () => {
    // Stated: UTC-5, Observed: UTC+3 → discrepancy = 8 hours
    const tz = makeTimezoneService('Synthetic/MinusFive', -5);
    const activity = makeActivityService(3);

    const result = await detectTimezoneInconsistency('user-1', tz, activity);

    expect(result.isInconsistent).toBe(true);
    expect(result.discrepancyHours).toBe(8);
  });

  it('accepts a custom threshold', async () => {
    // Stated: UTC+2, Observed: UTC+5 → discrepancy = 3 hours
    // With threshold = 4, should NOT flag
    const tz = makeTimezoneService('Synthetic/PlusTwo', 2);
    const activity = makeActivityService(5);

    const result = await detectTimezoneInconsistency('user-1', tz, activity, 4);

    expect(result.isInconsistent).toBe(false);
    expect(result.thresholdHours).toBe(4);
  });

  it('flags with custom threshold when exceeded', async () => {
    // Stated: UTC+2, Observed: UTC+5 → discrepancy = 3 hours
    // With threshold = 1, should flag
    const tz = makeTimezoneService('Europe/Athens', 2);
    const activity = makeActivityService(5);

    const result = await detectTimezoneInconsistency('user-1', tz, activity, 1);

    expect(result.isInconsistent).toBe(true);
    expect(result.thresholdHours).toBe(1);
  });
});
