import { describe, it, expect, vi } from 'vitest';
import { detectVelocityAnomaly } from './detect-velocity-anomaly';
import type { SessionStore } from './types';
import { VELOCITY_ANOMALY_THRESHOLD, VELOCITY_WINDOW_MINUTES } from '@safeguard-sentinel/shared';

function makeSessionStore(distinctRecipients: string[]): SessionStore {
  return {
    recordInteraction: vi.fn().mockResolvedValue(undefined),
    getDistinctRecipientsInWindow: vi.fn().mockResolvedValue(distinctRecipients),
    getRecentConnections: vi.fn().mockResolvedValue([]),
  };
}

describe('detectVelocityAnomaly', () => {
  const timestamp = '2025-01-15T12:10:00Z';

  it('returns no anomaly when recipients are below threshold', async () => {
    const recipients = Array.from({ length: 46 }, (_, i) => `user-${i}`);
    const store = makeSessionStore(recipients);

    const result = await detectVelocityAnomaly('user-1', timestamp, store);

    expect(result.isAnomaly).toBe(false);
    expect(result.distinctRecipientCount).toBe(46);
    expect(result.threshold).toBe(VELOCITY_ANOMALY_THRESHOLD);
    expect(result.windowMinutes).toBe(VELOCITY_WINDOW_MINUTES);
  });

  it('returns anomaly when recipients reach exactly 47', async () => {
    const recipients = Array.from({ length: 47 }, (_, i) => `user-${i}`);
    const store = makeSessionStore(recipients);

    const result = await detectVelocityAnomaly('user-1', timestamp, store);

    expect(result.isAnomaly).toBe(true);
    expect(result.distinctRecipientCount).toBe(47);
  });

  it('returns anomaly when recipients exceed threshold', async () => {
    const recipients = Array.from({ length: 100 }, (_, i) => `user-${i}`);
    const store = makeSessionStore(recipients);

    const result = await detectVelocityAnomaly('user-1', timestamp, store);

    expect(result.isAnomaly).toBe(true);
    expect(result.distinctRecipientCount).toBe(100);
  });

  it('returns no anomaly for zero recipients', async () => {
    const store = makeSessionStore([]);

    const result = await detectVelocityAnomaly('user-1', timestamp, store);

    expect(result.isAnomaly).toBe(false);
    expect(result.distinctRecipientCount).toBe(0);
  });

  it('queries the correct 10-minute window', async () => {
    const store = makeSessionStore([]);

    await detectVelocityAnomaly('user-1', timestamp, store);

    expect(store.getDistinctRecipientsInWindow).toHaveBeenCalledWith(
      'user-1',
      '2025-01-15T12:00:00.000Z',
      '2025-01-15T12:10:00.000Z',
    );
  });
});
