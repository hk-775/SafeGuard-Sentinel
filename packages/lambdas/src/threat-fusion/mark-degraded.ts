import type { AnalyzerOutputEvent } from '@safeguard-sentinel/shared';
import type { DegradedResult } from './types';

const ALL_ANALYZERS = ['visual', 'textual', 'behavioral', 'temporal'] as const;

/**
 * Determines which analyzers are unavailable and builds a degraded result.
 *
 * If any analyzer is missing from the provided outputs, the score is marked
 * as degraded and the missing analyzers are listed. Scoring continues with
 * whatever signals are available (Requirement 1.5).
 *
 * @param analyzerOutputs - The analyzer output events received so far.
 * @returns A DegradedResult with the degraded flag, list of unavailable
 *          analyzers, and a map of available scores.
 */
export function markDegraded(
  analyzerOutputs: AnalyzerOutputEvent[],
): DegradedResult {
  const receivedMap = new Map<string, number>();
  for (const output of analyzerOutputs) {
    receivedMap.set(output.analyzerId, output.score);
  }

  const degradedAnalyzers: string[] = [];
  const availableScores: Partial<Record<'visual' | 'textual' | 'behavioral' | 'temporal', number>> = {};

  for (const analyzer of ALL_ANALYZERS) {
    if (receivedMap.has(analyzer)) {
      availableScores[analyzer] = receivedMap.get(analyzer)!;
    } else {
      degradedAnalyzers.push(analyzer);
    }
  }

  return {
    degraded: degradedAnalyzers.length > 0,
    degradedAnalyzers,
    availableScores,
  };
}
