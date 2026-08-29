import type { SlaStatus } from '../types';

export function getAppealSlaStatus(slaDeadline: string, now: Date): SlaStatus {
  const deadline = new Date(slaDeadline);
  const msRemaining = deadline.getTime() - now.getTime();
  if (msRemaining <= 0) return 'breached';
  if (msRemaining <= 60 * 60 * 1000) return 'warning';
  return 'ok';
}
