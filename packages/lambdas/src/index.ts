// @safeguard-sentinel/lambdas
// Lambda function implementations for SafeGuard Sentinel
export * from './ingestion/handler';
export * from './visual-analyzer/handler';
export * from './textual-analyzer/handler';
export * from './behavioral-analyzer/handler';

// Re-export types with explicit names to avoid EventBridgeClient collision
export type {
  RekognitionClient,
  ScamDatabaseClient,
  EventBridgeClient as VisualEventBridgeClient,
  VisualAnalyzerDeps,
  ModerationResult,
  FaceComparisonResult,
  ManipulationResult,
  ReverseImageSearchResult,
} from './visual-analyzer/types';

export type {
  ComprehendClient,
  ScamScriptRepository,
  BedrockClient,
  MessageHistoryClient,
  EventBridgeClient as TextualEventBridgeClient,
  TextualAnalyzerDeps,
  ComprehendAnalysisResult,
  CoercionClassificationResult,
  EmbeddingSimilarityResult,
  MessageHistoryEntry,
} from './textual-analyzer/types';

export type {
  SessionStore,
  NeptuneClient,
  EventBridgeClient as BehavioralEventBridgeClient,
  BehavioralAnalyzerDeps,
  InteractionRecord,
  VelocityWindow,
  ConnectionRecord,
  ClusterResult,
} from './behavioral-analyzer/types';

export * from './temporal-analyzer/handler';

export type {
  TimezoneService,
  EscalationTracker,
  ActivityPatternService,
  EventBridgeClient as TemporalEventBridgeClient,
  TemporalAnalyzerDeps,
} from './temporal-analyzer/types';

export * from './threat-fusion/handler';
export { computeCompositeScore, DEFAULT_WEIGHTS } from './threat-fusion/compute-composite-score';
export { markDegraded } from './threat-fusion/mark-degraded';
export { emitThreatEvent } from './threat-fusion/emit-threat-event';
export { queryNetworkGraph } from './threat-fusion/query-network-graph';

export type {
  SessionStateStore,
  NeptuneGraphClient,
  ThreatEventBridgeClient,
  ThreatFusionDeps,
  CompositeScoreInput,
  DegradedResult,
  NetworkQueryResult,
} from './threat-fusion/types';

export {
  addAccountVertex,
  addPhotoVertex,
  addWalletAddressVertex,
  addMessageTemplateVertex,
  addUsesPhotoEdge,
  addSharesWalletEdge,
  addSendsTemplateEdge,
  addCorrelatedWithEdge,
  addSameDeviceEdge,
  getAccountVertex,
  getEdgesForAccount,
  findCorrelatedCluster,
} from './scam-network/graph-access';

export type {
  ScamNetworkNeptuneClient,
  ScamNetworkDeps,
  AccountCluster,
} from './scam-network/types';

export { selectInterventionLevel, executeIntervention } from './intervention/handler';
export { injectSafetyPrompt, selectPromptCategory, getPromptMessage } from './intervention/inject-safety-prompt';
export { deployFriction, DEFAULT_FRICTION_DELAY_MS, FRICTION_NOTIFICATION_MESSAGE } from './intervention/deploy-friction';
export { suspendAccount } from './intervention/suspend-account';
export { disruptNetwork } from './intervention/disrupt-network';
export { notifyUser, buildNotificationMessage, isNotificationSafe } from './intervention/notify-user';

export type {
  ThreatEvent,
  InterventionResult,
  SafetyPromptService,
  FrictionService,
  AccountSuspensionService,
  NetworkDisruptionService,
  NotificationService,
  EvidenceService,
  EscalationQueueService,
  AuditLogService,
  InterventionDeps,
} from './intervention/types';

export type { WebSocketClient, InjectSafetyPromptDeps } from './intervention/inject-safety-prompt';
export type { MessageDelayClient, UserNotificationClient, DeployFrictionDeps } from './intervention/deploy-friction';
export type { InteractionRestrictionClient, EvidenceClient, EscalationQueueClient, SuspendAccountDeps } from './intervention/suspend-account';
export type { AccountDisableClient, NetworkEvidenceClient, NetworkEscalationClient, NetworkGraphSnapshot, DisruptNetworkDeps } from './intervention/disrupt-network';
export type { SNSNotificationClient, NotifyUserDeps } from './intervention/notify-user';

