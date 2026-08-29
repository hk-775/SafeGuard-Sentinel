import { createHash, randomUUID } from 'crypto';
import type { EvidencePackage, InterventionLevel } from '@safeguard-sentinel/shared';
import { CONTENT_RETENTION_DAYS } from '@safeguard-sentinel/shared';
import type { AssembleEvidenceDeps } from './types';

// ---------------------------------------------------------------------------
// Evidence Package Assembly
// ---------------------------------------------------------------------------

/**
 * Assembles a complete evidence package by collecting data from all injected
 * clients and producing a tamper-evident, chain-of-custody-aware bundle.
 *
 * Validates: Requirements 8.2, 9.2, 12.2, 17.1, 17.2
 */
export async function assembleEvidencePackage(
  sessionId: string,
  userId: string,
  targetAccounts: string[],
  interventionLevel: InterventionLevel,
  deps: AssembleEvidenceDeps,
): Promise<EvidencePackage> {
  // Collect all data concurrently from injected clients
  const [
    conversationHistory,
    photoMetadata,
    behavioralTimeline,
    crossReferences,
    networkGraph,
    aiResponseDrafts,
    scoreRecord,
  ] = await Promise.all([
    deps.conversationHistory.getHistory(sessionId, targetAccounts),
    deps.photoMetadata.getMetadata(targetAccounts),
    deps.behavioralTimeline.getTimeline(sessionId, userId),
    deps.crossReference.getCrossReferences(targetAccounts),
    deps.networkGraph.getNetworkGraph(targetAccounts),
    deps.aiResponseDraft.getDrafts(sessionId),
    deps.threatScore.getScoreRecord(sessionId),
  ]);

  const compositeScore = scoreRecord?.compositeScore ?? 0;
  const visualScore = scoreRecord?.visualScore ?? 0;
  const textualScore = scoreRecord?.textualScore ?? 0;
  const behavioralScore = scoreRecord?.behavioralScore ?? 0;
  const temporalScore = scoreRecord?.temporalScore ?? 0;

  const now = new Date();
  const createdAt = now.toISOString();

  // Build the evidence package (without chainOfCustody first, for checksum)
  const packageId = randomUUID();
  const caseId = randomUUID();

  const retainUntil = new Date(now.getTime() + CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const evidenceBody: Omit<EvidencePackage, 'chainOfCustody'> = {
    packageId,
    caseId,
    createdAt,
    targetAccounts,
    interventionLevel,
    compositeScoreAtIntervention: compositeScore,
    signalBreakdown: {
      visual: { score: visualScore, signals: [] },
      textual: { score: textualScore, signals: [] },
      behavioral: { score: behavioralScore, signals: [] },
      temporal: { score: temporalScore, signals: [] },
    },
    conversationHistory,
    photoMetadata,
    behavioralTimeline,
    crossReferences,
    networkGraph,
    aiResponseDrafts,
  };

  // Compute SHA-256 checksum over the evidence body for tamper-evidence
  const checksumSHA256 = createHash('sha256')
    .update(JSON.stringify(evidenceBody))
    .digest('hex');

  const chainOfCustody = {
    createdBy: 'safeguard-sentinel-system',
    createdAt,
    checksumSHA256,
    s3ObjectLockRetainUntil: retainUntil.toISOString(),
  };

  return {
    ...evidenceBody,
    chainOfCustody,
  };
}
