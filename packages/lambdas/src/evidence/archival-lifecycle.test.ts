import { describe, it, expect, vi } from 'vitest';
import {
  configureArchivalLifecycle,
  GLACIER_TRANSITION_DAYS,
} from './archival-lifecycle';
import type { ArchivalLifecycleDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(
  overrides: Partial<ArchivalLifecycleDeps> = {},
): ArchivalLifecycleDeps {
  return {
    s3Client: {
      putLifecycleConfiguration: vi.fn().mockResolvedValue(undefined),
    },
    bucketName: 'evidence-bucket',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GLACIER_TRANSITION_DAYS', () => {
  it('should be 90', () => {
    expect(GLACIER_TRANSITION_DAYS).toBe(90);
  });
});

describe('configureArchivalLifecycle', () => {
  it('should call putLifecycleConfiguration with correct bucket, rule ID, prefix, status, and transition', async () => {
    const deps = makeDeps();

    await configureArchivalLifecycle(deps);

    expect(deps.s3Client.putLifecycleConfiguration).toHaveBeenCalledWith({
      bucket: 'evidence-bucket',
      rules: [
        {
          id: 'evidence-glacier-transition',
          prefix: 'evidence/',
          status: 'Enabled',
          transitions: [{ days: 90, storageClass: 'GLACIER' }],
        },
      ],
    });
  });

  it('should transition to GLACIER after 90 days', async () => {
    const deps = makeDeps();

    await configureArchivalLifecycle(deps);

    const call = vi.mocked(deps.s3Client.putLifecycleConfiguration).mock
      .calls[0][0];
    const transition = call.rules[0].transitions[0];

    expect(transition.days).toBe(90);
    expect(transition.storageClass).toBe('GLACIER');
  });

  it('should use the correct bucket name from deps', async () => {
    const deps = makeDeps({ bucketName: 'custom-bucket' });

    await configureArchivalLifecycle(deps);

    expect(deps.s3Client.putLifecycleConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'custom-bucket' }),
    );
  });
});
