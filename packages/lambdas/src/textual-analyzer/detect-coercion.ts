import type { ComprehendClient, CoercionClassificationResult } from './types';

/** Result of coercion detection. */
export interface CoercionDetectionResult {
  coercionDetected: boolean;
  patterns: ('pressure' | 'isolation' | 'urgency')[];
  confidence: number; // 0-1
}

/**
 * Uses Comprehend custom classifier to detect coercive language patterns:
 * - Pressure tactics (e.g., "you must do this now")
 * - Isolation language (e.g., "don't tell anyone")
 * - Urgency manipulation (e.g., "this offer expires today")
 *
 * On error returns a safe no-detection result so transient failures
 * do not block the rest of the analysis pipeline.
 */
export async function detectCoercion(
  messageContent: string,
  comprehend: ComprehendClient,
): Promise<CoercionDetectionResult> {
  try {
    const result: CoercionClassificationResult = await comprehend.classifyCoercion(messageContent);

    return {
      coercionDetected: result.coercionDetected,
      patterns: result.patterns,
      confidence: result.confidence,
    };
  } catch {
    return { coercionDetected: false, patterns: [], confidence: 0 };
  }
}
