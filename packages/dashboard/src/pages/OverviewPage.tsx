import React, { useEffect, useState } from 'react';
import type { DashboardEvent, AggregateMetrics, ActiveIntervention } from '../types';
import { createApiClient } from '../api/client';
import { formatMetrics } from '../components/MetricsPanel';
import { formatThreatCard } from '../components/ThreatCard';
import { getDemoMetrics, DEMO_INTERVENTIONS, getLiveInterventions } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface OverviewPageProps {
  subscribe: (handler: (event: DashboardEvent) => void) => () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ subscribe }) => {
  const [metrics, setMetrics] = useState<AggregateMetrics | null>(null);
  const [interventions, setInterventions] = useState<ActiveIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    let cancelled = false;

    async function load() {
      const [metricsRes, interventionsRes] = await Promise.all([
        client.fetchAggregateMetrics(),
        client.fetchActiveInterventions(),
      ]);

      if (cancelled) return;

      if (metricsRes.error || interventionsRes.error) {
        // Fallback to demo data when API is unavailable
        setMetrics(getDemoMetrics());
        setInterventions(getLiveInterventions());
        setIsDemo(true);
      } else {
        setMetrics(metricsRes.data);
        setInterventions(interventionsRes.data ?? []);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Live-tick demo metrics and threats every 3 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setMetrics(getDemoMetrics());
      setInterventions(getLiveInterventions());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  useEffect(() => {
    const unsubscribe = subscribe((event: DashboardEvent) => {
      if (event.type === 'metric' && metrics) {
        const payload = event.payload as Partial<AggregateMetrics>;
        setMetrics((prev) => (prev ? { ...prev, ...payload } : prev));
      }
    });
    return unsubscribe;
  }, [subscribe, metrics]);

  if (loading) return <div className="loading-state">Loading dashboard...</div>;

  const formattedMetrics = metrics ? formatMetrics(metrics) : [];
  const formattedCards = interventions.map(formatThreatCard);

  return (
    <div>
      <h2 className="page-title">Overview</h2>
      {isDemo && (
        <div className="demo-banner">
          Live Simulation — real-time threat monitoring active
        </div>
      )}
      <div className="card-grid">
        {formattedMetrics.map((m) => (
          <div className="card" key={m.key}>
            <div className="card-label">{m.label}</div>
            <div className="card-value">{m.value}</div>
          </div>
        ))}
      </div>
      <h3 className="section-title">Active Threats ({formattedCards.length})</h3>
      {formattedCards.length === 0 ? (
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
            {formattedCards.map((card) => (
              <tr key={card.interventionId}>
                <td>{card.interventionId}</td>
                <td>{card.threatType}</td>
                <td>
                  <span className={`badge badge-${card.compositeScoreColorCode}`}>
                    {card.compositeScore}
                  </span>
                </td>
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
