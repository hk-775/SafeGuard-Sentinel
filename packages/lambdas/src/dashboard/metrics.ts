import type {
  AggregateMetrics,
  ActiveIntervention,
  DashboardColorCode,
  GetMetricsDeps,
} from './types';

// ---------------------------------------------------------------------------
// REST API — aggregate metrics
// ---------------------------------------------------------------------------

/**
 * Returns summary metrics for the monitoring dashboard:
 * threats neutralized, avg response time, false positive rate,
 * networks disrupted, and signal domain processing counts.
 */
export async function getAggregateMetrics(
  deps: GetMetricsDeps,
): Promise<AggregateMetrics> {
  return deps.metricsStore.getAggregateMetrics();
}

// ---------------------------------------------------------------------------
// REST API — active interventions
// ---------------------------------------------------------------------------

/**
 * Returns active intervention cards with threat type, composite score,
 * intervention level, and current status.
 */
export async function getActiveInterventions(
  deps: GetMetricsDeps,
): Promise<ActiveIntervention[]> {
  return deps.metricsStore.getActiveInterventions();
}

// ---------------------------------------------------------------------------
// Color coding
// ---------------------------------------------------------------------------

/**
 * Maps a composite threat score to a dashboard color code.
 *
 * - **green**: score < 60 (safe / resolved)
 * - **amber**: 60 ≤ score < 88 (warning)
 * - **red**:   score ≥ 88 (critical)
 */
export function getColorCode(score: number): DashboardColorCode {
  if (score < 60) return 'green';
  if (score < 88) return 'amber';
  return 'red';
}
