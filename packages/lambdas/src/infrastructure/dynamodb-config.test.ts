import { describe, it, expect } from 'vitest';
import { getDynamoDBTableConfigs } from './dynamodb-config';

describe('getDynamoDBTableConfigs', () => {
  it('should return exactly 4 table configurations', () => {
    const tables = getDynamoDBTableConfigs();
    expect(tables).toHaveLength(4);
  });

  it('should configure all expected tables', () => {
    const tables = getDynamoDBTableConfigs();
    const names = tables.map((t) => t.tableName).sort();
    expect(names).toEqual([
      'appeal-records',
      'safety-sessions',
      'session-state',
      'threat-scores',
    ]);
  });

  it('should set TTL attribute on all tables', () => {
    const tables = getDynamoDBTableConfigs();
    for (const table of tables) {
      expect(table.ttlAttribute).toBe('ttl');
    }
  });

  it('should enable DynamoDB Streams on session-state table', () => {
    const tables = getDynamoDBTableConfigs();
    const sessionState = tables.find((t) => t.tableName === 'session-state');
    expect(sessionState).toBeDefined();
    expect(sessionState!.streamEnabled).toBe(true);
  });
});
