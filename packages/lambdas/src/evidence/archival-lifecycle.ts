import type { ArchivalLifecycleDeps } from './types';

/** Number of days before evidence objects transition to Glacier. */
export const GLACIER_TRANSITION_DAYS = 90;

/**
 * Configures an S3 Lifecycle rule to transition evidence objects
 * to Glacier after 90 days for long-term law enforcement retention.
 *
 * Validates: Requirements 17.1
 */
export async function configureArchivalLifecycle(
  deps: ArchivalLifecycleDeps,
): Promise<void> {
  await deps.s3Client.putLifecycleConfiguration({
    bucket: deps.bucketName,
    rules: [
      {
        id: 'evidence-glacier-transition',
        prefix: 'evidence/',
        status: 'Enabled',
        transitions: [
          { days: GLACIER_TRANSITION_DAYS, storageClass: 'GLACIER' },
        ],
      },
    ],
  });
}
