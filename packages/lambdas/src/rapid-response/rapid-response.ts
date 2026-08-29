import type { IncidentReport, RapidResponseDeps, RapidResponseResult } from './types';

/**
 * Handles a serious incident report by assembling evidence, identifying
 * potential victims, initiating outreach, and routing to a specialist.
 *
 * Requirements: 12.1, 12.3, 12.4, 12.5
 */
export async function handleRapidResponse(
  report: IncidentReport,
  deps: RapidResponseDeps,
): Promise<RapidResponseResult> {
  // 1. Assemble evidence package (within 15 min SLA)
  const { packageId } = await deps.evidenceAssembly.assemblePackage(
    report.sessionId,
    report.userId,
    report.targetAccounts,
  );

  // 2. Identify other potential victims via Scam Network Graph & Behavioral Analyzer
  const victims = await deps.victimIdentification.identifyPotentialVictims(
    report.targetAccounts,
  );

  // 3. If victims found, initiate proactive safety outreach within 15 minutes
  const outreachInitiated = victims.length > 0;
  if (outreachInitiated) {
    await deps.safetyOutreach.initiateOutreach(victims);
  }

  // 4. Route evidence package to appropriate human specialist based on incident type
  await deps.specialistRouting.routeToSpecialist({
    packageId,
    incidentType: report.incidentType,
    sessionId: report.sessionId,
    userId: report.userId,
  });

  return {
    packageId,
    victimCount: victims.length,
    outreachInitiated,
    routedToSpecialist: report.incidentType,
  };
}