export { shouldEscalate, routeToEscalation } from './escalation/routing';

export type {
  EscalationCase,
  ConfidenceBreakdown,
  EscalationPayload,
  EscalationDecision,
  EscalationQueueClient as EscalationRoutingQueueClient,
  EscalationDeps,
} from './escalation/types';

export { assembleEvidencePackage } from './evidence/assemble-evidence';
export { storeEvidence } from './evidence/store-evidence';
export { transferEvidence, TRANSFER_URL_EXPIRY_SECONDS } from './evidence/transfer-evidence';
export { configureArchivalLifecycle, GLACIER_TRANSITION_DAYS } from './evidence/archival-lifecycle';

export type {
  ConversationHistoryClient,
  PhotoMetadataClient,
  BehavioralTimelineClient,
  CrossReferenceClient,
  NetworkGraphClient,
  AIResponseDraftClient,
  ThreatScoreClient,
  AssembleEvidenceDeps,
  S3EvidenceClient,
  StoreEvidenceDeps,
  S3PresignClient,
  AccessLogClient,
  TransferEvidenceDeps,
  LifecycleRule,
  S3LifecycleClient,
  ArchivalLifecycleDeps,
} from './evidence/types';

export { logIntervention } from './audit/log-intervention';
export { searchAuditLogs } from './audit/search-audit-logs';

export type {
  OpenSearchClient,
  AuditLogEntry,
  LogInterventionDeps,
  OpenSearchSearchClient,
  AuditSearchFilters,
  SearchAuditLogsDeps,
} from './audit/types';

export { handleRapidResponse } from './rapid-response/rapid-response';

export type {
  EvidenceAssemblyClient,
  VictimIdentificationClient,
  SafetyOutreachClient,
  SpecialistRoutingClient,
  IncidentReport,
  RapidResponseResult,
  RapidResponseDeps,
} from './rapid-response/types';

export { activateSession } from './safety-session/activate-session';
export { sendCheckIn, processCheckInResponse, escalateToEmergencyContacts } from './safety-session/check-in';

export type {
  ContactHistoryClient,
  LocationVerificationClient,
  SafetySessionStore,
  ActivateSessionRequest,
  ActivateSessionResult,
  ActivateSessionDeps,
  CheckInPromptClient,
  EmergencyNotificationClient,
  CheckInDeps,
} from './safety-session/types';

export { submitAppeal } from './appeal/submit-appeal';
export { resolveAppeal } from './appeal/resolve-appeal';

export type {
  AppealStore,
  AppealEscalationClient,
  SubmitAppealRequest,
  SubmitAppealResult,
  ResolveAppealRequest,
  SubmitAppealDeps,
  ResolveAppealDeps,
} from './appeal/types';

export { connectDashboard, disconnectDashboard, streamMetrics } from './dashboard/connect';
export { getAggregateMetrics, getActiveInterventions, getColorCode } from './dashboard/metrics';

export type {
  WebSocketConnectionStore,
  WebSocketApiClient,
  MetricsStore,
  AggregateMetrics,
  ActiveIntervention,
  DashboardEvent,
  DashboardColorCode,
  StreamMetricsDeps,
  GetMetricsDeps,
} from './dashboard/types';

export { getEventBridgeRules, getKinesisEventSources } from './infrastructure/event-wiring';
export { getDynamoDBTableConfigs } from './infrastructure/dynamodb-config';
export { getS3BucketConfig } from './infrastructure/s3-config';
export { getMonitoringConfig } from './infrastructure/monitoring-config';

export type {
  EventBridgeRuleConfig,
  KinesisEventSourceConfig,
  DynamoDBTableConfig,
  S3BucketConfig,
  MonitoringConfig,
} from './infrastructure/types';
