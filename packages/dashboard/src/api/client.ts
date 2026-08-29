import type {
  ApiClientConfig,
  ApiResult,
  AggregateMetrics,
  ActiveIntervention,
  AuditLogEntry,
  AuditSearchFilters,
  AppealRecord,
  EvidencePackage,
  SafetySession,
  IncidentReport,
  GraphVertex,
  GraphEdge,
} from '../types';
import { AppealStatus } from '../types';

async function request<T>(url: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url);
    if (response.status >= 400) {
      const message = await response.text().catch(() => 'Unknown error');
      return { data: null, error: { statusCode: response.status, message } };
    }
    const data: T = await response.json();
    return { data, error: null };
  } catch {
    return { data: null, error: { statusCode: 0, message: 'Network error' } };
  }
}

export function createApiClient(config: ApiClientConfig) {
  const base = config.baseUrl.replace(/\/+$/, '');

  return {
    fetchAggregateMetrics(): Promise<ApiResult<AggregateMetrics>> {
      return request<AggregateMetrics>(`${base}/metrics`);
    },

    fetchActiveInterventions(): Promise<ApiResult<ActiveIntervention[]>> {
      return request<ActiveIntervention[]>(`${base}/interventions/active`);
    },

    searchAuditLogs(filters: AuditSearchFilters): Promise<ApiResult<AuditLogEntry[]>> {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.interventionLevel !== undefined) {
        params.set('interventionLevel', String(filters.interventionLevel));
      }
      if (filters.accountId) params.set('accountId', filters.accountId);
      if (filters.threatType) params.set('threatType', filters.threatType);
      if (filters.query) params.set('query', filters.query);
      const qs = params.toString();
      return request<AuditLogEntry[]>(`${base}/audit-logs${qs ? `?${qs}` : ''}`);
    },

    fetchAppeals(status?: AppealStatus): Promise<ApiResult<AppealRecord[]>> {
      const qs = status ? `?status=${status}` : '';
      return request<AppealRecord[]>(`${base}/appeals${qs}`);
    },

    fetchEvidencePackage(packageId: string): Promise<ApiResult<EvidencePackage>> {
      return request<EvidencePackage>(`${base}/evidence/${encodeURIComponent(packageId)}`);
    },

    fetchSafetySessions(): Promise<ApiResult<SafetySession[]>> {
      return request<SafetySession[]>(`${base}/safety-sessions`);
    },

    fetchIncidentReports(): Promise<ApiResult<IncidentReport[]>> {
      return request<IncidentReport[]>(`${base}/incidents`);
    },

    fetchScamNetworkGraph(
      accountId: string
    ): Promise<ApiResult<{ vertices: GraphVertex[]; edges: GraphEdge[] }>> {
      return request<{ vertices: GraphVertex[]; edges: GraphEdge[] }>(
        `${base}/scam-network/${encodeURIComponent(accountId)}`
      );
    },
  };
}
