import type { GraphVertex, GraphEdge } from '../types';

export interface FormattedNodeDetail {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  connectedEdges: GraphEdge[];
}

/**
 * Pure function that formats a vertex and its connected edges for display
 * in the node detail panel.
 */
export function formatNodeDetail(
  vertex: GraphVertex,
  edges: GraphEdge[]
): FormattedNodeDetail {
  const connectedEdges = edges.filter(
    (edge) => edge.source === vertex.id || edge.target === vertex.id
  );

  return {
    id: vertex.id,
    type: vertex.type,
    properties: vertex.properties,
    connectedEdges,
  };
}
