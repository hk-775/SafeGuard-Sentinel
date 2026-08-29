import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getEdgeStyle } from './edge-styles';

const EDGE_LABELS = [
  'USES_PHOTO',
  'SHARES_WALLET',
  'SENDS_TEMPLATE',
  'CORRELATED_WITH',
  'SAME_DEVICE',
] as const;

// Feature: safeguard-dashboard, Property 9: Graph edge type styling is unique per edge label
// **Validates: Requirements 6.4**
describe('getEdgeStyle property tests', () => {
  it('should return unique styles for every pair of distinct edge labels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: EDGE_LABELS.length - 1 }),
        fc.integer({ min: 0, max: EDGE_LABELS.length - 1 }),
        (i, j) => {
          fc.pre(i !== j);
          const styleA = getEdgeStyle(EDGE_LABELS[i]);
          const styleB = getEdgeStyle(EDGE_LABELS[j]);
          const isDifferent =
            styleA.color !== styleB.color || styleA.lineStyle !== styleB.lineStyle;
          expect(isDifferent).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return a valid EdgeStyle for all known labels', () => {
    fc.assert(
      fc.property(fc.constantFrom(...EDGE_LABELS), (label) => {
        const style = getEdgeStyle(label);
        expect(style).toHaveProperty('color');
        expect(style).toHaveProperty('lineStyle');
        expect(['solid', 'dashed', 'dotted']).toContain(style.lineStyle);
        expect(style.color).toMatch(/^#[0-9a-f]{6}$/);
      }),
      { numRuns: 100 }
    );
  });
});
