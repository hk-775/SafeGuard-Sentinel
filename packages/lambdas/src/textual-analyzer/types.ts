/** Result from Comprehend sentiment and entity analysis. */
export interface ComprehendAnalysisResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  sentimentScore: number; // 0-1 dominant sentiment confidence
  entities: { type: string; text: string; score: number }[];
}

/** Result from Comprehend custom classifier for coercion detection. */
export interface CoercionClassificationResult {
  coercionDetected: boolean;
  patterns: ('pressure' | 'isolation' | 'urgency')[];
  confidence: number; // 0-1
}

/** Result from Bedrock embedding similarity comparison. */
export interface EmbeddingSimilarityResult {
  similarity: number; // 0-1
  matchedScriptId: string | null;
}

/** Result from message history lookup for templated messaging detection. */
export interface MessageHistoryEntry {
  recipientId: string;
  contentHash: string;
  timestamp: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

/** Abstraction over Amazon Comprehend operations. */
export interface ComprehendClient {
  analyzeSentimentAndEntities(text: string): Promise<ComprehendAnalysisResult>;
  classifyCoercion(text: string): Promise<CoercionClassificationResult>;
}

/** Abstraction over the DynamoDB scam script repository + Bedrock embeddings. */
export interface ScamScriptRepository {
  findSimilar(text: string): Promise<EmbeddingSimilarityResult>;
}

/** Abstraction over Amazon Bedrock for embedding operations. */
export interface BedrockClient {
  computeEmbedding(text: string): Promise<number[]>;
}

/** Abstraction over message history storage for templated messaging detection. */
export interface MessageHistoryClient {
  getRecentMessagesByUser(userId: string): Promise<MessageHistoryEntry[]>;
  storeMessage(userId: string, recipientId: string, contentHash: string, timestamp: string): Promise<void>;
}

/** Abstraction over EventBridge for publishing analyzer output. */
export interface EventBridgeClient {
  publish(event: Record<string, unknown>): Promise<void>;
}

/** Dependencies injected into the textual analyzer handler. */
export interface TextualAnalyzerDeps {
  comprehend: ComprehendClient;
  scamScriptRepo: ScamScriptRepository;
  messageHistory: MessageHistoryClient;
  eventBridge: EventBridgeClient;
}
