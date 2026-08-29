import { describe, it, expect, vi } from 'vitest';
import { InterventionLevel } from '@safeguard-sentinel/shared';
import { getAggregateMetrics, getActiveInterventions, getColorCode } from './metrics';
import type { AggregateMetrics, ActiveIntervention, GetMetricsDeps } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleMetrics: AggregateMetrics = {
  threatsNeutralized: 42,
  avgResponseTimeMs: 350,
  falsePositiveRate: 0.012,
  networksDisrupted: 3,
  photosAnalyzed: 10_000,
  messagesScanned: 50_000,
  behavioralSessions: 8_000,
  temporalEvaluations: 12_000,
  activeSafetySessions: 15,
};

const sampleInterventions: ActiveIntervention[] = [
  {
    interventionId: 'int-1',
    threatType: 'relationship_scam',
    compositeScore: 72,
    interventionLevel: InterventionLevel.SafetyPrompt,
    status: 'active',
  },
  {
    interventionId: 'int-2',
    threatType: 'financial_solicitation',
    compositeScore: 91,
    interventionLevel: InterventionLevel.InteractionRestriction,
    status: 'pending_review',
  },
];

function makeDeps(
  metrics: AggregateMetrics = sampleMetrics,
  interventions: ActiveIntervention[] = sampleInterventions,
): GetMetricsDeps {
  return {
    metricsStore: {
      getAggregateMetrics: vi.fn().mockResolvedValue(metrics),
      getActiveInterventions: vi.fn().mockResolvedValue(interventions),
    },
  };
}

// ---------------------------------------------------------------------------
// getAggregateMetrics
// ---------------------------------------------------------------------------

describe('getAggregateMetrics', () => {
  it('returns data from the metrics store', async () => {
    const deps = makeDeps();
    const result = await getAggregateMetrics(deps);

    expect(result).toEqual(sampleMetrics);
    expect(deps.metricsStore.getAggregateMetrics).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getActiveInterventions
// ---------------------------------------------------------------------------

describe('getActiveInterventions', () => {
  it('returns data from the metrics store', async () => {
    const deps = makeDeps();
    const result = await getActiveInterventions(deps);

    expect(result).toEqual(sampleInterventions);
    expect(deps.metricsStore.getActiveInterventions).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getColorCode
// ---------------------------------------------------------------------------

describe('getColorCode', () => {
  it('returns green for scores below 60', () => {
    expect(getColorCode(0)).toBe('green');
    expect(getColorCode(30)).toBe('green');
    expect(getColorCode(59)).toBe('green');
    expect(getColorCode(59.99)).toBe('green');
  });

  it('returns amber for scores from 60 to 87', () => {
    expect(getColorCode(60)).toBe('amber');
    expect(getColorCode(70)).toBe('amber');
    expect(getColorCode(87)).toBe('amber');
    expect(getColorCode(87.99)).toBe('amber');
  });

  it('returns red for scores 88 and above', () => {
    expect(getColorCode(88)).toBe('red');
    expect(getColorCode(94)).toBe('red');
    expect(getColorCode(100)).toBe('red');
  });
});
