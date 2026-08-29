import type { EvidencePackage, Signal } from '../types';
import { InterventionLevel } from '../types';

export interface FormattedSignalDomain {
  domain: string;
  score: number;
  signals: Signal[];
}

export interface FormattedChainOfCustody {
  createdBy: string;
  createdAt: string;
  checksumSHA256: string;
  retainUntil: string;
}

export interface FormattedEvidenceCase {
  packageId: string;
  caseId: string;
  createdAt: string;
  targetAccounts: string[];
  interventionLevel: string;
  compositeScoreAtIntervention: number;
  chainOfCustody: FormattedChainOfCustody;
  signalBreakdown: FormattedSignalDomain[];
  networkGraphNodeCount: number;
  networkGraphEdgeCount: number;
}

const INTERVENTION_LEVEL_NAMES: Record<InterventionLevel, string> = {
  [InterventionLevel.None]: 'None',
  [InterventionLevel.SafetyPrompt]: 'SafetyPrompt',
  [InterventionLevel.Friction]: 'Friction',
  [InterventionLevel.InteractionRestriction]: 'Interaction Restriction',
  [InterventionLevel.NetworkDisruption]: 'NetworkDisruption',
};

/**
 * Pure function that formats an EvidencePackage for display,
 * including chain of custody and signal breakdown.
 */
export function formatEvidenceCase(pkg: EvidencePackage): FormattedEvidenceCase {
  return {
    packageId: pkg.packageId,
    caseId: pkg.caseId,
    createdAt: pkg.createdAt,
    targetAccounts: pkg.targetAccounts,
    interventionLevel: INTERVENTION_LEVEL_NAMES[pkg.interventionLevel] ?? 'Unknown',
    compositeScoreAtIntervention: pkg.compositeScoreAtIntervention,
    chainOfCustody: {
      createdBy: pkg.chainOfCustody.createdBy,
      createdAt: pkg.chainOfCustody.createdAt,
      checksumSHA256: pkg.chainOfCustody.checksumSHA256,
      retainUntil: pkg.chainOfCustody.s3ObjectLockRetainUntil,
    },
    signalBreakdown: [
      { domain: 'visual', score: pkg.signalBreakdown.visual.score, signals: pkg.signalBreakdown.visual.signals },
      { domain: 'textual', score: pkg.signalBreakdown.textual.score, signals: pkg.signalBreakdown.textual.signals },
      { domain: 'behavioral', score: pkg.signalBreakdown.behavioral.score, signals: pkg.signalBreakdown.behavioral.signals },
      { domain: 'temporal', score: pkg.signalBreakdown.temporal.score, signals: pkg.signalBreakdown.temporal.signals },
    ],
    networkGraphNodeCount: pkg.networkGraph.nodes.length,
    networkGraphEdgeCount: pkg.networkGraph.edges.length,
  };
}
