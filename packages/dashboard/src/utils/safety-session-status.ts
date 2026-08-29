import { SafetySessionStatus } from '../types';
import type { SafetySessionStatusIndicator } from '../types';

export function getSafetySessionStatusIndicator(
  status: SafetySessionStatus,
  missedConsecutiveCheckIns: number
): SafetySessionStatusIndicator {
  if (status === SafetySessionStatus.Escalated) return 'red';
  if (missedConsecutiveCheckIns === 1) return 'amber';
  return 'default';
}
