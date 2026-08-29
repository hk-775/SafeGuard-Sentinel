import { describe, it, expect, vi } from 'vitest';
import { resolveAppeal } from './resolve-appeal';
import { AppealStatus, AppealResolution } from '@safeguard-sentinel/shared';
import type { AppealRecord } from '@safeguard-sentinel/shared';
import type { ResolveAppealDeps, ResolveAppealRequest } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoredAppeal(overrides: Partial<AppealRecord> = {}): AppealRecord {
  return {
    appealId: 'appeal-001',
    userId: 'user-001',
    interventionId: 'int-001',
    submittedAt: '2024-06-15T10:00:00Z',
    acknowledgedAt: '2024-06-15T10:00:00Z',
    status: AppealStatus.Acknowledged,
    resolution: null,
    resolvedAt: null,
    resolvedBy: null,
    originalEvidencePackageId: 'ep-001',
    slaDeadline: '2024-06-16T10:00:00Z',
    ttl: 1750000000,
    ...overrides,
  };
}

function makeDeps(appeal: AppealRecord | null): ResolveAppealDeps {
  return {
    appealStore: {
      createAppeal: vi.fn().mockResolvedValue(undefined),
      getAppeal: vi.fn().mockResolvedValue(appeal),
      updateAppeal: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function makeRequest(overrides: Partial<ResolveAppealRequest> = {}): ResolveAppealRequest {
  return {
    appealId: 'appeal-001',
    resolution: AppealResolution.Upheld,
    resolvedBy: 'reviewer-001',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveAppeal', () => {
  it('should update appeal with resolution, resolvedAt, resolvedBy, and status=Resolved', async () => {
    const stored = makeStoredAppeal();
    const deps = makeDeps(stored);
    const request = makeRequest();

    const result = await resolveAppeal(request, deps);

    expect(deps.appealStore.updateAppeal).toHaveBeenCalledOnce();
    const [id, updates] = vi.mocked(deps.appealStore.updateAppeal).mock.calls[0];
    expect(id).toBe('appeal-001');
    expect(updates.resolution).toBe(AppealResolution.Upheld);
    expect(updates.resolvedBy).toBe('reviewer-001');
    expect(updates.status).toBe(AppealStatus.Resolved);
    expect(updates.resolvedAt).toBeDefined();

    expect(result.status).toBe(AppealStatus.Resolved);
    expect(result.resolution).toBe(AppealResolution.Upheld);
    expect(result.resolvedBy).toBe('reviewer-001');
    expect(result.resolvedAt).toBeDefined();
  });

  it('should throw when appeal not found', async () => {
    const deps = makeDeps(null);
    const request = makeRequest();

    await expect(resolveAppeal(request, deps)).rejects.toThrow('Appeal not found: appeal-001');
  });

  it('should handle Upheld resolution', async () => {
    const stored = makeStoredAppeal();
    const deps = makeDeps(stored);
    const request = makeRequest({ resolution: AppealResolution.Upheld });

    const result = await resolveAppeal(request, deps);

    expect(result.resolution).toBe(AppealResolution.Upheld);
    expect(result.status).toBe(AppealStatus.Resolved);
  });

  it('should handle Reversed resolution', async () => {
    const stored = makeStoredAppeal();
    const deps = makeDeps(stored);
    const request = makeRequest({ resolution: AppealResolution.Reversed });

    const result = await resolveAppeal(request, deps);

    expect(result.resolution).toBe(AppealResolution.Reversed);
    expect(result.status).toBe(AppealStatus.Resolved);
  });

  it('should handle Modified resolution', async () => {
    const stored = makeStoredAppeal();
    const deps = makeDeps(stored);
    const request = makeRequest({ resolution: AppealResolution.Modified });

    const result = await resolveAppeal(request, deps);

    expect(result.resolution).toBe(AppealResolution.Modified);
    expect(result.status).toBe(AppealStatus.Resolved);
  });
});
