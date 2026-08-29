import React, { useEffect, useState } from 'react';
import type { IncidentReport } from '../types';
import { createApiClient } from '../api/client';
import { formatIncidentRow } from '../components/IncidentList';
import { DEMO_INCIDENTS, getLiveIncidents } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const RapidResponsePage: React.FC = () => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    client.fetchIncidentReports().then((res) => {
      if (res.error) {
        setReports(getLiveIncidents());
        setIsDemo(true);
      } else {
        setReports(res.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  // Live-tick incidents every 10 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setReports(getLiveIncidents());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (loading) return <div className="loading-state">Loading incidents...</div>;

  const rows = reports.map(formatIncidentRow);

  return (
    <div>
      <h2 className="page-title">Rapid Response</h2>
      {isDemo && <div className="demo-banner">Live Simulation — sample incident data</div>}
      {rows.length === 0 ? (
        <div className="empty-state">No incidents</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Session</th>
              <th>User</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.reportId}>
                <td>{row.reportId}</td>
                <td>{row.sessionId}</td>
                <td>{row.userId}</td>
                <td>{row.incidentType}</td>
                <td><span className={`badge badge-${row.indicator === 'red' ? 'red' : 'amber'}`}>{row.indicator === 'red' ? 'Critical' : 'Standard'}</span></td>
                <td>{new Date(row.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
