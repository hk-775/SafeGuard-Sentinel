import React, { useEffect, useState } from 'react';
import type { AppealRecord } from '../types';
import { createApiClient } from '../api/client';
import { formatAppealRow } from '../components/AppealList';
import { DEMO_APPEALS, getLiveAppeals } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const AppealsPage: React.FC = () => {
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    client.fetchAppeals().then((res) => {
      if (res.error) {
        setAppeals(getLiveAppeals());
        setIsDemo(true);
      } else {
        setAppeals(res.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  // Live-tick appeals every 8 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setAppeals(getLiveAppeals());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (loading) return <div className="loading-state">Loading appeals...</div>;

  const now = new Date();
  const rows = appeals.map((a) => formatAppealRow(a, now));

  return (
    <div>
      <h2 className="page-title">Appeals</h2>
      {isDemo && <div className="demo-banner">Live Simulation — sample appeal data</div>}
      {rows.length === 0 ? (
        <div className="empty-state">No appeals</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Appeal ID</th>
              <th>User</th>
              <th>Intervention</th>
              <th>Status</th>
              <th>Resolution</th>
              <th>SLA</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.appealId}>
                <td>{row.appealId}</td>
                <td>{row.userId}</td>
                <td>{row.interventionId}</td>
                <td><span className={`badge badge-${row.status === 'resolved' ? 'green' : row.status === 'in_review' ? 'amber' : 'blue'}`}>{row.status}</span></td>
                <td>{row.resolution}</td>
                <td><span className={`badge badge-${row.slaIndicator === 'ok' ? 'green' : row.slaIndicator === 'warning' ? 'amber' : 'red'}`}>{row.slaIndicator}</span></td>
                <td>{new Date(row.submittedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
