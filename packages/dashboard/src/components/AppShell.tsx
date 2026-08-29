export interface AppShellLayout {
  sidebar: {
    collapsed: boolean;
    activeSection: string;
  };
  header: {
    applicationName: string;
    operatorIdentity: string;
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  };
  contentArea: {
    hasErrorBoundary: boolean;
  };
}

/**
 * Pure function that computes the AppShell layout configuration.
 * Composes Sidebar + Header + main content area with Error Boundary wrapping.
 */
export function computeAppShellLayout(
  currentPath: string,
  viewportWidth: number,
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting',
  operatorIdentity: string = 'Operator'
): AppShellLayout {
  return {
    sidebar: {
      collapsed: viewportWidth < 1024,
      activeSection: currentPath,
    },
    header: {
      applicationName: 'SafeGuard Sentinel',
      operatorIdentity,
      connectionStatus,
    },
    contentArea: {
      hasErrorBoundary: true,
    },
  };
}
