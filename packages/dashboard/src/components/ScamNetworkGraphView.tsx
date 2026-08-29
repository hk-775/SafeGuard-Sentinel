import type { GraphVertex, GraphEdge, EdgeStyle } from '../types';
import { getEdgeStyle } from '../utils/edge-styles';

export interface StyledGraphEdge extends GraphEdge {
  style: EdgeStyle;
}

export interface PreparedGraphData {
  nodes: GraphVertex[];
  connections: StyledGraphEdge[];
}

/**
 * Pure function that takes vertices and edges arrays and returns prepared graph data
 * with edge styles applied via getEdgeStyle.
 */
export function prepareGraphData(
  vertices: GraphVertex[],
  edges: GraphEdge[]
): PreparedGraphData {
  return {
    nodes: vertices,
    connections: edges.map((edge) => ({
      ...edge,
      style: getEdgeStyle(edge.label),
    })),
  };
}
