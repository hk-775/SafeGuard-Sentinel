import type { IncidentReport, DashboardColorCode } from '../types';

export interface FormattedIncidentRow {
  reportId: string;
  sessionId: string;
  userId: string;
  incidentType: string;
  timestamp: string;
  indicator: DashboardColorCode | 'default';
}

/**
 * Pure function that formats an IncidentReport for display in the incident list.
 * Applies a red indicator for physical_safety incident type.
 */
export function formatIncidentRow(report: IncidentReport): FormattedIncidentRow {
  return {
    reportId: report.reportId,
    sessionId: report.sessionId,
    userId: report.userId,
    incidentType: report.incidentType,
    timestamp: report.timestamp,
    indicator: report.incidentType === 'physical_safety' ? 'red' : 'default',
  };
}
