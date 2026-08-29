import type { Signal } from '@safeguard-sentinel/shared';

/** Result from Rekognition label detection / moderation. */
export interface ModerationResult {
  labels: { name: string; confidence: number }[];
}

/** Result from Rekognition CompareFaces across accounts. */
export interface FaceComparisonResult {
  matchedAccounts: string[];
  similarity: number; // 0-1
}

/** Result from Rekognition Custom Labels for manipulation detection. */
export interface ManipulationResult {
  manipulationDetected: boolean;
  artifactType: string | null; // e.g. 'splicing', 'face_swap', 'generative_ai'
  confidence: number; // 0-1
}

/** Result from reverse image search against the scam database. */
export interface ReverseImageSearchResult {
  matched: boolean;
  matchedImageIds: string[];
  confidence: number; // 0-1
}

// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

/** Abstraction over Amazon Rekognition operations. */
export interface RekognitionClient {
  detectLabels(imageKey: string): Promise<ModerationResult>;
  compareFaces(imageKey: string): Promise<FaceComparisonResult>;
  detectCustomLabels(imageKey: string): Promise<ManipulationResult>;
}

/** Abstraction over the S3-indexed scam image database. */
export interface ScamDatabaseClient {
  reverseImageSearch(imageKey: string): Promise<ReverseImageSearchResult>;
}

/** Abstraction over EventBridge for publishing analyzer output. */
export interface EventBridgeClient {
  publish(event: Record<string, unknown>): Promise<void>;
}

/** Dependencies injected into the visual analyzer handler. */
export interface VisualAnalyzerDeps {
  rekognition: RekognitionClient;
  scamDatabase: ScamDatabaseClient;
  eventBridge: EventBridgeClient;
}
