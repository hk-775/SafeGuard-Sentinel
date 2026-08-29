import type { SessionStore } from './types';

/** Thresholds for connection anomaly detection. */
export const INDISCRIMINATE_CONNECTION_THRESHOLD = 0.9; // 90% acceptance rate
export const NEW_ACCOUNT_AGE_HOURS = 48;
export const NEW_ACCOUNT_CONNECTION_THRESHOLD = 0.8; // 80% with new accounts
export const MIN_CONNECTIONS_FOR_ANALYSIS = 5;

/** Result of connection anomaly detection. */
export interface ConnectionAnomalyResult {
  isAnomaly: boolean;
  indiscriminateConnections: boolean;
  newAccountExclusivity: boolean;
  acceptanceRate: number;
  newAccountConnectionRate: number;
  totalConnections: number;
}

/**
 * Analyzes connection acceptance patterns to flag:
 * - Indiscriminate acceptance (accepting 90%+ of all connections)
 * - Exclusive connections with new accounts (80%+ with accounts < 48h old)
 */
export async function detectConnectionAnomaly(
  userId: string,
  sessionStore: SessionStore,
): Promise<ConnectionAnomalyResult> {
  const recentConnections = await sessionStore.getRecentConnections(userId, 24);

  if (recentConnections.length < MIN_CONNECTIONS_FOR_ANALYSIS) {
    return {
      isAnomaly: false,
      indiscriminateConnections: false,
      newAccountExclusivity: false,
      acceptanceRate: 0,
      newAccountConnectionRate: 0,
      totalConnections: recentConnections.length,
    };
  }

  const acceptedConnections = recentConnections.filter((connection) => connection.accepted);
  const acceptanceRate = acceptedConnections.length / recentConnections.length;
  const indiscriminateConnections =
    acceptanceRate >= INDISCRIMINATE_CONNECTION_THRESHOLD;

  const now = Date.now();
  const newAccountConnections = acceptedConnections.filter((connection) => {
    const accountAge =
      now - new Date(connection.connectedAccountCreatedAt).getTime();
    return accountAge < NEW_ACCOUNT_AGE_HOURS * 60 * 60 * 1000;
  });

  const newAccountConnectionRate =
    acceptedConnections.length > 0
      ? newAccountConnections.length / acceptedConnections.length
      : 0;
  const newAccountExclusivity =
    newAccountConnectionRate >= NEW_ACCOUNT_CONNECTION_THRESHOLD;

  return {
    isAnomaly: indiscriminateConnections || newAccountExclusivity,
    indiscriminateConnections,
    newAccountExclusivity,
    acceptanceRate,
    newAccountConnectionRate,
    totalConnections: recentConnections.length,
  };
}
