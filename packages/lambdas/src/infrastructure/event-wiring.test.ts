import { describe, it, expect } from 'vitest';
import { getEventBridgeRules, getKinesisEventSources } from './event-wiring';

describe('getEventBridgeRules', () => {
  it('should return exactly 5 EventBridge rules', () => {
    const rules = getEventBridgeRules();
    expect(rules).toHaveLength(5);
  });

  it('should wire all 4 analyzer outputs to threat-fusion', () => {
    const rules = getEventBridgeRules();
    const analyzerRules = rules.filter((r) => r.detailType.endsWith('.risk.score'));
    expect(analyzerRules).toHaveLength(4);

    const detailTypes = analyzerRules.map((r) => r.detailType).sort();
    expect(detailTypes).toEqual([
      'behavioral.risk.score',
      'temporal.risk.score',
      'textual.risk.score',
      'visual.risk.score',
    ]);
  });

  it('should wire threat.event to the intervention orchestrator (Step Functions)', () => {
    const rules = getEventBridgeRules();
    const threatRule = rules.find((r) => r.detailType === 'threat.event');
    expect(threatRule).toBeDefined();
    expect(threatRule!.targetArn).toContain('stateMachine');
  });
});

describe('getKinesisEventSources', () => {
  it('should return exactly 4 Kinesis event sources', () => {
    const sources = getKinesisEventSources();
    expect(sources).toHaveLength(4);
  });

  it('should have enhanced fan-out enabled for all sources', () => {
    const sources = getKinesisEventSources();
    for (const source of sources) {
      expect(source.enhancedFanOut).toBe(true);
    }
  });

  it('should have a corresponding event source for each analyzer', () => {
    const sources = getKinesisEventSources();
    const functionNames = sources.map((s) => s.functionName).sort();
    expect(functionNames).toEqual([
      'behavioral-analyzer',
      'temporal-analyzer',
      'textual-analyzer',
      'visual-analyzer',
    ]);
  });
});
