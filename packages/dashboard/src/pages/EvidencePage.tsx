import React, { useEffect, useState } from 'react';
import { getLiveEvidence } from '../demo-data';
import { formatEvidenceCase } from '../components/EvidenceCaseView';
import type { EvidencePackage } from '../types';

function displayString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : 'Redacted';
}

function displayStringList(value: unknown): string {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .join(', ')
    : '';
}

export const EvidencePage: React.FC = () => {
  const [pkg, setPkg] = useState<EvidencePackage>(getLiveEvidence());

  // Poll every second — always in demo/simulation mode
  useEffect(() => {
    const interval = setInterval(() => {
      setPkg(getLiveEvidence());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = formatEvidenceCase(pkg);

  return (
    <div>
      <h2 className="page-title">Evidence Case</h2>
      <div className="demo-banner">
        Synthetic simulation — redacted evidence fixture
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-label">Package ID</div>
          <div className="card-value" style={{ fontSize: '1rem' }}>{formatted.packageId}</div>
        </div>
        <div className="card">
          <div className="card-label">Case ID</div>
          <div className="card-value" style={{ fontSize: '1rem' }}>{formatted.caseId}</div>
        </div>
        <div className="card">
          <div className="card-label">Composite Score</div>
          <div className="card-value">{formatted.compositeScoreAtIntervention}</div>
        </div>
        <div className="card">
          <div className="card-label">Intervention Level</div>
          <div className="card-value" style={{ fontSize: '1rem' }}>{formatted.interventionLevel}</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Target Accounts</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {formatted.targetAccounts.map((acc) => (
            <span key={acc} className="badge badge-high" style={{ fontFamily: 'monospace' }}>{acc}</span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Signal Breakdown</h3>
        <div className="card-grid">
          {formatted.signalBreakdown.map((domain) => (
            <div key={domain.domain} className="card">
              <div className="card-label" style={{ textTransform: 'capitalize' }}>{domain.domain}</div>
              <div className="card-value">{domain.score}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {domain.signals.length} signal{domain.signals.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
          Conversation History ({pkg.conversationHistory.length} messages)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pkg.conversationHistory.map((msg, i) => (
            <div key={msg.messageId + i} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: msg.senderId.startsWith('ACC') ? 'var(--danger)' : 'var(--accent)' }}>
                  {msg.senderId}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{msg.content}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
          Behavioral Timeline ({pkg.behavioralTimeline.length} events)
        </h3>
        <table className="audit-table" role="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Count</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {pkg.behavioralTimeline.map((evt, i) => (
              <tr key={i}>
                <td>{displayString(evt.event)}</td>
                <td>{displayString(evt.count)}</td>
                <td>{new Date(displayString(evt.timestamp)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
          Cross References ({pkg.crossReferences.length})
        </h3>
        <table className="audit-table" role="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>Linked Accounts</th>
            </tr>
          </thead>
          <tbody>
            {pkg.crossReferences.map((ref, i) => (
              <tr key={i}>
                <td>{displayString(ref.type)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {displayString(ref.value)}
                </td>
                <td>{displayStringList(ref.linkedAccounts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Network Graph</h3>
        <div className="card-grid">
          <div className="card">
            <div className="card-label">Nodes</div>
            <div className="card-value">{formatted.networkGraphNodeCount}</div>
          </div>
          <div className="card">
            <div className="card-label">Edges</div>
            <div className="card-value">{formatted.networkGraphEdgeCount}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Chain of Custody</h3>
        <table className="audit-table" role="table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Created By</td><td>{formatted.chainOfCustody.createdBy}</td></tr>
            <tr><td>Created At</td><td>{new Date(formatted.chainOfCustody.createdAt).toLocaleString()}</td></tr>
            <tr><td>SHA-256</td><td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatted.chainOfCustody.checksumSHA256}</td></tr>
            <tr><td>Retain Until</td><td>{new Date(formatted.chainOfCustody.retainUntil).toLocaleDateString()}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
