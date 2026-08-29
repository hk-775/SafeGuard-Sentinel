// Feature: safeguard-sentinel, Property 5: Safety Prompt Content Relevance

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ThreatCategory } from '@safeguard-sentinel/shared';
import { selectPromptCategory, getPromptMessage } from './inject-safety-prompt';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any valid ThreatCategory value. */
const arbThreatCategory = fc.constantFrom(...Object.values(ThreatCategory));

// ---------------------------------------------------------------------------
// Property 5: Safety Prompt Content Relevance
// ---------------------------------------------------------------------------

describe('Property 5: Safety Prompt Content Relevance', () => {
  // **Validates: Requirements 6.2**

  it('selected prompt category matches the dominant threat signal category', () => {
    fc.assert(
      fc.property(arbThreatCategory, (category) => {
        // When the threat signal is a known ThreatCategory, the selected
        // prompt category must match that category exactly.
        const selected = selectPromptCategory([category]);
        expect(selected).toBe(category);
      }),
      { numRuns: 100 },
    );
  });

  it('prompt message is non-empty for every threat category', () => {
    fc.assert(
      fc.property(arbThreatCategory, (category) => {
        const message = getPromptMessage(category);
        expect(message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('dominant signal is selected even when preceded by unknown signals', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
        arbThreatCategory,
        (unknowns, category) => {
          // Filter out any accidental real categories from the unknowns
          const safeUnknowns = unknowns.filter(
            (s) => !Object.values(ThreatCategory).includes(s as ThreatCategory),
          );
          const signals = [...safeUnknowns, category];
          const selected = selectPromptCategory(signals);
          expect(selected).toBe(category);
        },
      ),
      { numRuns: 100 },
    );
  });
});
