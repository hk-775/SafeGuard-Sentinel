/**
 * Infrastructure configuration types for SafeGuard Sentinel.
 * These typed objects are consumed by CDK/CloudFormation/SAM templates.
 */

export interface EventBridgeRuleConfig {
  ruleName: string;
  source: string;
  detailType: string;
  targetArn: string;
}

export interface KinesisEventSourceConfig {
  streamArn: string;
  functionName: string;
  batchSize: number;
  startingPosition: 'LATEST' | 'TRIM_HORIZON';
  enhancedFanOut: boolean;
}

export interface DynamoDBTableConfig {
  tableName: string;
  partitionKey: string;
  sortKey?: string;
  gsiKeys?: { name: string; partitionKey: string }[];
  ttlAttribute?: string;
  streamEnabled?: boolean;
}

export interface S3BucketConfig {
  bucketName: string;
  sseKmsKeyArn: string;
  objectLockEnabled: boolean;
  lifecycleRules: {
    id: string;
    prefix: string;
    transitionDays: number;
    storageClass: string;
  }[];
}

export interface MonitoringConfig {
  lambdaFunctions: string[];
  xrayEnabled: boolean;
  dashboardName: string;
}
