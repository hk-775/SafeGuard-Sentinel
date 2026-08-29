import { EventType } from './enums';
import { CONTENT_RETENTION_DAYS, AUDIT_RETENTION_MONTHS } from './constants';
import type { SignalEvent, CompositeThreatScoreRecord } from './types';

/**
 * Validates that a score is within the [0, 100] range.
 */
export function validateScore(score: number): boolean {
  return typeof score === 'number' && !Number.isNaN(score) && score >= 0 && score <= 100;
}

/**
 * Validates that a confidence value is within the [0, 1] range.
 */
export function validateConfidence(confidence: number): boolean {
  return typeof confidence === 'number' && !Number.isNaN(confidence) && confidence >= 0 && confidence <= 1;
}

/**
 * Computes a TTL as epoch seconds: createdAt + retentionDays.
 */
export function computeTTL(createdAt: string | Date, retentionDays: number): number {
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const ms = date.getTime() + retentionDays * 24 * 60 * 60 * 1000;
  return Math.floor(ms / 1000);
}

/**
 * Computes TTL for analyzed content using the 30-day retention period.
 */
export function computeContentTTL(createdAt: string | Date): number {
  return computeTTL(createdAt, CONTENT_RETENTION_DAYS);
}

/**
 * Computes TTL for audit/intervention logs using the 12-month retention period.
 * Converts AUDIT_RETENTION_MONTHS to approximate days (months × 30).
 */
export function computeAuditTTL(createdAt: string | Date): number {
  return computeTTL(createdAt, AUDIT_RETENTION_MONTHS * 30);
}

const EVENT_TYPES = new Set<string>(Object.values(EventType));

/**
 * Type guard that validates an unknown value is a well-formed SignalEvent.
 */
export function validateSignalEvent(event: unknown): event is SignalEvent {
  if (event === null || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;

  return (
    typeof e.eventId === 'string' &&
    typeof e.eventType === 'string' &&
    EVENT_TYPES.has(e.eventType) &&
    typeof e.sessionId === 'string' &&
    typeof e.userId === 'string' &&
    typeof e.timestamp === 'string' &&
    typeof e.geoRegion === 'string' &&
    typeof e.deviceFingerprint === 'string' &&
    e.payload !== null &&
    typeof e.payload === 'object'
  );
}

/**
 * Type guard that validates an unknown value is a well-formed CompositeThreatScoreRecord.
 */
export function validateCompositeThreatScoreRecord(
  record: unknown,
): record is CompositeThreatScoreRecord {
  if (record === null || typeof record !== 'object') return false;
  const r = record as Record<string, unknown>;

  if (
    typeof r.sessionId !== 'string' ||
    typeof r.userId !== 'string' ||
    typeof r.degraded !== 'boolean' ||
    typeof r.lastUpdated !== 'string' ||
    typeof r.ttl !== 'number'
  ) {
    return false;
  }

  // Validate score fields
  const scoreFields = [
    'compositeScore',
    'visualScore',
    'textualScore',
    'behavioralScore',
    'temporalScore',
  ] as const;
  for (const field of scoreFields) {
    if (!validateScore(r[field] as number)) return false;
  }

  // Validate activeInterventionLevel is 0–4
  if (
    typeof r.activeInterventionLevel !== 'number' ||
    !Number.isInteger(r.activeInterventionLevel) ||
    r.activeInterventionLevel < 0 ||
    r.activeInterventionLevel > 4
  ) {
    return false;
  }

  // Validate weights object
  if (r.weights === null || typeof r.weights !== 'object') return false;
  const w = r.weights as Record<string, unknown>;
  for (const key of ['visual', 'textual', 'behavioral', 'temporal']) {
    if (typeof w[key] !== 'number') return false;
  }

  // Validate degradedAnalyzers is an array of strings
  if (!Array.isArray(r.degradedAnalyzers)) return false;
  for (const a of r.degradedAnalyzers) {
    if (typeof a !== 'string') return false;
  }

  return true;
}
