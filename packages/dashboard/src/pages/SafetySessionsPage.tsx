import React, { useEffect, useState } from 'react';
import type { SafetySession } from '../types';
import { createApiClient } from '../api/client';
import { formatSafetySessionRow } from '../components/SafetySessionList';
import { DEMO_SAFETY_SESSIONS, getLiveSafetySessions } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const SafetySessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SafetySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    client.fetchSafetySessions().then((res) => {
      if (res.error) {
        setSessions(getLiveSafetySessions());
        setIsDemo(true);
      } else {
        setSessions(res.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  // Live-tick sessions every 7 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setSessions(getLiveSafetySessions());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (loading) return <div className="loading-state">Loading sessions...</div>;

  const rows = sessions.map(formatSafetySessionRow);

  return (
    <div>
      <h2 className="page-title">Safety Sessions</h2>
      {isDemo && <div className="demo-banner">Live Simulation — sample session data</div>}
      {rows.length === 0 ? (
        <div className="empty-state">No active sessions</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>User</th>
              <th>Contact Ref</th>
              <th>Meeting Location</th>
              <th>Verified</th>
              <th>Status</th>
              <th>Missed Check-ins</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sessionId}>
                <td>{row.sessionId}</td>
                <td>{row.userId}</td>
                <td>{row.contactId}</td>
                <td>{row.locationName}</td>
                <td>{row.locationVerified ? '✅' : '❌'}</td>
                <td><span className={`badge badge-${row.statusIndicator === 'red' ? 'red' : row.statusIndicator === 'amber' ? 'amber' : 'green'}`}>{row.status}</span></td>
                <td>{row.missedConsecutiveCheckIns}</td>
                <td>{new Date(row.startedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
