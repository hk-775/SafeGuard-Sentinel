import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { parseAndDispatch } from './websocket-manager';
import type { DashboardEvent } from '../types';

// Feature: safeguard-dashboard, Property 5: DashboardEvent dispatch routes events to correct handlers
// **Validates: Requirements 2.2, 3.2**

const dashboardEventArb = fc.record({
  type: fc.constantFrom('threat' as const, 'intervention' as const, 'resolution' as const, 'metric' as const),
  payload: fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.jsonValue()),
  timestamp: fc.date().map((d) => d.toISOString()),
});

describe('DashboardEvent dispatch property tests', () => {
  it('should invoke the handler with the correct event type and payload for any valid DashboardEvent', () => {
    fc.assert(
      fc.property(dashboardEventArb, (event) => {
        const handler = vi.fn();
        const handlers = new Set<(e: DashboardEvent) => void>([handler]);

        const rawMessage = JSON.stringify(event);
        const expected = JSON.parse(rawMessage) as DashboardEvent;
        const dispatched = parseAndDispatch(rawMessage, handlers);

        expect(dispatched).toBe(true);
        expect(handler).toHaveBeenCalledOnce();

        const received = handler.mock.calls[0][0] as DashboardEvent;
        expect(received).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('should silently drop messages with invalid event types', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !['threat', 'intervention', 'resolution', 'metric'].includes(s)),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.jsonValue()),
        fc.date().map((d) => d.toISOString()),
        (type, payload, timestamp) => {
          const handler = vi.fn();
          const handlers = new Set<(e: DashboardEvent) => void>([handler]);

          const rawMessage = JSON.stringify({ type, payload, timestamp });
          const dispatched = parseAndDispatch(rawMessage, handlers);

          expect(dispatched).toBe(false);
          expect(handler).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should silently drop invalid JSON messages', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try { JSON.parse(s); return false; } catch { return true; }
        }),
        (invalidJson) => {
          const handler = vi.fn();
          const handlers = new Set<(e: DashboardEvent) => void>([handler]);

          const dispatched = parseAndDispatch(invalidJson, handlers);

          expect(dispatched).toBe(false);
          expect(handler).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
