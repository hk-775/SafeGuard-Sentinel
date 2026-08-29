import { describe, it, expect } from 'vitest';
import { getS3BucketConfig } from './s3-config';

describe('getS3BucketConfig', () => {
  it('should enable Object Lock', () => {
    const config = getS3BucketConfig();
    expect(config.objectLockEnabled).toBe(true);
  });

  it('should configure SSE-KMS encryption', () => {
    const config = getS3BucketConfig();
    expect(config.sseKmsKeyArn).toContain('arn:aws:kms');
    expect(config.sseKmsKeyArn.length).toBeGreaterThan(0);
  });

  it('should have a Glacier lifecycle rule at 90 days', () => {
    const config = getS3BucketConfig();
    const glacierRule = config.lifecycleRules.find(
      (r) => r.storageClass === 'GLACIER',
    );
    expect(glacierRule).toBeDefined();
    expect(glacierRule!.transitionDays).toBe(90);
  });
});
