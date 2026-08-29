import type {
  DashboardEvent,
  StreamMetricsDeps,
  WebSocketConnectionStore,
} from './types';

// ---------------------------------------------------------------------------
// WebSocket connection management
// ---------------------------------------------------------------------------

/**
 * Registers a new WebSocket connection for real-time dashboard streaming.
 */
export async function connectDashboard(
  connectionId: string,
  deps: { connectionStore: WebSocketConnectionStore },
): Promise<void> {
  await deps.connectionStore.addConnection(connectionId);
}

/**
 * Removes a WebSocket connection when a dashboard client disconnects.
 */
export async function disconnectDashboard(
  connectionId: string,
  deps: { connectionStore: WebSocketConnectionStore },
): Promise<void> {
  await deps.connectionStore.removeConnection(connectionId);
}

// ---------------------------------------------------------------------------
// Real-time event streaming
// ---------------------------------------------------------------------------

/**
 * Broadcasts a dashboard event to all connected WebSocket clients.
 *
 * Retrieves the current list of connections and posts the serialised event
 * to each one. Stale or errored connections are silently skipped.
 */
export async function streamMetrics(
  event: DashboardEvent,
  deps: StreamMetricsDeps,
): Promise<void> {
  const connections = await deps.connectionStore.getConnections();
  const data = JSON.stringify(event);

  await Promise.all(
    connections.map((connectionId) =>
      deps.wsClient.postToConnection(connectionId, data),
    ),
  );
}
