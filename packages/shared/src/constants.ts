/**
 * Composite threat score thresholds for each intervention level.
 * L1: [60, 75), L2: [75, 88), L3: [88, 94), L4: >= 94 (with 3+ correlated accounts)
 */
export const INTERVENTION_THRESHOLDS = {
  LEVEL_1: 60,
  LEVEL_2: 75,
  LEVEL_3: 88,
  LEVEL_4: 94,
} as const;

/** Messaging velocity anomaly: 47+ distinct recipients in a 10-minute window. */
export const VELOCITY_ANOMALY_THRESHOLD = 47;

/** Velocity anomaly sliding window in minutes. */
export const VELOCITY_WINDOW_MINUTES = 10;

/** Rapid escalation: connection-to-contact-request under 15 minutes. */
export const ESCALATION_WINDOW_MINUTES = 15;

/** Vulnerability window: 1 AM – 4 AM local time. */
export const VULNERABILITY_HOURS = {
  START: 1,
  END: 4,
} as const;

/** Analyzed content retention period in days. */
export const CONTENT_RETENTION_DAYS = 30;

/** Audit / intervention log retention period in months. */
export const AUDIT_RETENTION_MONTHS = 12;

/** Scam script semantic similarity threshold for high-confidence classification. */
export const SCAM_SCRIPT_SIMILARITY_THRESHOLD = 0.94;

/** Cross-account photo similarity threshold (90%). */
export const PHOTO_SIMILARITY_THRESHOLD = 0.9;

/** Minimum correlated accounts required for Level 4 network disruption. */
export const NETWORK_DISRUPTION_MIN_ACCOUNTS = 3;

/** Appeal acknowledgment SLA in minutes. */
export const APPEAL_ACK_SLA_MINUTES = 5;

/** Appeal resolution SLA in hours. */
export const APPEAL_RESOLUTION_SLA_HOURS = 24;

/** Evidence package assembly SLA in minutes. */
export const EVIDENCE_ASSEMBLY_SLA_MINUTES = 15;

/** Threat event emission SLA in seconds after score exceeds threshold. */
export const THREAT_EVENT_EMISSION_SLA_SECONDS = 5;

/** Intervention execution SLA in seconds after threat event. */
export const INTERVENTION_EXECUTION_SLA_SECONDS = 60;

/** Scoring cycle interval in seconds. */
export const SCORING_CYCLE_SECONDS = 30;

/** Missed consecutive check-ins before emergency escalation. */
export const SAFETY_SESSION_MISSED_CHECKINS_ESCALATION = 2;
