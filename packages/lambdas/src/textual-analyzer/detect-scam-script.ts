import { SCAM_SCRIPT_SIMILARITY_THRESHOLD } from '@safeguard-sentinel/shared';
import type { ScamScriptRepository, EmbeddingSimilarityResult } from './types';

/** Result of scam script detection. */
export interface ScamScriptDetectionResult {
  isHighConfidenceScam: boolean;
  similarity: number; // 0-1
  matchedScriptId: string | null;
}

/**
 * Compares message content against known scam script repository (DynamoDB)
 * using Bedrock embeddings for semantic similarity.
 *
 * Classifies as high-confidence scam when similarity >= 94% threshold.
 *
 * On error returns a safe no-match result so transient failures
 * do not block the rest of the analysis pipeline.
 */
export async function detectScamScript(
  messageContent: string,
  scamScriptRepo: ScamScriptRepository,
): Promise<ScamScriptDetectionResult> {
  try {
    const result: EmbeddingSimilarityResult = await scamScriptRepo.findSimilar(messageContent);

    return {
      isHighConfidenceScam: result.similarity >= SCAM_SCRIPT_SIMILARITY_THRESHOLD,
      similarity: result.similarity,
      matchedScriptId: result.matchedScriptId,
    };
  } catch {
    return { isHighConfidenceScam: false, similarity: 0, matchedScriptId: null };
  }
}
