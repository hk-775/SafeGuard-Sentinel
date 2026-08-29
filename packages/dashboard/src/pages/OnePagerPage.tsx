import React from 'react';
import { useNavigate } from 'react-router-dom';

export const OnePagerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <span className="landing-badge">
            Open reference implementation for digital trust and safety
          </span>
          <h1 className="landing-title">SafeGuard Sentinel</h1>
          <p className="landing-tagline">
            Correlate multi-modal risk signals, coordinate proportional
            interventions, preserve evidence, and support human review without
            embedding customer data in the application.
          </p>
          <div className="landing-actions">
            <button
              className="landing-btn landing-btn-primary"
              onClick={() => navigate('/architecture')}
            >
              View Architecture
            </button>
            <button
              className="landing-btn landing-btn-accent"
              onClick={() => navigate('/overview')}
            >
              Explore Synthetic Demo
            </button>
          </div>
        </div>
      </section>

      <section className="landing-stats-bar" aria-label="Design targets">
        {[
          { value: '< 60s', label: 'Intervention target' },
          { value: '30s', label: 'Score refresh target' },
          { value: '< 15m', label: 'Evidence target' },
          { value: '4', label: 'Signal domains' },
          { value: '100%', label: 'Synthetic demo data' },
        ].map((item) => (
          <div key={item.label} className="landing-stat">
            <div className="landing-stat-value">{item.value}</div>
            <div className="landing-stat-label">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="landing-section">
        <div className="landing-two-col">
          <div className="landing-card landing-card-problem">
            <h2>The challenge</h2>
            <p>
              Isolated rules and reactive reports can miss coordinated abuse.
              Safety teams need a reviewable way to combine weak signals,
              identify linked activity, and intervene without treating a model
              score as proof.
            </p>
          </div>
          <div className="landing-card landing-card-solution">
            <h2>The approach</h2>
            <p>
              SafeGuard Sentinel separates signal analysis, score fusion,
              intervention policy, evidence handling, appeals, and operations
              views. Each boundary can be adapted to the platform&apos;s data,
              policy, legal, and human-review requirements.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">Four-domain signal analysis</h2>
        <p className="landing-section-sub">
          Independent analyzers produce bounded, explainable inputs.
        </p>
        <div className="landing-signal-grid">
          {[
            {
              icon: '◉',
              name: 'Visual',
              desc: 'Manipulation indicators, content reuse, and cross-account similarity.',
              color: '#d97706',
            },
            {
              icon: '▤',
              name: 'Textual',
              desc: 'Coercion, templated messaging, and suspicious solicitation patterns.',
              color: '#0f766e',
            },
            {
              icon: '⌁',
              name: 'Behavioral',
              desc: 'Velocity anomalies, connection patterns, and coordinated account clusters.',
              color: '#2563eb',
            },
            {
              icon: '◷',
              name: 'Temporal',
              desc: 'Escalation speed, vulnerable windows, and activity inconsistencies.',
              color: '#7c3aed',
            },
          ].map((signal) => (
            <div
              key={signal.name}
              className="landing-signal-card"
              style={{ borderTopColor: signal.color }}
            >
              <div className="landing-signal-icon">{signal.icon}</div>
              <h3>{signal.name}</h3>
              <p>{signal.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-dark">
        <h2 className="landing-section-title">Graduated intervention policy</h2>
        <p className="landing-section-sub">
          Responses become more restrictive only as evidence and review increase.
        </p>
        <div className="landing-levels">
          {[
            {
              level: 'L1',
              name: 'Safety prompt',
              trigger: 'Policy threshold',
              desc: 'Provide contextual guidance without limiting the account.',
              color: '#16a34a',
            },
            {
              level: 'L2',
              name: 'Friction',
              trigger: 'Elevated risk',
              desc: 'Request verification or slow a risky interaction.',
              color: '#d97706',
            },
            {
              level: 'L3',
              name: 'Temporary restriction',
              trigger: 'High risk',
              desc: 'Restrict interactions, preserve evidence, and queue review.',
              color: '#dc2626',
            },
            {
              level: 'L4',
              name: 'Network containment',
              trigger: 'Correlated high risk',
              desc: 'Contain linked activity while an authorized reviewer decides next steps.',
              color: '#7f1d1d',
            },
          ].map((level) => (
            <div key={level.level} className="landing-level-card">
              <div
                className="landing-level-badge"
                style={{ background: level.color }}
              >
                {level.level}
              </div>
              <div className="landing-level-info">
                <div className="landing-level-name">
                  {level.name}{' '}
                  <span className="landing-level-trigger">
                    {level.trigger}
                  </span>
                </div>
                <div className="landing-level-desc">{level.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">Safety and privacy boundaries</h2>
        <div className="landing-cap-grid">
          {[
            {
              icon: '◇',
              name: 'Synthetic samples only',
              desc: 'Checked-in demo records use explicit DEMO identifiers and redacted content.',
            },
            {
              icon: '◈',
              name: 'Opaque references',
              desc: 'Safety sessions avoid precise coordinates, addresses, and contact details.',
            },
            {
              icon: '◎',
              name: 'Human authority',
              desc: 'Irreversible enforcement remains outside the autonomous reference flow.',
            },
            {
              icon: '▣',
              name: 'Auditability',
              desc: 'Interventions, evidence handling, and appeals retain review context.',
            },
            {
              icon: '△',
              name: 'Data minimization',
              desc: 'Deployers choose lawful inputs, retention limits, and access controls.',
            },
            {
              icon: '↺',
              name: 'Appeals',
              desc: 'Affected users receive a path to challenge and reverse incorrect actions.',
            },
          ].map((capability) => (
            <div key={capability.name} className="landing-cap-card">
              <div className="landing-cap-icon">{capability.icon}</div>
              <h4>{capability.name}</h4>
              <p>{capability.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-dark">
        <h2 className="landing-section-title">AWS reference architecture</h2>
        <p className="landing-section-sub">
          The repository provides tested domain logic and an operations
          dashboard; deployment infrastructure remains adopter-owned.
        </p>
        <div className="landing-arch-grid">
          {[
            { label: 'Ingestion', value: 'Kinesis Data Streams' },
            { label: 'Analysis', value: 'Lambda + managed AI services' },
            { label: 'Graph', value: 'Amazon Neptune' },
            { label: 'State', value: 'Amazon DynamoDB' },
            { label: 'Workflow', value: 'AWS Step Functions' },
            { label: 'Evidence', value: 'Amazon S3 Object Lock' },
            { label: 'Audit', value: 'Amazon OpenSearch Service' },
            { label: 'Realtime', value: 'API Gateway WebSocket APIs' },
            { label: 'Alerts', value: 'Amazon SNS' },
          ].map((item) => (
            <div key={item.label} className="landing-arch-item">
              <span className="landing-arch-label">{item.label}</span>
              <span className="landing-arch-value">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-footer">
        <p className="landing-footer-tagline">
          SafeGuard Sentinel — proactive protection with human accountability.
        </p>
      </section>
    </div>
  );
};
