import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { reduceThreatList, type ThreatListState } from './ThreatList';
import type { DashboardEvent, ActiveIntervention } from '../types';
import { InterventionLevel } from '../types';

// Feature: safeguard-dashboard, Property 7: Threat list updates correctly on real-time events
// **Validates: Requirements 4.4, 4.5**

const interventionLevelArb = fc.constantFrom(
  InterventionLevel.None,
  InterventionLevel.SafetyPrompt,
  InterventionLevel.Friction,
  InterventionLevel.InteractionRestriction,
  InterventionLevel.NetworkDisruption
);

const threatEventArb: fc.Arbitrary<DashboardEvent> = fc.record({
  type: fc.constant('threat' as const),
  payload: fc.record({
    interventionId: fc.uuid(),
    threatType: fc.string({ minLength: 1, maxLength: 30 }),
    compositeScore: fc.integer({ min: 0, max: 100 }),
    interventionLevel: interventionLevelArb,
    status: fc.constantFrom('active', 'pending', 'escalated'),
  }) as fc.Arbitrary<Record<string, unknown>>,
  timestamp: fc.date().map((d) => d.toISOString()),
});

const resolutionEventArb = (interventionId: string): fc.Arbitrary<DashboardEvent> =>
  fc.record({
    type: fc.constant('resolution' as const),
    payload: fc.constant({
      interventionId,
      status: 'resolved',
    }) as fc.Arbitrary<Record<string, unknown>>,
    timestamp: fc.date().map((d) => d.toISOString()),
  });

const metricEventArb: fc.Arbitrary<DashboardEvent> = fc.record({
  type: fc.constant('metric' as const),
  payload: fc.record({
    threatsNeutralized: fc.nat(),
  }) as fc.Arbitrary<Record<string, unknown>>,
  timestamp: fc.date().map((d) => d.toISOString()),
});

describe('ThreatList reduceThreatList property tests', () => {
  it('should add new threats from threat events', () => {
    fc.assert(
      fc.property(threatEventArb, (event) => {
        const initialState: ThreatListState = { interventions: [] };
        const newState = reduceThreatList(initialState, event);
        const payload = event.payload as Record<string, unknown>;
        const id = payload.interventionId as string;

        expect(newState.interventions).toHaveLength(1);
        expect(newState.interventions[0].interventionId).toBe(id);
      }),
      { numRuns: 100 }
    );
  });

  it('should update existing threats when threat event has same interventionId', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (id, score1, score2) => {
          const initial: ThreatListState = {
            interventions: [
              {
                interventionId: id,
                threatType: 'scam',
                compositeScore: score1,
                interventionLevel: InterventionLevel.None,
                status: 'active',
              },
            ],
          };

          const updateEvent: DashboardEvent = {
            type: 'threat',
            payload: {
              interventionId: id,
              threatType: 'updated_scam',
              compositeScore: score2,
              interventionLevel: InterventionLevel.Friction,
              status: 'escalated',
            },
            timestamp: new Date().toISOString(),
          };

          const newState = reduceThreatList(initial, updateEvent);
          expect(newState.interventions).toHaveLength(1);
          expect(newState.interventions[0].compositeScore).toBe(score2);
          expect(newState.interventions[0].threatType).toBe('updated_scam');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update status on resolution events', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const initial: ThreatListState = {
          interventions: [
            {
              interventionId: id,
              threatType: 'scam',
              compositeScore: 75,
              interventionLevel: InterventionLevel.Friction,
              status: 'active',
            },
          ],
        };

        const resEvent: DashboardEvent = {
          type: 'resolution',
          payload: { interventionId: id, status: 'resolved' },
          timestamp: new Date().toISOString(),
        };

        const newState = reduceThreatList(initial, resEvent);
        expect(newState.interventions).toHaveLength(1);
        expect(newState.interventions[0].status).toBe('resolved');
      }),
      { numRuns: 100 }
    );
  });

  it('should not modify state on metric events', () => {
    fc.assert(
      fc.property(metricEventArb, (event) => {
        const initial: ThreatListState = {
          interventions: [
            {
              interventionId: 'test-id',
              threatType: 'scam',
              compositeScore: 50,
              interventionLevel: InterventionLevel.None,
              status: 'active',
            },
          ],
        };

        const newState = reduceThreatList(initial, event);
        expect(newState).toBe(initial);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle a sequence of threat and resolution events correctly', () => {
    fc.assert(
      fc.property(
        fc.array(threatEventArb, { minLength: 1, maxLength: 10 }),
        (events) => {
          let state: ThreatListState = { interventions: [] };

          // Apply all threat events
          for (const event of events) {
            state = reduceThreatList(state, event);
          }

          // Collect unique intervention IDs from events
          const uniqueIds = new Set(
            events.map((e) => (e.payload as Record<string, unknown>).interventionId as string)
          );

          // State should have exactly as many interventions as unique IDs
          expect(state.interventions).toHaveLength(uniqueIds.size);

          // Now resolve the first one
          if (state.interventions.length > 0) {
            const firstId = state.interventions[0].interventionId;
            const resEvent: DashboardEvent = {
              type: 'resolution',
              payload: { interventionId: firstId, status: 'resolved' },
              timestamp: new Date().toISOString(),
            };
            state = reduceThreatList(state, resEvent);
            expect(state.interventions.find((i) => i.interventionId === firstId)?.status).toBe(
              'resolved'
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
