/**
 * Intervention severity levels mapped to composite threat score thresholds.
 * Level 0 = no intervention, Level 4 = network disruption.
 */
export enum InterventionLevel {
  None = 0,
  SafetyPrompt = 1,
  Friction = 2,
  InteractionRestriction = 3,
  NetworkDisruption = 4,
}

/** The type of intervention action executed. */
export enum InterventionType {
  SafetyPrompt = 'safety_prompt',
  Friction = 'friction',
  InteractionRestriction = 'interaction_restriction',
  NetworkDisruption = 'network_disruption',
}

/** Signal domains that feed into the Threat Fusion Engine. */
export enum SignalType {
  Visual = 'visual',
  Textual = 'textual',
  Behavioral = 'behavioral',
  Temporal = 'temporal',
}

/** Categories of detected threats. */
export enum ThreatCategory {
  RelationshipScam = 'relationship_scam',
  FinancialSolicitation = 'financial_solicitation',
  Coercion = 'coercion',
  TemplatedMessaging = 'templated_messaging',
  VelocityAnomaly = 'velocity_anomaly',
  ConnectionAnomaly = 'connection_anomaly',
  AccountClustering = 'account_clustering',
  PhotoManipulation = 'photo_manipulation',
  CrossAccountMatch = 'cross_account_match',
  RapidEscalation = 'rapid_escalation',
  TimezoneInconsistency = 'timezone_inconsistency',
  VulnerabilityWindow = 'vulnerability_window',
}

/** Appeal processing statuses. */
export enum AppealStatus {
  Submitted = 'submitted',
  Acknowledged = 'acknowledged',
  InReview = 'in_review',
  Resolved = 'resolved',
}

/** Resolution outcomes for appeals. */
export enum AppealResolution {
  Upheld = 'upheld',
  Reversed = 'reversed',
  Modified = 'modified',
}

/** Safety session statuses. */
export enum SafetySessionStatus {
  Active = 'active',
  Completed = 'completed',
  Escalated = 'escalated',
}

/** Signal event types from the platform. */
export enum EventType {
  PhotoUpload = 'photo_upload',
  MessageSent = 'message_sent',
  Interaction = 'interaction',
  Connection = 'connection',
  ProfileUpdate = 'profile_update',
}

/** Severity levels for individual signals. */
export enum SignalSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/** Intervention outcome statuses. */
export enum InterventionOutcome {
  Pending = 'pending',
  Resolved = 'resolved',
  Appealed = 'appealed',
  Reversed = 'reversed',
}

/** Check-in response types for safety sessions. */
export enum CheckInResponse {
  Ok = 'ok',
  Distress = 'distress',
}
