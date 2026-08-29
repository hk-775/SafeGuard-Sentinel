// Feature: safeguard-sentinel, Property 22: User Notification Content Constraints
// Feature: safeguard-sentinel, Property 23: No Permanent Bans via Autonomous Intervention

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InterventionType } from '@safeguard-sentinel/shared';
import { buildNotificationMessage, isNotificationSafe } from './notify-user';
import { selectInterventionLevel } from './handler';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any valid InterventionType value. */
const arbInterventionType = fc.constantFrom(...Object.values(InterventionType));

/** Random reason category string. */
const arbReasonCategory = fc.string({ minLength: 1, maxLength: 100 });

/** Composite score in [0, 100]. */
const arbScore = fc.float({ min: 0, max: 100, noNaN: true });

/** Correlated account count in [0, 10]. */
const arbAccountCount = fc.integer({ min: 0, max: 10 });

// ---------------------------------------------------------------------------
// Property 22: User Notification Content Constraints
// ---------------------------------------------------------------------------

describe('Property 22: User Notification Content Constraints', () => {
  // **Validates: Requirements 19.1, 19.2, 19.3**

  it('notification contains action description for every intervention type', () => {
    fc.assert(
      fc.property(arbInterventionType, arbReasonCategory, (type, reason) => {
        const message = buildNotificationMessage(type, reason);
        // The message must be non-empty (contains an action description)
        expect(message.length).toBeGreaterThan(0);
        // Must not be just whitespace
        expect(message.trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('notification contains reason category', () => {
    fc.assert(
      fc.property(arbInterventionType, arbReasonCategory, (type, reason) => {
        const message = buildNotificationMessage(type, reason);
        expect(message).toContain(reason);
      }),
      { numRuns: 100 },
    );
  });

  it('notification contains appeal instructions', () => {
    fc.assert(
      fc.property(arbInterventionType, arbReasonCategory, (type, reason) => {
        const message = buildNotificationMessage(type, reason);
        expect(message.toLowerCase()).toContain('appeal');
      }),
      { numRuns: 100 },
    );
  });

  it('isNotificationSafe returns true for all generated notifications', () => {
    fc.assert(
      fc.property(arbInterventionType, arbReasonCategory, (type, reason) => {
        const message = buildNotificationMessage(type, reason);
        expect(isNotificationSafe(message)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('notification does NOT contain detection methods, signal weights, or confidence scores', () => {
    fc.assert(
      fc.property(arbInterventionType, arbReasonCategory, (type, reason) => {
        const message = buildNotificationMessage(type, reason);
        const lower = message.toLowerCase();
        expect(lower).not.toContain('confidence score');
        expect(lower).not.toContain('composite score');
        expect(lower).not.toContain('signal weight');
        expect(lower).not.toContain('detection method');
        expect(lower).not.toContain('threat score');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: No Permanent Bans via Autonomous Intervention
// ---------------------------------------------------------------------------

describe('Property 23: No Permanent Bans via Autonomous Intervention', () => {
  // **Validates: Requirements 20.4**

  it('no InterventionType value represents a permanent ban', () => {
    fc.assert(
      fc.property(arbInterventionType, (type) => {
        expect(type).not.toBe('permanent_ban');
        expect(type).not.toContain('permanent');
      }),
      { numRuns: 100 },
    );
  });

  it('selectInterventionLevel never returns a permanent ban for any score and account count', () => {
    fc.assert(
      fc.property(arbScore, arbAccountCount, (score, accounts) => {
        const level = selectInterventionLevel(score, accounts);
        // InterventionLevel enum values are 0-4 (None, SafetyPrompt, Friction, InteractionRestriction, NetworkDisruption)
        // None of these represent a permanent ban
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(4);
        // Verify the level maps to a known non-permanent-ban type
        const validLevels = [0, 1, 2, 3, 4];
        expect(validLevels).toContain(level);
      }),
      { numRuns: 100 },
    );
  });
});
