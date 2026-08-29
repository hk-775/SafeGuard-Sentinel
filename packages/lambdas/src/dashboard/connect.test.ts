import { describe, it, expect, vi } from 'vitest';
import { connectDashboard, disconnectDashboard, streamMetrics } from './connect';
import type {
  DashboardEvent,
  StreamMetricsDeps,
  WebSocketConnectionStore,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConnectionStore(connections: string[] = []): WebSocketConnectionStore {
  const store = new Set(connections);
  return {
    addConnection: vi.fn().mockImplementation(async (id: string) => {
      store.add(id);
    }),
    removeConnection: vi.fn().mockImplementation(async (id: string) => {
      store.delete(id);
    }),
    getConnections: vi.fn().mockImplementation(async () => [...store]),
  };
}

function makeStreamDeps(connections: string[] = []): StreamMetricsDeps {
  return {
    connectionStore: makeConnectionStore(connections),
    wsClient: {
      postToConnection: vi.fn().mockResolvedValue(undefined),
    },
  };
}

const sampleEvent: DashboardEvent = {
  type: 'threat',
  payload: { threatId: 'abc-123' },
  timestamp: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// connectDashboard
// ---------------------------------------------------------------------------

describe('connectDashboard', () => {
  it('adds the connection to the store', async () => {
    const connectionStore = makeConnectionStore();
    await connectDashboard('conn-1', { connectionStore });

    expect(connectionStore.addConnection).toHaveBeenCalledWith('conn-1');
  });
});

// ---------------------------------------------------------------------------
// disconnectDashboard
// ---------------------------------------------------------------------------

describe('disconnectDashboard', () => {
  it('removes the connection from the store', async () => {
    const connectionStore = makeConnectionStore(['conn-1']);
    await disconnectDashboard('conn-1', { connectionStore });

    expect(connectionStore.removeConnection).toHaveBeenCalledWith('conn-1');
  });
});

// ---------------------------------------------------------------------------
// streamMetrics
// ---------------------------------------------------------------------------

describe('streamMetrics', () => {
  it('posts the event to all connected clients', async () => {
    const deps = makeStreamDeps(['conn-1', 'conn-2', 'conn-3']);
    await streamMetrics(sampleEvent, deps);

    expect(deps.wsClient.postToConnection).toHaveBeenCalledTimes(3);
    const expectedData = JSON.stringify(sampleEvent);
    expect(deps.wsClient.postToConnection).toHaveBeenCalledWith('conn-1', expectedData);
    expect(deps.wsClient.postToConnection).toHaveBeenCalledWith('conn-2', expectedData);
    expect(deps.wsClient.postToConnection).toHaveBeenCalledWith('conn-3', expectedData);
  });

  it('handles an empty connections list gracefully', async () => {
    const deps = makeStreamDeps([]);
    await streamMetrics(sampleEvent, deps);

    expect(deps.wsClient.postToConnection).not.toHaveBeenCalled();
  });
});
