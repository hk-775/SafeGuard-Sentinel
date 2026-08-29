import React, { useCallback, useState } from 'react';
import { Routes, Route, Outlet, NavLink, useLocation } from 'react-router-dom';
import type { DashboardEvent } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { computeConnectionStatus } from './components/ConnectionStatus';
import { NAV_ITEMS } from './components/Sidebar';
import { GuidedTour } from './components/GuidedTour';
import { OverviewPage } from './pages/OverviewPage';
import { ThreatsPage } from './pages/ThreatsPage';
import { ScamNetworkPage } from './pages/ScamNetworkPage';
import { AppealsPage } from './pages/AppealsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { EvidencePage } from './pages/EvidencePage';
import { SafetySessionsPage } from './pages/SafetySessionsPage';
import { RapidResponsePage } from './pages/RapidResponsePage';
import { SystemHealthPage } from './pages/SystemHealthPage';

import { OnePagerPage } from './pages/OnePagerPage';
import { ArchitecturePage } from './pages/ArchitecturePage';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

const AppShellLayout: React.FC<{ status: 'connected' | 'disconnected' | 'reconnecting'; tourActive: boolean; onStartTour: () => void }> = ({ status, tourActive, onStartTour }) => {
  const connectionData = computeConnectionStatus(status);
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">🛡️</span>
          <span className="header-title">SafeGuard Sentinel</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!tourActive && (
            <button
              onClick={onStartTour}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                padding: '5px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'background 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              ▶ Guided Demo
            </button>
          )}
          <div className={`connection-badge connection-${connectionData.colorCode}`}>
            <span className="connection-dot" />
            {connectionData.label}
          </div>
        </div>
      </header>
      <div className="app-body">
        <nav className="sidebar" role="navigation" aria-label="Main navigation">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  aria-label={item.ariaLabel}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  end={item.path === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="main-content" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { status, subscribe } = useWebSocket({ url: WS_URL });
  const [tourActive, setTourActive] = useState(false);

  const noopSubscribe = useCallback((_handler: (event: DashboardEvent) => void) => {
    return subscribe(_handler);
  }, [subscribe]);

  const handleStartTour = useCallback(() => setTourActive(true), []);
  const handleEndTour = useCallback(() => setTourActive(false), []);

  return (
    <>
      <Routes>
        <Route element={<AppShellLayout status={status} tourActive={tourActive} onStartTour={handleStartTour} />}>
          <Route index element={<OnePagerPage />} />
          <Route path="architecture" element={<ArchitecturePage />} />
          <Route path="overview" element={<OverviewPage subscribe={noopSubscribe} />} />
          <Route path="threats" element={<ThreatsPage subscribe={noopSubscribe} />} />
          <Route path="scam-network" element={<ScamNetworkPage />} />
          <Route path="appeals" element={<AppealsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="evidence/:id?" element={<EvidencePage />} />
          <Route path="safety-sessions" element={<SafetySessionsPage />} />
          <Route path="rapid-response" element={<RapidResponsePage />} />
          <Route path="system-health" element={<SystemHealthPage subscribe={noopSubscribe} />} />
        </Route>
      </Routes>
      {tourActive && <GuidedTour onEnd={handleEndTour} />}
    </>
  );
};
