import React, { useEffect, useState } from 'react';
import type { DashboardEvent, AggregateMetrics } from '../types';
import { createApiClient } from '../api/client';
import { formatSystemHealth } from '../components/SystemHealthPanel';
import { getDemoMetrics } from '../demo-data';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface SystemHealthPageProps {
  subscribe: (handler: (event: DashboardEvent) => void) => () => void;
}

export const SystemHealthPage: React.FC<SystemHealthPageProps> = ({ subscribe }) => {
  const [metrics, setMetrics] = useState<AggregateMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const client = createApiClient({ baseUrl: API_BASE });
    client.fetchAggregateMetrics().then((res) => {
      if (res.error) {
        setMetrics(getDemoMetrics());
        setIsDemo(true);
      } else {
        setMetrics(res.data);
      }
      setLoading(false);
    });
  }, []);

  // Live-tick demo metrics every 3 seconds
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setMetrics(getDemoMetrics());
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

  if (loading) return <div className="loading-state">Loading system health...</div>;
  if (!metrics) return <div className="empty-state">No metrics available</div>;

  const health = formatSystemHealth(metrics);

  return (
    <div>
      <h2 className="page-title">System Health</h2>
      {isDemo && <div className="demo-banner">Live Simulation — sample metrics</div>}
      <div className="card-grid">
        {health.domainCounts.map((d) => (
          <div className="card" key={d.domain}>
            <div className="card-label">{d.label}</div>
            <div className="card-value">{d.count.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <h3 className="section-title">Performance</h3>
      <div className="card-grid">
        <div className="card">
          <div className="card-label">Avg Response Time</div>
          <div className="card-value">
            {health.avgResponseTimeFormatted}
            <span className={`badge badge-${health.slaIndicator === 'green' ? 'green' : 'red'}`} style={{ marginLeft: 8, fontSize: '0.7rem' }}>
              {health.slaIndicator}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="card-label">False Positive Rate</div>
          <div className="card-value">{health.falsePositiveRate}</div>
        </div>
        <div className="card">
          <div className="card-label">Active Safety Sessions</div>
          <div className="card-value">{health.activeSafetySessions}</div>
        </div>
      </div>
    </div>
  );
};
