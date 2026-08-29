import React, { useEffect, useState, useMemo } from 'react';
import { useScamNetworkGraph } from '../hooks/useScamNetworkGraph';
import { getLiveGraphVertices, getLiveGraphEdges } from '../demo-data';
import { prepareGraphData } from '../components/ScamNetworkGraphView';
import type { GraphVertex, GraphEdge } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const ScamNetworkPage: React.FC = () => {
  const [accountId, setAccountId] = useState('');
  const [searchId, setSearchId] = useState<string | undefined>(undefined);
  const { vertices, edges, loading, error } = useScamNetworkGraph(API_BASE, searchId);

  const [liveVertices, setLiveVertices] = useState<GraphVertex[]>(getLiveGraphVertices());
  const [liveEdges, setLiveEdges] = useState<GraphEdge[]>(getLiveGraphEdges());
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (vertices.length === 0) setIsDemo(true);
  }, [vertices]);

  // Poll every second
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      setLiveVertices(getLiveGraphVertices());
      setLiveEdges(getLiveGraphEdges());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  const displayVertices = vertices.length > 0 ? vertices : liveVertices;
  const displayEdges = edges.length > 0 ? edges : liveEdges;

  // Filter by search term in demo mode
  const filteredVertices = useMemo(() => {
    if (!searchId || !isDemo) return displayVertices;
    const q = searchId.toLowerCase();
    return displayVertices.filter(v =>
      v.id.toLowerCase().includes(q) ||
      Object.values(v.properties).some(val => String(val).toLowerCase().includes(q))
    );
  }, [displayVertices, searchId, isDemo]);

  const filteredVertexIds = useMemo(() => new Set(filteredVertices.map(v => v.id)), [filteredVertices]);

  const filteredEdges = useMemo(() => {
    if (!searchId || !isDemo) return displayEdges;
    return displayEdges.filter(e => filteredVertexIds.has(e.source) || filteredVertexIds.has(e.target));
  }, [displayEdges, searchId, isDemo, filteredVertexIds]);

  const graph = prepareGraphData(filteredVertices, filteredEdges);

  const handleSearch = () => {
    setSearchId(accountId || undefined);
  };

  const handleClear = () => {
    setAccountId('');
    setSearchId(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <h2 className="page-title">Scam Network Graph</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search synthetic account or token ID..."
          aria-label="Search accounts"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            flex: 1,
            maxWidth: 400,
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
          }}
        >
          Search
        </button>
        {searchId && (
          <button
            onClick={handleClear}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Clear
          </button>
        )}
      </div>
      {loading && <div className="loading-state">Loading graph...</div>}
      {error && !isDemo && <div className="error-state">Error: {error}</div>}

      {isDemo && (
        <div className="demo-banner">
          Live Simulation — showing discovered scam networks
          {searchId && <span> (filtered: "{searchId}")</span>}
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <div className="card-label">Nodes</div>
          <div className="card-value">{graph.nodes.length}</div>
        </div>
        <div className="card">
          <div className="card-label">Edges</div>
          <div className="card-value">{graph.connections.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Network Nodes</h3>
        <table className="audit-table" role="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Properties</th>
            </tr>
          </thead>
          <tbody>
            {graph.nodes.map((node) => (
              <tr key={node.id}>
                <td style={{ fontFamily: 'monospace' }}>{node.id}</td>
                <td>
                  <span className={`badge badge-${node.type === 'account' ? 'high' : node.type === 'device' ? 'medium' : 'low'}`}>
                    {node.type}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {Object.entries(node.properties).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Connections</h3>
        <table className="audit-table" role="table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Target</th>
              <th>Relationship</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {graph.connections.map((edge, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace' }}>{edge.source}</td>
                <td style={{ fontFamily: 'monospace' }}>{edge.target}</td>
                <td>
                  <span style={{ color: edge.style.color, fontWeight: 600 }}>{edge.label}</span>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {Object.entries(edge.properties).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
