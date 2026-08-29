import { describe, it, expect, vi } from 'vitest';
import { submitAppeal } from './submit-appeal';
import {
  AppealStatus,
  APPEAL_RESOLUTION_SLA_HOURS,
  AUDIT_RETENTION_MONTHS,
} from '@safeguard-sentinel/shared';
import type { SubmitAppealDeps, SubmitAppealRequest } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(overrides: Partial<SubmitAppealRequest> = {}): SubmitAppealRequest {
  return {
    userId: 'user-001',
    interventionId: 'int-001',
    originalEvidencePackageId: 'ep-001',
    ...overrides,
  };
}

function makeDeps(overrides: Partial<SubmitAppealDeps> = {}): SubmitAppealDeps {
  return {
    appealStore: {
      createAppeal: vi.fn().mockResolvedValue(undefined),
      getAppeal: vi.fn().mockResolvedValue(null),
      updateAppeal: vi.fn().mockResolvedValue(undefined),
    },
    escalationClient: {
      routeAppeal: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('submitAppeal', () => {
  it('should create appeal in store with correct fields', async () => {
    const deps = makeDeps();
    const request = makeRequest();

    await submitAppeal(request, deps);

    expect(deps.appealStore.createAppeal).toHaveBeenCalledOnce();
    const appeal = vi.mocked(deps.appealStore.createAppeal).mock.calls[0][0];

    expect(appeal.userId).toBe('user-001');
    expect(appeal.interventionId).toBe('int-001');
    expect(appeal.originalEvidencePackageId).toBe('ep-001');
    expect(appeal.appealId).toBeDefined();
    expect(appeal.status).toBe(AppealStatus.Acknowledged);
    expect(appeal.resolution).toBeNull();
    expect(appeal.resolvedAt).toBeNull();
    expect(appeal.resolvedBy).toBeNull();
  });

  it('should call escalation client with correct params', async () => {
    const deps = makeDeps();
    const request = makeRequest();

    const result = await submitAppeal(request, deps);

    expect(deps.escalationClient.routeAppeal).toHaveBeenCalledOnce();
    expect(deps.escalationClient.routeAppeal).toHaveBeenCalledWith({
      appealId: result.appealId,
      userId: 'user-001',
      interventionId: 'int-001',
      evidencePackageId: 'ep-001',
    });
  });

  it('should set slaDeadline to 24 hours from submission', async () => {
    const deps = makeDeps();
    const request = makeRequest();

    const before = Date.now();
    const result = await submitAppeal(request, deps);
    const after = Date.now();

    const acknowledgedMs = new Date(result.acknowledgedAt).getTime();
    const slaMs = new Date(result.slaDeadline).getTime();
    const expectedDiffMs = APPEAL_RESOLUTION_SLA_HOURS * 60 * 60 * 1000;

    expect(slaMs - acknowledgedMs).toBe(expectedDiffMs);
    expect(acknowledgedMs).toBeGreaterThanOrEqual(before);
    expect(acknowledgedMs).toBeLessThanOrEqual(after);
  });

  it('should return status as Acknowledged', async () => {
    const deps = makeDeps();
    const request = makeRequest();

    const result = await submitAppeal(request, deps);

    expect(result.status).toBe(AppealStatus.Acknowledged);
  });

  it('should set TTL to approximately 12 months from now', async () => {
    const deps = makeDeps();
    const request = makeRequest();

    await submitAppeal(request, deps);

    const appeal = vi.mocked(deps.appealStore.createAppeal).mock.calls[0][0];
    const nowEpoch = Math.floor(Date.now() / 1000);
    const expectedTtl = AUDIT_RETENTION_MONTHS * 30 * 24 * 60 * 60;

    // TTL should be within a few seconds of expected
    expect(appeal.ttl).toBeGreaterThanOrEqual(nowEpoch + expectedTtl - 5);
    expect(appeal.ttl).toBeLessThanOrEqual(nowEpoch + expectedTtl + 5);
  });
});
