export interface HeaderData {
  applicationName: string;
  operatorIdentity: string;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

/**
 * Pure function that computes header display data.
 * Exported for testability without React rendering.
 */
export function computeHeaderData(
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting',
  operatorIdentity: string = 'Operator'
): HeaderData {
  return {
    applicationName: 'SafeGuard Sentinel',
    operatorIdentity,
    connectionStatus,
  };
}
