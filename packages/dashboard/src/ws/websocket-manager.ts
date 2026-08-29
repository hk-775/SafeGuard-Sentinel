import type { WebSocketManagerConfig, DashboardEvent, ReconnectionState } from '../types';
import { computeBackoff } from '../utils/backoff';

const VALID_EVENT_TYPES = new Set<DashboardEvent['type']>([
  'threat',
  'intervention',
  'resolution',
  'metric',
]);

export function isValidDashboardEvent(data: unknown): data is DashboardEvent {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    VALID_EVENT_TYPES.has(obj.type as DashboardEvent['type']) &&
    typeof obj.payload === 'object' &&
    obj.payload !== null &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Parse a raw message string and dispatch to handlers if it's a valid DashboardEvent.
 * Returns true if the event was dispatched, false if dropped.
 */
export function parseAndDispatch(
  rawMessage: string,
  handlers: Set<(event: DashboardEvent) => void>
): boolean {
  try {
    const parsed: unknown = JSON.parse(rawMessage);
    if (!isValidDashboardEvent(parsed)) return false;
    handlers.forEach((handler) => handler(parsed));
    return true;
  } catch {
    return false;
  }
}

export interface WebSocketManager {
  connect(): void;
  disconnect(): void;
  subscribe(handler: (event: DashboardEvent) => void): () => void;
  getStatus(): 'connected' | 'disconnected' | 'reconnecting';
}

export function createWebSocketManager(config: WebSocketManagerConfig): WebSocketManager {
  const initialBackoffMs = config.initialBackoffMs ?? 1000;
  const maxBackoffMs = config.maxBackoffMs ?? 30000;

  let ws: WebSocket | null = null;
  let intentionalClose = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const handlers = new Set<(event: DashboardEvent) => void>();

  const state: ReconnectionState = {
    attempt: 0,
    nextBackoffMs: initialBackoffMs,
    status: 'disconnected',
  };

  function scheduleReconnect() {
    state.status = 'reconnecting';
    const backoff = computeBackoff(state.attempt, initialBackoffMs, maxBackoffMs);
    state.nextBackoffMs = backoff;
    reconnectTimer = setTimeout(() => {
      state.attempt++;
      connect();
    }, backoff);
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    intentionalClose = false;

    try {
      ws = new WebSocket(config.url);
    } catch {
      // WebSocket constructor can throw (e.g. invalid URL or blocked by browser)
      state.status = 'disconnected';
      if (!intentionalClose) {
        scheduleReconnect();
      }
      return;
    }

    ws.onopen = () => {
      state.attempt = 0;
      state.nextBackoffMs = initialBackoffMs;
      state.status = 'connected';
    };

    ws.onmessage = (event: MessageEvent) => {
      parseAndDispatch(event.data, handlers);
    };

    ws.onclose = () => {
      state.status = 'disconnected';
      if (!intentionalClose) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // The close event will fire after error, triggering reconnect
    };
  }

  function disconnect() {
    intentionalClose = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    state.status = 'disconnected';
    state.attempt = 0;
    state.nextBackoffMs = initialBackoffMs;
  }

  function subscribe(handler: (event: DashboardEvent) => void): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  function getStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    return state.status;
  }

  return { connect, disconnect, subscribe, getStatus };
}
