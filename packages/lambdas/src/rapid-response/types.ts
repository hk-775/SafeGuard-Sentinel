// ---------------------------------------------------------------------------
// Rapid Response module — injectable interfaces and data types
// ---------------------------------------------------------------------------

/** Assembles a complete evidence package for a session. */
export interface EvidenceAssemblyClient {
  assemblePackage(
    sessionId: string,
    userId: string,
    targetAccounts: string[],
  ): Promise<{ packageId: string }>;
}

/** Identifies potential victims by querying Scam Network Graph and Behavioral Analyzer. */
export interface VictimIdentificationClient {
  identifyPotentialVictims(targetAccounts: string[]): Promise<string[]>;
}

/** Initiates proactive safety outreach to identified victims. */
export interface SafetyOutreachClient {
  initiateOutreach(victimUserIds: string[]): Promise<void>;
}

/** Routes an evidence package to the appropriate human specialist queue. */
export interface SpecialistRoutingClient {
  routeToSpecialist(params: {
    packageId: string;
    incidentType: string;
    sessionId: string;
    userId: string;
  }): Promise<void>;
}

/** Incident report submitted through the in-app reporting system. */
export interface IncidentReport {
  reportId: string;
  sessionId: string;
  userId: string;
  targetAccounts: string[];
  incidentType: 'fraud' | 'harassment' | 'physical_safety';
  timestamp: string;
}

/** Result of the rapid response workflow. */
export interface RapidResponseResult {
  packageId: string;
  victimCount: number;
  outreachInitiated: boolean;
  routedToSpecialist: string;
}

/** Aggregated dependency container for the rapid response handler. */
export interface RapidResponseDeps {
  evidenceAssembly: EvidenceAssemblyClient;
  victimIdentification: VictimIdentificationClient;
  safetyOutreach: SafetyOutreachClient;
  specialistRouting: SpecialistRoutingClient;
}
