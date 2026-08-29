import type { SignalBreakdown } from '../types';

export interface SignalBreakdownEntry {
  domain: string;
  score: number;
}

/**
 * Pure function that formats a SignalBreakdown into an array of 4 domain entries
 * with name and score, suitable for rendering a radar or grouped bar chart.
 */
export function formatSignalBreakdown(breakdown: SignalBreakdown): SignalBreakdownEntry[] {
  return [
    { domain: 'visual', score: breakdown.visual },
    { domain: 'textual', score: breakdown.textual },
    { domain: 'behavioral', score: breakdown.behavioral },
    { domain: 'temporal', score: breakdown.temporal },
  ];
}
