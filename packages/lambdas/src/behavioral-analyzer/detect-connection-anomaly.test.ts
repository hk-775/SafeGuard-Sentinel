import { describe, it, expect, vi } from 'vitest';
import {
  detectConnectionAnomaly,
  INDISCRIMINATE_CONNECTION_THRESHOLD,
  NEW_ACCOUNT_AGE_HOURS,
  NEW_ACCOUNT_CONNECTION_THRESHOLD,
  MIN_CONNECTIONS_FOR_ANALYSIS,
} from './detect-connection-anomaly';
import type { SessionStore, ConnectionRecord } from './types';

function makeSessionStore(connections: ConnectionRecord[]): SessionStore {
  return {
    recordInteraction: vi.fn().mockResolvedValue(undefined),
    getDistinctRecipientsInWindow: vi.fn().mockResolvedValue([]),
    getRecentConnections: vi.fn().mockResolvedValue(connections),
  };
}

function makeConnection(overrides: Partial<ConnectionRecord> = {}): ConnectionRecord {
  return {
    userId: 'user-1',
    connectedUserId: `connection-${Math.random().toString(36).slice(2)}`,
    accepted: true,
    connectedAccountCreatedAt: '2024-01-01T00:00:00Z', // old account
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('detectConnectionAnomaly', () => {
  it('returns no anomaly when fewer than MIN_CONNECTIONS_FOR_ANALYSIS connections', async () => {
    const connections = Array.from({ length: MIN_CONNECTIONS_FOR_ANALYSIS - 1 }, () => makeConnection());
    const store = makeSessionStore(connections);

    const result = await detectConnectionAnomaly('user-1', store);

    expect(result.isAnomaly).toBe(false);
    expect(result.totalConnections).toBe(MIN_CONNECTIONS_FOR_ANALYSIS - 1);
  });

  it('detects indiscriminate connection when acceptance rate >= 90%', async () => {
    // 10 connections, 9 accepted = 90% acceptance rate
    const connections = [
      ...Array.from({ length: 9 }, () => makeConnection({ accepted: true })),
      makeConnection({ accepted: false }),
    ];
    const store = makeSessionStore(connections);

    const result = await detectConnectionAnomaly('user-1', store);

    expect(result.isAnomaly).toBe(true);
    expect(result.indiscriminateConnections).toBe(true);
    expect(result.acceptanceRate).toBe(0.9);
  });

  it('does not flag indiscriminate connection below threshold', async () => {
    // 10 connections, 8 accepted = 80% acceptance rate
    const connections = [
      ...Array.from({ length: 8 }, () => makeConnection({ accepted: true })),
      ...Array.from({ length: 2 }, () => makeConnection({ accepted: false })),
    ];
    const store = makeSessionStore(connections);

    const result = await detectConnectionAnomaly('user-1', store);

    expect(result.indiscriminateConnections).toBe(false);
  });

  it('detects new account exclusivity when 80%+ connections are with new accounts', async () => {
    const now = new Date();
    const recentCreation = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12h ago
    const oldCreation = '2024-01-01T00:00:00Z';

    // 5 accepted connections: 4 with new accounts, 1 with old = 80%
    const connections = [
      ...Array.from({ length: 4 }, () =>
        makeConnection({ accepted: true, connectedAccountCreatedAt: recentCreation }),
      ),
      makeConnection({ accepted: true, connectedAccountCreatedAt: oldCreation }),
    ];
    const store = makeSessionStore(connections);

    const result = await detectConnectionAnomaly('user-1', store);

    expect(result.isAnomaly).toBe(true);
    expect(result.newAccountExclusivity).toBe(true);
    expect(result.newAccountConnectionRate).toBe(0.8);
  });

  it('does not flag new account exclusivity below threshold', async () => {
    const now = new Date();
    const recentCreation = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const oldCreation = '2024-01-01T00:00:00Z';

    // 5 accepted connections: 3 with new accounts, 2 with old = 60%
    const connections = [
      ...Array.from({ length: 3 }, () =>
        makeConnection({ accepted: true, connectedAccountCreatedAt: recentCreation }),
      ),
      ...Array.from({ length: 2 }, () =>
        makeConnection({ accepted: true, connectedAccountCreatedAt: oldCreation }),
      ),
    ];
    const store = makeSessionStore(connections);

    const result = await detectConnectionAnomaly('user-1', store);

    expect(result.newAccountExclusivity).toBe(false);
  });

  it('returns both flags when both anomalies are present', async () => {
    const now = new Date();
    const recentCreation = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    // 10 connections, 10 accepted (100%), all with new accounts
    const connections = Array.from({ length: 10 }, () =>
      makeConnection({ accepted: true, connectedAccountCreatedAt: recentCreation }),
    );
    const store = makeSessionStore(connections);

    const result = await detectConnectionAnomaly('user-1', store);

    expect(result.isAnomaly).toBe(true);
    expect(result.indiscriminateConnections).toBe(true);
    expect(result.newAccountExclusivity).toBe(true);
  });
});
