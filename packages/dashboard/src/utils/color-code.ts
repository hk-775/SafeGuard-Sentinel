import type { DashboardColorCode } from '../types';

export function getColorCode(score: number): DashboardColorCode {
  if (score < 60) return 'green';
  if (score < 88) return 'amber';
  return 'red';
}
