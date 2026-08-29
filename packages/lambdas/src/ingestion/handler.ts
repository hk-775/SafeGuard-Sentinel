import * as crypto from 'crypto';
import {
  type SignalEvent,
  type EventType,
  validateSignalEvent,
} from '@safeguard-sentinel/shared';

/** Raw platform event before enrichment. */
export interface RawPlatformEvent {
  eventType: string;
  sessionId: string;
  userId: string;
  timestamp?: string;
  geoRegion?: string;
  deviceFingerprint?: string;
  payload?: Record<string, unknown>;
}

export interface IngestionResult {
  successful: SignalEvent[];
  failed: { index: number; reason: string }[];
}

/**
 * Enriches a raw platform event into a standardised SignalEvent envelope.
 * Returns `null` when the raw event cannot be enriched into a valid SignalEvent.
 */
export function enrichEvent(raw: RawPlatformEvent): SignalEvent | null {
  const enriched: SignalEvent = {
    eventId: crypto.randomUUID(),
    eventType: raw.eventType as EventType,
    sessionId: raw.sessionId,
    userId: raw.userId,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    geoRegion: raw.geoRegion ?? 'unknown',
    deviceFingerprint: raw.deviceFingerprint ?? 'unknown',
    payload: raw.payload ?? {},
  };

  if (!validateSignalEvent(enriched)) {
    return null;
  }

  return enriched;
}

/**
 * Lambda handler that accepts a batch of raw platform events,
 * enriches each into a SignalEvent, validates them, and returns
 * the results. Malformed events are skipped and logged — they
 * never fail the batch.
 */
export function handler(events: unknown[]): IngestionResult {
  const successful: SignalEvent[] = [];
  const failed: { index: number; reason: string }[] = [];

  for (let i = 0; i < events.length; i++) {
    try {
      const raw = events[i];

      if (raw === null || typeof raw !== 'object') {
        failed.push({ index: i, reason: 'Event is not an object' });
        continue;
      }

      const enriched = enrichEvent(raw as RawPlatformEvent);

      if (enriched === null) {
        failed.push({ index: i, reason: 'Event failed SignalEvent validation after enrichment' });
        continue;
      }

      successful.push(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ index: i, reason: `Unexpected error: ${message}` });
    }
  }

  return { successful, failed };
}
