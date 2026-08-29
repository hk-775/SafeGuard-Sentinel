import type { EdgeStyle } from '../types';

const EDGE_STYLE_MAP: Record<string, EdgeStyle> = {
  USES_PHOTO: { color: '#e74c3c', lineStyle: 'solid' },
  SHARES_WALLET: { color: '#f39c12', lineStyle: 'dashed' },
  SENDS_TEMPLATE: { color: '#3498db', lineStyle: 'dotted' },
  CORRELATED_WITH: { color: '#2ecc71', lineStyle: 'solid' },
  SAME_DEVICE: { color: '#9b59b6', lineStyle: 'dashed' },
};

export function getEdgeStyle(label: string): EdgeStyle {
  return EDGE_STYLE_MAP[label] ?? { color: '#95a5a6', lineStyle: 'solid' };
}
