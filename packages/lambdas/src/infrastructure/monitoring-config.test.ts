import { describe, it, expect } from 'vitest';
import { getMonitoringConfig } from './monitoring-config';

describe('getMonitoringConfig', () => {
  it('should enable X-Ray distributed tracing', () => {
    const config = getMonitoringConfig();
    expect(config.xrayEnabled).toBe(true);
  });

  it('should list all Lambda functions', () => {
    const config = getMonitoringConfig();
    expect(config.lambdaFunctions.length).toBeGreaterThanOrEqual(10);

    // Core analyzers and orchestration functions must be present
    const required = [
      'visual-analyzer',
      'textual-analyzer',
      'behavioral-analyzer',
      'temporal-analyzer',
      'threat-fusion',
      'intervention-orchestrator',
    ];
    for (const fn of required) {
      expect(config.lambdaFunctions).toContain(fn);
    }
  });

  it('should have a dashboard name set', () => {
    const config = getMonitoringConfig();
    expect(config.dashboardName).toBeTruthy();
    expect(config.dashboardName.length).toBeGreaterThan(0);
  });
});
