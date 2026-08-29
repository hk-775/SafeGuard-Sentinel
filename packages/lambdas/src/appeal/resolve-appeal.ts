import { AppealStatus } from '@safeguard-sentinel/shared';
import type { AppealRecord } from '@safeguard-sentinel/shared';
import type { ResolveAppealRequest, ResolveAppealDeps } from './types';

/**
 * Resolves an existing appeal with a human reviewer's decision.
 *
 * - Retrieves the appeal from the store
 * - Throws if the appeal is not found
 * - Sets resolution, resolvedAt, resolvedBy, and status to Resolved
 * - Updates the appeal in the store
 * - Returns the updated appeal record
 *
 * Validates: Requirements 20.3
 */
export async function resolveAppeal(
  request: ResolveAppealRequest,
  deps: ResolveAppealDeps,
): Promise<AppealRecord> {
  const appeal = await deps.appealStore.getAppeal(request.appealId);

  if (!appeal) {
    throw new Error(`Appeal not found: ${request.appealId}`);
  }

  const resolvedAt = new Date().toISOString();

  const updates: Partial<AppealRecord> = {
    resolution: request.resolution,
    resolvedAt,
    resolvedBy: request.resolvedBy,
    status: AppealStatus.Resolved,
  };

  await deps.appealStore.updateAppeal(request.appealId, updates);

  return {
    ...appeal,
    ...updates,
  };
}
