import type { MonitoringConfig } from './types';

/**
 * Returns the monitoring configuration with all Lambda function names,
 * X-Ray distributed tracing enabled, and the CloudWatch dashboard name.
 */
export function getMonitoringConfig(): MonitoringConfig {
  return {
    lambdaFunctions: [
      'visual-analyzer',
      'textual-analyzer',
      'behavioral-analyzer',
      'temporal-analyzer',
      'threat-fusion',
      'intervention-orchestrator',
      'evidence-assembler',
      'audit-logger',
      'rapid-response',
      'safety-sessions',
      'appeal-processor',
      'dashboard-connect',
      'dashboard-metrics',
      'escalation-router',
    ],
    xrayEnabled: true,
    dashboardName: 'safeguard-sentinel-operations',
  };
}
