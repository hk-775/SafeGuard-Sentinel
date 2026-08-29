export interface NavItem {
  label: string;
  path: string;
  ariaLabel: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: '📄 One Pager', path: '/', ariaLabel: 'Navigate to One Pager' },
  { label: '🏗️ Architecture', path: '/architecture', ariaLabel: 'Navigate to Architecture' },
  { label: 'Overview', path: '/overview', ariaLabel: 'Navigate to Overview' },
  { label: 'Threats', path: '/threats', ariaLabel: 'Navigate to Threats' },
  { label: 'Scam Network', path: '/scam-network', ariaLabel: 'Navigate to Scam Network' },
  { label: 'Appeals', path: '/appeals', ariaLabel: 'Navigate to Appeals' },
  { label: 'Audit Logs', path: '/audit-logs', ariaLabel: 'Navigate to Audit Logs' },
  { label: 'Evidence', path: '/evidence', ariaLabel: 'Navigate to Evidence' },
  { label: 'Safety Sessions', path: '/safety-sessions', ariaLabel: 'Navigate to Safety Sessions' },
  { label: 'Rapid Response', path: '/rapid-response', ariaLabel: 'Navigate to Rapid Response' },
  { label: 'System Health', path: '/system-health', ariaLabel: 'Navigate to System Health' },
];

export interface SidebarState {
  items: NavItem[];
  activeIndex: number;
  collapsed: boolean;
}

/**
 * Pure function that computes sidebar state from current route and viewport width.
 * Exported for testability without React rendering.
 */
export function computeSidebarState(
  currentPath: string,
  viewportWidth: number
): SidebarState {
  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (item.path === '/') return currentPath === '/';
    return currentPath.startsWith(item.path);
  });

  return {
    items: NAV_ITEMS,
    activeIndex: activeIndex >= 0 ? activeIndex : -1,
    collapsed: viewportWidth < 1024,
  };
}
