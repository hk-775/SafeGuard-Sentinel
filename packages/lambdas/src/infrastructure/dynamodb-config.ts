import type { DynamoDBTableConfig } from './types';

/**
 * Returns DynamoDB table configurations for all SafeGuard Sentinel tables.
 * - session-state: hot-path session data with DynamoDB Streams for score re-evaluation
 * - threat-scores: composite threat scores per session with userId GSI
 * - safety-sessions: Safety Sessions session records with userId GSI
 * - appeal-records: appeal cases with userId and interventionId GSIs
 */
export function getDynamoDBTableConfigs(): DynamoDBTableConfig[] {
  return [
    {
      tableName: 'session-state',
      partitionKey: 'sessionId',
      ttlAttribute: 'ttl',
      streamEnabled: true,
    },
    {
      tableName: 'threat-scores',
      partitionKey: 'sessionId',
      gsiKeys: [{ name: 'userId-index', partitionKey: 'userId' }],
      ttlAttribute: 'ttl',
    },
    {
      tableName: 'safety-sessions',
      partitionKey: 'sessionId',
      gsiKeys: [{ name: 'userId-index', partitionKey: 'userId' }],
      ttlAttribute: 'ttl',
    },
    {
      tableName: 'appeal-records',
      partitionKey: 'appealId',
      gsiKeys: [
        { name: 'userId-index', partitionKey: 'userId' },
        { name: 'interventionId-index', partitionKey: 'interventionId' },
      ],
      ttlAttribute: 'ttl',
    },
  ];
}
