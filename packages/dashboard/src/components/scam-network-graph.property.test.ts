import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { prepareGraphData } from './ScamNetworkGraphView';
import type { GraphVertex, GraphEdge } from '../types';

// Feature: safeguard-dashboard, Property 10: Graph rendering produces correct node and edge counts
// **Validates: Requirements 6.1, 9.4**

const graphVertexArb: fc.Arbitrary<GraphVertex> = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('account', 'photo', 'wallet', 'template'),
  properties: fc.constant({} as Record<string, unknown>),
});

const edgeLabelArb = fc.constantFrom(
  'USES_PHOTO',
  'SHARES_WALLET',
  'SENDS_TEMPLATE',
  'CORRELATED_WITH',
  'SAME_DEVICE'
);

const graphEdgeArb: fc.Arbitrary<GraphEdge> = fc.record({
  source: fc.uuid(),
  target: fc.uuid(),
  label: edgeLabelArb,
  properties: fc.constant({} as Record<string, unknown>),
});

describe('ScamNetworkGraphView prepareGraphData property tests', () => {
  it('should produce exactly as many nodes as input vertices', () => {
    fc.assert(
      fc.property(
        fc.array(graphVertexArb, { minLength: 0, maxLength: 50 }),
        fc.array(graphEdgeArb, { minLength: 0, maxLength: 50 }),
        (vertices, edges) => {
          const result = prepareGraphData(vertices, edges);
          expect(result.nodes).toHaveLength(vertices.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce exactly as many connections as input edges', () => {
    fc.assert(
      fc.property(
        fc.array(graphVertexArb, { minLength: 0, maxLength: 50 }),
        fc.array(graphEdgeArb, { minLength: 0, maxLength: 50 }),
        (vertices, edges) => {
          const result = prepareGraphData(vertices, edges);
          expect(result.connections).toHaveLength(edges.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply edge styles to all connections', () => {
    fc.assert(
      fc.property(
        fc.array(graphVertexArb, { minLength: 0, maxLength: 20 }),
        fc.array(graphEdgeArb, { minLength: 1, maxLength: 20 }),
        (vertices, edges) => {
          const result = prepareGraphData(vertices, edges);
          for (const conn of result.connections) {
            expect(conn.style).toBeDefined();
            expect(conn.style.color).toBeDefined();
            expect(conn.style.lineStyle).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
