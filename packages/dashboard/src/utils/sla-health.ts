import type { SlaHealthIndicator } from '../types';

export function getSlaHealthIndicator(avgResponseTimeMs: number): SlaHealthIndicator {
  return avgResponseTimeMs < 60000 ? 'green' : 'red';
}
