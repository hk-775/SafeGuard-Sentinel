import type { RekognitionClient, ManipulationResult } from './types';

/**
 * Detects photo manipulation artifacts (splicing, face-swap, generative AI
 * signatures) by delegating to Rekognition Custom Labels.
 *
 * Contract: when `manipulationDetected` is true the caller (computeVisualRiskScore)
 * will produce a visual risk score > 0 proportional to the confidence value.
 *
 * On any error the function returns a safe no-manipulation result so that a
 * transient Rekognition failure does not block the rest of the analysis pipeline.
 */
export async function detectManipulation(
  imageKey: string,
  rekognition: RekognitionClient,
): Promise<ManipulationResult> {
  try {
    return await rekognition.detectCustomLabels(imageKey);
  } catch {
    return { manipulationDetected: false, artifactType: null, confidence: 0 };
  }
}
