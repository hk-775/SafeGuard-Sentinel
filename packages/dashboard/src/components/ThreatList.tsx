import type { ActiveIntervention, DashboardEvent } from '../types';

export interface ThreatListState {
  interventions: ActiveIntervention[];
}

/**
 * Pure reducer function that handles real-time DashboardEvent state updates
 * for the threat list. Handles additions, updates, and resolution status changes.
 *
 * - 'threat' events: add a new intervention or update an existing one (matched by interventionId in payload)
 * - 'intervention' events: update an existing intervention's fields (matched by interventionId in payload)
 * - 'resolution' events: update the status of an existing intervention to the resolution status
 * - 'metric' events: ignored (not relevant to threat list)
 */
export function reduceThreatList(
  state: ThreatListState,
  event: DashboardEvent
): ThreatListState {
  const payload = event.payload as Record<string, unknown>;

  if (event.type === 'threat') {
    const interventionId = payload.interventionId as string | undefined;
    if (!interventionId) return state;

    const existingIndex = state.interventions.findIndex(
      (i) => i.interventionId === interventionId
    );

    const newIntervention: ActiveIntervention = {
      interventionId,
      threatType: (payload.threatType as string) ?? '',
      compositeScore: (payload.compositeScore as number) ?? 0,
      interventionLevel: (payload.interventionLevel as ActiveIntervention['interventionLevel']) ?? 0,
      status: (payload.status as string) ?? 'active',
    };

    if (existingIndex >= 0) {
      const updated = [...state.interventions];
      updated[existingIndex] = newIntervention;
      return { interventions: updated };
    }

    return { interventions: [...state.interventions, newIntervention] };
  }

  if (event.type === 'intervention') {
    const interventionId = payload.interventionId as string | undefined;
    if (!interventionId) return state;

    const existingIndex = state.interventions.findIndex(
      (i) => i.interventionId === interventionId
    );

    if (existingIndex < 0) return state;

    const updated = [...state.interventions];
    const existing = updated[existingIndex];
    updated[existingIndex] = {
      ...existing,
      ...(payload.threatType !== undefined && { threatType: payload.threatType as string }),
      ...(payload.compositeScore !== undefined && { compositeScore: payload.compositeScore as number }),
      ...(payload.interventionLevel !== undefined && {
        interventionLevel: payload.interventionLevel as ActiveIntervention['interventionLevel'],
      }),
      ...(payload.status !== undefined && { status: payload.status as string }),
    };
    return { interventions: updated };
  }

  if (event.type === 'resolution') {
    const interventionId = payload.interventionId as string | undefined;
    if (!interventionId) return state;

    const existingIndex = state.interventions.findIndex(
      (i) => i.interventionId === interventionId
    );

    if (existingIndex < 0) return state;

    const updated = [...state.interventions];
    updated[existingIndex] = {
      ...updated[existingIndex],
      status: (payload.status as string) ?? 'resolved',
    };
    return { interventions: updated };
  }

  // 'metric' events are ignored
  return state;
}
