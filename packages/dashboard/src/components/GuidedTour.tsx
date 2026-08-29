import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  route: string;
  phase: 'Discover' | 'Assess' | 'Respond';
  title: string;
  narration: string;
  durationSec: number;
  callout: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    route: '/overview',
    phase: 'Discover',
    title: 'Synthetic Operations Overview',
    narration:
      'SafeGuard Sentinel correlates visual, textual, behavioral, and temporal signals. This dashboard is running with synthetic fixtures only; none of the identifiers or metrics shown here came from a customer or production environment.',
    durationSec: 18,
    callout: 'The demo banner marks every simulated view.',
  },
  {
    route: '/scam-network',
    phase: 'Discover',
    title: 'Correlated Network Signals',
    narration:
      'The graph links opaque account, device, network, and content tokens. Public samples avoid names, addresses, raw network identifiers, and other personal data while preserving the relationships needed to demonstrate graph analysis.',
    durationSec: 18,
    callout: 'Search for DEMO-ACCOUNT to filter the synthetic graph.',
  },
  {
    route: '/threats',
    phase: 'Assess',
    title: 'Four-Domain Risk Assessment',
    narration:
      'Independent analyzers contribute bounded scores to a composite assessment. A high score is a review signal, not proof of misconduct, and every deployment should calibrate thresholds against representative, lawfully obtained data.',
    durationSec: 18,
    callout: 'Inspect the score, intervention level, and review state together.',
  },
  {
    route: '/audit-logs',
    phase: 'Respond',
    title: 'Graduated, Reversible Intervention',
    narration:
      'Lower-confidence cases receive prompts or friction. Higher-confidence cases may receive temporary interaction restrictions and evidence preservation. Irreversible enforcement should remain behind explicit human approval.',
    durationSec: 18,
    callout: 'The Review column highlights actions that require an analyst.',
  },
  {
    route: '/evidence',
    phase: 'Respond',
    title: 'Redacted Evidence Demonstration',
    narration:
      'The evidence view demonstrates chain-of-custody fields using redacted messages and opaque references. Real deployments should minimize collection, encrypt sensitive records, restrict access, and enforce documented retention periods.',
    durationSec: 18,
    callout: 'All content and identifiers on this page are synthetic.',
  },
  {
    route: '/safety-sessions',
    phase: 'Respond',
    title: 'Privacy-Preserving Safety Sessions',
    narration:
      'Safety sessions use opaque contact and location references. Precise coordinates, addresses, and personal contact details are intentionally excluded from the shared application contract and sample data.',
    durationSec: 18,
    callout: 'Only generic labels and DEMO references appear in the table.',
  },
  {
    route: '/appeals',
    phase: 'Respond',
    title: 'Accountability and Appeals',
    narration:
      'Every affected user should receive clear notice and a meaningful path to appeal. Review decisions, evidence access, and outcome changes belong in a durable audit trail with separation of duties.',
    durationSec: 18,
    callout: 'Use appeals to measure both safety outcomes and false positives.',
  },
];

const PHASE_COLORS: Record<TourStep['phase'], string> = {
  Discover: '#0f766e',
  Assess: '#2563eb',
  Respond: '#d97706',
};

export const GuidedTour: React.FC<{ onEnd: () => void }> = ({ onEnd }) => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const step = TOUR_STEPS[stepIndex];
  const totalSteps = TOUR_STEPS.length;
  const phaseColor = PHASE_COLORS[step.phase];

  useEffect(() => {
    navigate(step.route);
  }, [navigate, step.route]);

  useEffect(() => {
    if (paused) return;

    const intervalMs = 100;
    const totalMs = step.durationSec * 1000;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalMs;
      setProgress(Math.min(100, (elapsed / totalMs) * 100));

      if (elapsed >= totalMs) {
        clearInterval(timer);
        if (stepIndex < totalSteps - 1) {
          setStepIndex((current) => current + 1);
          setProgress(0);
        } else {
          onEnd();
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [onEnd, paused, step.durationSec, stepIndex, totalSteps]);

  const goNext = useCallback(() => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((current) => current + 1);
      setProgress(0);
      return;
    }
    onEnd();
  }, [onEnd, stepIndex, totalSteps]);

  const goPrevious = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      setProgress(0);
    }
  }, [stepIndex]);

  return (
    <aside className="guided-tour" aria-live="polite">
      <div className="guided-tour-progress" aria-hidden="true">
        <div
          className="guided-tour-progress-value"
          style={{ width: `${progress}%`, background: phaseColor }}
        />
      </div>
      <div className="guided-tour-card">
        <div className="guided-tour-header">
          <div>
            <span
              className="guided-tour-phase"
              style={{ color: phaseColor, background: `${phaseColor}22` }}
            >
              {step.phase}
            </span>
            <span className="guided-tour-count">
              Step {stepIndex + 1} of {totalSteps}
            </span>
          </div>
          <button className="guided-tour-close" onClick={onEnd} aria-label="End tour">
            ✕ End Tour
          </button>
        </div>

        <h3 className="guided-tour-title">{step.title}</h3>
        <p className="guided-tour-narration">{step.narration}</p>
        <p className="guided-tour-callout" style={{ borderColor: phaseColor, color: phaseColor }}>
          {step.callout}
        </p>

        <div className="guided-tour-controls">
          <div className="guided-tour-dots" aria-label="Tour steps">
            {TOUR_STEPS.map((tourStep, index) => (
              <button
                key={tourStep.title}
                className="guided-tour-dot"
                aria-label={`Go to step ${index + 1}`}
                onClick={() => {
                  setStepIndex(index);
                  setProgress(0);
                }}
                style={{
                  background:
                    index === stepIndex
                      ? phaseColor
                      : index < stepIndex
                        ? 'rgba(255,255,255,0.45)'
                        : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
          <div className="guided-tour-buttons">
            <button onClick={goPrevious} disabled={stepIndex === 0}>
              Previous
            </button>
            <button onClick={() => setPaused((current) => !current)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={goNext}
              style={{ background: phaseColor, color: '#fff' }}
            >
              {stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
