import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatThreatCard } from './ThreatCard';
import { getColorCode } from '../utils/color-code';
import type { ActiveIntervention } from '../types';
import { InterventionLevel } from '../types';

// Feature: safeguard-dashboard, Property 6: ThreatCard renders all ActiveIntervention fields
// **Validates: Requirements 4.2**

const interventionLevelArb = fc.constantFrom(
  InterventionLevel.None,
  InterventionLevel.SafetyPrompt,
  InterventionLevel.Friction,
  InterventionLevel.InteractionRestriction,
  InterventionLevel.NetworkDisruption
);

const INTERVENTION_LEVEL_NAMES: Record<InterventionLevel, string> = {
  [InterventionLevel.None]: 'None',
  [InterventionLevel.SafetyPrompt]: 'SafetyPrompt',
  [InterventionLevel.Friction]: 'Friction',
  [InterventionLevel.InteractionRestriction]: 'Interaction Restriction',
  [InterventionLevel.NetworkDisruption]: 'NetworkDisruption',
};

const activeInterventionArb: fc.Arbitrary<ActiveIntervention> = fc.record({
  interventionId: fc.uuid(),
  threatType: fc.string({ minLength: 1, maxLength: 50 }),
  compositeScore: fc.integer({ min: 0, max: 100 }),
  interventionLevel: interventionLevelArb,
  status: fc.string({ minLength: 1, maxLength: 30 }),
});

describe('ThreatCard formatThreatCard property tests', () => {
  it('should include the interventionId from the input', () => {
    fc.assert(
      fc.property(activeInterventionArb, (intervention) => {
        const result = formatThreatCard(intervention);
        expect(result.interventionId).toBe(intervention.interventionId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include the threatType from the input', () => {
    fc.assert(
      fc.property(activeInterventionArb, (intervention) => {
        const result = formatThreatCard(intervention);
        expect(result.threatType).toBe(intervention.threatType);
      }),
      { numRuns: 100 }
    );
  });

  it('should include the compositeScore from the input', () => {
    fc.assert(
      fc.property(activeInterventionArb, (intervention) => {
        const result = formatThreatCard(intervention);
        expect(result.compositeScore).toBe(intervention.compositeScore);
      }),
      { numRuns: 100 }
    );
  });

  it('should apply correct color code to compositeScore via getColorCode', () => {
    fc.assert(
      fc.property(activeInterventionArb, (intervention) => {
        const result = formatThreatCard(intervention);
        expect(result.compositeScoreColorCode).toBe(getColorCode(intervention.compositeScore));
      }),
      { numRuns: 100 }
    );
  });

  it('should include the intervention level name', () => {
    fc.assert(
      fc.property(activeInterventionArb, (intervention) => {
        const result = formatThreatCard(intervention);
        expect(result.interventionLevelName).toBe(
          INTERVENTION_LEVEL_NAMES[intervention.interventionLevel]
        );
      }),
      { numRuns: 100 }
    );
  });

  it('should include the status from the input', () => {
    fc.assert(
      fc.property(activeInterventionArb, (intervention) => {
        const result = formatThreatCard(intervention);
        expect(result.status).toBe(intervention.status);
      }),
      { numRuns: 100 }
    );
  });
});
