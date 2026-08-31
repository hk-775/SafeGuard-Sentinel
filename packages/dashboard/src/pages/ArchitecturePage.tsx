import React from 'react';
import { publicAsset } from '../lib/publicSite';

export const ArchitecturePage: React.FC = () => {
  return (
    <div
      style={{ maxWidth: 1200, margin: '0 auto' }}
      data-testid="architecture-page"
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 8 }}>Technical Architecture</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          SafeGuard Sentinel — AWS Serverless Infrastructure
        </p>
      </div>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 16,
          overflow: 'auto',
        }}
      >
        <img
          src={publicAsset('architecture.svg')}
          alt="SafeGuard Sentinel AWS Architecture Diagram"
          data-testid="architecture-image"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
    </div>
  );
};
