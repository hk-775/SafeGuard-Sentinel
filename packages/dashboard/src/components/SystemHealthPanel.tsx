import type { AggregateMetrics, SlaHealthIndicator } from '../types';
import { getSlaHealthIndicator } from '../utils/sla-health';

export interface FormattedDomainCount {
  domain: string;
  label: string;
  count: number;
}

export interface FormattedSystemHealth {
  domainCounts: FormattedDomainCount[];
  avgResponseTimeMs: number;
  avgResponseTimeFormatted: string;
  slaIndicator: SlaHealthIndicator;
  falsePositiveRate: string;
  activeSafetySessions: number;
}

/**
 * Pure function that formats AggregateMetrics for the system health panel.
 * Includes processing counts per domain, avgResponseTimeMs with SLA indicator,
 * false positive rate as %, and active safety sessions.
 */
export function formatSystemHealth(metrics: AggregateMetrics): FormattedSystemHealth {
  return {
    domainCounts: [
      { domain: 'visual', label: 'Photos Analyzed', count: metrics.photosAnalyzed },
      { domain: 'textual', label: 'Messages Scanned', count: metrics.messagesScanned },
      { domain: 'behavioral', label: 'Behavioral Sessions', count: metrics.behavioralSessions },
      { domain: 'temporal', label: 'Temporal Evaluations', count: metrics.temporalEvaluations },
    ],
    avgResponseTimeMs: metrics.avgResponseTimeMs,
    avgResponseTimeFormatted: `${metrics.avgResponseTimeMs}ms`,
    slaIndicator: getSlaHealthIndicator(metrics.avgResponseTimeMs),
    falsePositiveRate: `${metrics.falsePositiveRate}%`,
    activeSafetySessions: metrics.activeSafetySessions,
  };
}
