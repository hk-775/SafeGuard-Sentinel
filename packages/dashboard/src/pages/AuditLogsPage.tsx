import React, { useEffect, useState } from 'react';
import type { AuditLogEntry, AuditSearchFilters } from '../types';
import { createApiClient } from '../api/client';
import { DEMO_AUDIT_LOGS, getLiveAuditLogs } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const PAGE_SIZE = 50;

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    const filters: AuditSearchFilters = {};
    client.searchAuditLogs(filters).then((res) => {
      if (res.error) {
        setLogs(getLiveAuditLogs());
        setIsDemo(true);
      } else {
        setLogs(res.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  // Live-tick audit logs every 6 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setLogs(getLiveAuditLogs());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (loading) return <div className="loading-state">Loading audit logs...</div>;

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paged = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <h2 className="page-title">Audit Logs</h2>
      {isDemo && <div className="demo-banner">Live Simulation — sample audit data</div>}
      {paged.length === 0 ? (
        <div className="empty-state">No audit logs</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Intervention</th>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Targets</th>
                <th>Score</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((log) => (
                <tr key={log.interventionId + log.timestamp}>
                  <td>{log.interventionId}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.interventionType}</td>
                  <td>{log.targetAccounts.join(', ')}</td>
                  <td><span className={`badge badge-${log.triggeringScore >= 0.9 ? 'red' : log.triggeringScore >= 0.7 ? 'amber' : 'green'}`}>{log.triggeringScore}</span></td>
                  <td>{log.actionTaken}</td>
                  <td>{log.outcome}</td>
                  <td>{log.humanReviewRequired ? '⚠️ Yes' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</button>
          </div>
        </>
      )}
    </div>
  );
};
