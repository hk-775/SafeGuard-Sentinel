import { useEffect, useRef, useState, useCallback } from 'react';
import type { DashboardEvent, WebSocketManagerConfig } from '../types';
import { createWebSocketManager } from '../ws/websocket-manager';
import type { WebSocketManager } from '../ws/websocket-manager';

export function useWebSocket(config: WebSocketManagerConfig) {
  const managerRef = useRef<WebSocketManager | null>(null);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    const manager = createWebSocketManager(config);
    managerRef.current = manager;
    manager.connect();

    const interval = setInterval(() => {
      setStatus(manager.getStatus());
    }, 1000);

    return () => {
      clearInterval(interval);
      manager.disconnect();
      managerRef.current = null;
    };
  }, [config.url]);

  const subscribe = useCallback((handler: (event: DashboardEvent) => void) => {
    if (managerRef.current) {
      return managerRef.current.subscribe(handler);
    }
    return () => {};
  }, []);

  return { status, subscribe };
}
