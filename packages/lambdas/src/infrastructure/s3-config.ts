import type { S3BucketConfig } from './types';

/**
 * Returns the S3 evidence bucket configuration with SSE-KMS encryption,
 * Object Lock (WORM) for tamper-evidence, and a Glacier lifecycle rule
 * that transitions objects after 90 days.
 */
export function getS3BucketConfig(): S3BucketConfig {
  return {
    bucketName: 'safeguard-sentinel-evidence',
    sseKmsKeyArn: 'arn:aws:kms:us-east-1:ACCOUNT:key/evidence-encryption-key',
    objectLockEnabled: true,
    lifecycleRules: [
      {
        id: 'glacier-transition',
        prefix: 'evidence/',
        transitionDays: 90,
        storageClass: 'GLACIER',
      },
    ],
  };
}
