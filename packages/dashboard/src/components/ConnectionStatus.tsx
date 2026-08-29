import type { DashboardColorCode } from '../types';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export interface ConnectionStatusData {
  state: ConnectionState;
  label: string;
  colorCode: DashboardColorCode;
}

const STATUS_MAP: Record<ConnectionState, { label: string; colorCode: DashboardColorCode }> = {
  connected: { label: 'Connected', colorCode: 'green' },
  disconnected: { label: 'Disconnected', colorCode: 'red' },
  reconnecting: { label: 'Reconnecting', colorCode: 'amber' },
};

/**
 * Pure function that computes connection status display data.
 * Maps connection state to label and color code.
 */
export function computeConnectionStatus(state: ConnectionState): ConnectionStatusData {
  const mapped = STATUS_MAP[state];
  return {
    state,
    label: mapped.label,
    colorCode: mapped.colorCode,
  };
}
