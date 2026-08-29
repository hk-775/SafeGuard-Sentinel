import type { TransferEvidenceDeps } from './types';

/** Pre-signed URL expiry: 1 hour. */
export const TRANSFER_URL_EXPIRY_SECONDS = 3600;

/**
 * Generates a secure, auditable pre-signed URL for transferring an evidence
 * package to law enforcement.
 *
 * Validates: Requirements 17.3
 */
export async function transferEvidence(
  packageId: string,
  requestedBy: string,
  purpose: string,
  deps: TransferEvidenceDeps,
): Promise<{ presignedUrl: string; expiresAt: string }> {
  const key = `evidence/${packageId}.json`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRANSFER_URL_EXPIRY_SECONDS * 1000).toISOString();

  const presignedUrl = await deps.presignClient.generatePresignedUrl({
    bucket: deps.bucketName,
    key,
    expiresInSeconds: TRANSFER_URL_EXPIRY_SECONDS,
  });

  await deps.accessLog.logAccess({
    packageId,
    requestedBy,
    purpose,
    objectKey: key,
    expiresAt,
    timestamp: now.toISOString(),
  });

  return { presignedUrl, expiresAt };
}
