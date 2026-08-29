import type { AggregateMetrics } from '../types';

export interface FormattedMetric {
  key: string;
  label: string;
  value: string;
}

/**
 * Pure function that formats all AggregateMetrics fields for display.
 * avgResponseTimeMs gets "ms" suffix, falsePositiveRate gets "%" suffix.
 * All other fields are formatted as plain numbers.
 */
export function formatMetrics(metrics: AggregateMetrics): FormattedMetric[] {
  return [
    { key: 'threatsNeutralized', label: 'Threats Neutralized', value: String(metrics.threatsNeutralized) },
    { key: 'avgResponseTimeMs', label: 'Avg Response Time', value: `${metrics.avgResponseTimeMs}ms` },
    { key: 'falsePositiveRate', label: 'False Positive Rate', value: `${metrics.falsePositiveRate}%` },
    { key: 'networksDisrupted', label: 'Networks Disrupted', value: String(metrics.networksDisrupted) },
    { key: 'photosAnalyzed', label: 'Photos Analyzed', value: String(metrics.photosAnalyzed) },
    { key: 'messagesScanned', label: 'Messages Scanned', value: String(metrics.messagesScanned) },
    { key: 'behavioralSessions', label: 'Behavioral Sessions', value: String(metrics.behavioralSessions) },
    { key: 'temporalEvaluations', label: 'Temporal Evaluations', value: String(metrics.temporalEvaluations) },
    { key: 'activeSafetySessions', label: 'Active Safety Sessions', value: String(metrics.activeSafetySessions) },
  ];
}
