import { PHOTO_SIMILARITY_THRESHOLD } from '@safeguard-sentinel/shared';
import type { RekognitionClient, FaceComparisonResult } from './types';

/**
 * Compares photo embeddings across accounts using Rekognition CompareFaces.
 *
 * Only returns matched accounts when similarity meets or exceeds the
 * PHOTO_SIMILARITY_THRESHOLD (90%). Below-threshold results are returned
 * as empty matches so the caller (computeVisualRiskScore) scores them at 0.
 *
 * On any error the function returns a safe empty result so that a transient
 * Rekognition failure does not block the rest of the analysis pipeline.
 */
export async function crossAccountMatch(
  imageKey: string,
  rekognition: RekognitionClient,
): Promise<FaceComparisonResult> {
  try {
    const result = await rekognition.compareFaces(imageKey);

    if (result.similarity >= PHOTO_SIMILARITY_THRESHOLD) {
      return result;
    }

    return { matchedAccounts: [], similarity: result.similarity };
  } catch {
    return { matchedAccounts: [], similarity: 0 };
  }
}
