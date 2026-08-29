import { describe, it, expect, vi } from 'vitest';
import { detectRapidEscalation } from './detect-rapid-escalation';
import type { EscalationTracker } from './types';
import { ESCALATION_WINDOW_MINUTES } from '@safeguard-sentinel/shared';

function makeTracker(
  connectionTimestamp: string | null,
  contactRequestTimestamp: string | null,
): EscalationTracker {
  return {
    getConnectionTimestamp: vi.fn().mockResolvedValue(connectionTimestamp),
    hasContactRequest: vi.fn().mockResolvedValue(contactRequestTimestamp !== null),
    getContactRequestTimestamp: vi.fn().mockResolvedValue(contactRequestTimestamp),
  };
}

describe('detectRapidEscalation', () => {
  it('detects rapid escalation when elapsed time < 15 minutes', async () => {
    const connectionTime = '2025-01-15T12:00:00Z';
    const contactTime = '2025-01-15T12:10:00Z'; // 10 minutes later
    const tracker = makeTracker(connectionTime, contactTime);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(true);
    expect(result.elapsedMinutes).toBe(10);
    expect(result.thresholdMinutes).toBe(ESCALATION_WINDOW_MINUTES);
  });

  it('does NOT flag when elapsed time is exactly 15 minutes', async () => {
    const connectionTime = '2025-01-15T12:00:00Z';
    const contactTime = '2025-01-15T12:15:00Z'; // exactly 15 minutes
    const tracker = makeTracker(connectionTime, contactTime);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(false);
    expect(result.elapsedMinutes).toBe(15);
  });

  it('does NOT flag when elapsed time exceeds 15 minutes', async () => {
    const connectionTime = '2025-01-15T12:00:00Z';
    const contactTime = '2025-01-15T12:30:00Z'; // 30 minutes
    const tracker = makeTracker(connectionTime, contactTime);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(false);
    expect(result.elapsedMinutes).toBe(30);
  });

  it('returns no escalation when no connection exists', async () => {
    const tracker = makeTracker(null, null);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(false);
    expect(result.elapsedMinutes).toBeNull();
  });

  it('returns no escalation when connection exists but no contact request', async () => {
    const tracker = makeTracker('2025-01-15T12:00:00Z', null);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(false);
    expect(result.elapsedMinutes).toBeNull();
  });

  it('detects escalation at 14 minutes 59 seconds (just under threshold)', async () => {
    const connectionTime = '2025-01-15T12:00:00Z';
    const contactTime = '2025-01-15T12:14:59Z'; // 14m 59s
    const tracker = makeTracker(connectionTime, contactTime);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(true);
    expect(result.elapsedMinutes).toBeCloseTo(14.983, 2);
  });

  it('detects escalation at 1 minute', async () => {
    const connectionTime = '2025-01-15T12:00:00Z';
    const contactTime = '2025-01-15T12:01:00Z';
    const tracker = makeTracker(connectionTime, contactTime);

    const result = await detectRapidEscalation('session-1', tracker);

    expect(result.isRapidEscalation).toBe(true);
    expect(result.elapsedMinutes).toBe(1);
  });
});
