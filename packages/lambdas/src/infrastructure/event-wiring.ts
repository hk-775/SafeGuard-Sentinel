import type { EventBridgeRuleConfig, KinesisEventSourceConfig } from './types';

/**
 * Returns all EventBridge rules that wire analyzer outputs to the Threat Fusion
 * Engine and threat events to the Intervention Orchestrator (Step Functions).
 */
export function getEventBridgeRules(): EventBridgeRuleConfig[] {
  return [
    {
      ruleName: 'visual-risk-to-threat-fusion',
      source: 'safeguard.visual-analyzer',
      detailType: 'visual.risk.score',
      targetArn: 'arn:aws:lambda:us-east-1:ACCOUNT:function:threat-fusion',
    },
    {
      ruleName: 'textual-risk-to-threat-fusion',
      source: 'safeguard.textual-analyzer',
      detailType: 'textual.risk.score',
      targetArn: 'arn:aws:lambda:us-east-1:ACCOUNT:function:threat-fusion',
    },
    {
      ruleName: 'behavioral-risk-to-threat-fusion',
      source: 'safeguard.behavioral-analyzer',
      detailType: 'behavioral.risk.score',
      targetArn: 'arn:aws:lambda:us-east-1:ACCOUNT:function:threat-fusion',
    },
    {
      ruleName: 'temporal-risk-to-threat-fusion',
      source: 'safeguard.temporal-analyzer',
      detailType: 'temporal.risk.score',
      targetArn: 'arn:aws:lambda:us-east-1:ACCOUNT:function:threat-fusion',
    },
    {
      ruleName: 'threat-event-to-intervention',
      source: 'safeguard.threat-fusion',
      detailType: 'threat.event',
      targetArn: 'arn:aws:states:us-east-1:ACCOUNT:stateMachine:intervention-orchestrator',
    },
  ];
}

/**
 * Returns Kinesis event source mappings for all four signal analyzers.
 * Each analyzer gets enhanced fan-out for dedicated read throughput.
 */
export function getKinesisEventSources(): KinesisEventSourceConfig[] {
  const analyzers = [
    'visual-analyzer',
    'textual-analyzer',
    'behavioral-analyzer',
    'temporal-analyzer',
  ];

  return analyzers.map((name) => ({
    streamArn: 'arn:aws:kinesis:us-east-1:ACCOUNT:stream/safeguard-signals',
    functionName: name,
    batchSize: 100,
    startingPosition: 'LATEST' as const,
    enhancedFanOut: true,
  }));
}
