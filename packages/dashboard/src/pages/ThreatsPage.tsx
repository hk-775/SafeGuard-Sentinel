import React, { useEffect, useState } from 'react';
import type { DashboardEvent, ActiveIntervention } from '../types';
import { createApiClient } from '../api/client';
import { formatThreatCard } from '../components/ThreatCard';
import { DEMO_INTERVENTIONS, getLiveInterventions } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface ThreatsPageProps {
  subscribe: (handler: (event: DashboardEvent) => void) => () => void;
}

export const ThreatsPage: React.FC<ThreatsPageProps> = ({ subscribe }) => {
  const [interventions, setInterventions] = useState<ActiveIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    client.fetchActiveInterventions().then((res) => {
      if (res.error) {
        setInterventions(getLiveInterventions());
        setIsDemo(true);
      } else {
        setInterventions(res.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  // Live-tick threats every 5 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setInterventions(getLiveInterventions());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (loading) return <div className="loading-state">Loading threats...</div>;

  const cards = interventions.map(formatThreatCard);

  return (
    <div>
      <h2 className="page-title">Active Threats</h2>
      {isDemo && <div className="demo-banner">Live Simulation — sample threat data</div>}
      {cards.length === 0 ? (
        <div className="empty-state">No active threats</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Threat Type</th>
              <th>Score</th>
              <th>Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.interventionId}>
                <td>{card.interventionId}</td>
                <td>{card.threatType}</td>
                <td><span className={`badge badge-${card.compositeScoreColorCode}`}>{card.compositeScore}</span></td>
                <td>{card.interventionLevelName}</td>
                <td>{card.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
