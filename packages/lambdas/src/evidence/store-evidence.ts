import { createHash } from 'crypto';
import type { EvidencePackage } from '@safeguard-sentinel/shared';
import type { StoreEvidenceDeps } from './types';

/**
 * Stores an evidence package in S3 with SSE-KMS encryption and
 * Object Lock in COMPLIANCE mode for tamper-evidence.
 *
 * Validates: Requirements 17.1, 17.2
 */
export async function storeEvidence(
  evidencePackage: EvidencePackage,
  deps: StoreEvidenceDeps,
): Promise<{ bucket: string; key: string }> {
  const body = JSON.stringify(evidencePackage);
  const checksumSHA256 = createHash('sha256').update(body).digest('hex');
  const key = `evidence/${evidencePackage.packageId}.json`;

  await deps.s3Client.putObject({
    bucket: deps.bucketName,
    key,
    body,
    checksumSHA256,
    sseKmsKeyId: deps.kmsKeyId,
    objectLockMode: 'COMPLIANCE',
    objectLockRetainUntilDate: evidencePackage.chainOfCustody.s3ObjectLockRetainUntil,
  });

  return { bucket: deps.bucketName, key };
}
