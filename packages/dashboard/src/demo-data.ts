/**
 * Synthetic dashboard fixtures.
 *
 * These records are intentionally non-geographic and contain no names,
 * addresses, contact details, precise locations, customer identifiers, or
 * production-derived metrics. Every identifier is an explicit DEMO token.
 */

import type {
  ActiveIntervention,
  AggregateMetrics,
  AppealRecord,
  AuditLogEntry,
  EvidencePackage,
  GraphEdge,
  GraphVertex,
  IncidentReport,
  SafetySession,
} from './types';
import { InterventionLevel } from './types';
import {
  AppealResolution,
  AppealStatus,
  CheckInResponse,
  SafetySessionStatus,
  SignalSeverity,
} from '@safeguard-sentinel/shared';

const startedAt = Date.now();
const minute = (value: number) => value * 60_000;
const hour = (value: number) => value * 3_600_000;
const day = (value: number) => value * 86_400_000;
const isoAgo = (milliseconds: number) =>
  new Date(Date.now() - milliseconds).toISOString();

const METRICS_BASELINE: AggregateMetrics = {
  threatsNeutralized: 240,
  avgResponseTimeMs: 910,
  falsePositiveRate: 1.8,
  networksDisrupted: 12,
  photosAnalyzed: 48_000,
  messagesScanned: 310_000,
  behavioralSessions: 8_500,
  temporalEvaluations: 21_000,
  activeSafetySessions: 6,
};

export function getDemoMetrics(): AggregateMetrics {
  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  return {
    ...METRICS_BASELINE,
    threatsNeutralized:
      METRICS_BASELINE.threatsNeutralized + Math.floor(elapsedSeconds / 20),
    photosAnalyzed:
      METRICS_BASELINE.photosAnalyzed + elapsedSeconds * 3,
    messagesScanned:
      METRICS_BASELINE.messagesScanned + elapsedSeconds * 12,
    behavioralSessions:
      METRICS_BASELINE.behavioralSessions + Math.floor(elapsedSeconds / 3),
    temporalEvaluations:
      METRICS_BASELINE.temporalEvaluations + elapsedSeconds,
  };
}

export const DEMO_METRICS = METRICS_BASELINE;

export const DEMO_INTERVENTIONS: ActiveIntervention[] = [
  {
    interventionId: 'DEMO-INTERVENTION-001',
    threatType: 'coordinated_fraud',
    compositeScore: 96,
    interventionLevel: InterventionLevel.NetworkDisruption,
    status: 'under_review',
  },
  {
    interventionId: 'DEMO-INTERVENTION-002',
    threatType: 'financial_solicitation',
    compositeScore: 86,
    interventionLevel: InterventionLevel.InteractionRestriction,
    status: 'active',
  },
  {
    interventionId: 'DEMO-INTERVENTION-003',
    threatType: 'templated_messaging',
    compositeScore: 77,
    interventionLevel: InterventionLevel.Friction,
    status: 'monitoring',
  },
  {
    interventionId: 'DEMO-INTERVENTION-004',
    threatType: 'rapid_escalation',
    compositeScore: 66,
    interventionLevel: InterventionLevel.SafetyPrompt,
    status: 'monitoring',
  },
];

export const DEMO_AUDIT_LOGS: AuditLogEntry[] = [
  {
    interventionId: 'DEMO-INTERVENTION-001',
    timestamp: isoAgo(minute(4)),
    interventionLevel: InterventionLevel.NetworkDisruption,
    interventionType: 'network_disruption',
    targetAccounts: [
      'DEMO-ACCOUNT-001',
      'DEMO-ACCOUNT-002',
      'DEMO-ACCOUNT-003',
    ],
    triggeringScore: 96,
    actionTaken:
      'Linked demo accounts temporarily restricted; evidence queued for human review',
    outcome: 'pending_review',
    humanReviewRequired: true,
  },
  {
    interventionId: 'DEMO-INTERVENTION-002',
    timestamp: isoAgo(minute(11)),
    interventionLevel: InterventionLevel.InteractionRestriction,
    interventionType: 'interaction_restriction',
    targetAccounts: ['DEMO-ACCOUNT-004'],
    triggeringScore: 86,
    actionTaken:
      'Outbound interactions temporarily restricted pending analyst decision',
    outcome: 'pending_review',
    humanReviewRequired: true,
  },
  {
    interventionId: 'DEMO-INTERVENTION-003',
    timestamp: isoAgo(minute(22)),
    interventionLevel: InterventionLevel.Friction,
    interventionType: 'friction',
    targetAccounts: ['DEMO-ACCOUNT-005'],
    triggeringScore: 77,
    actionTaken: 'Additional verification step requested',
    outcome: 'active',
    humanReviewRequired: false,
  },
];

export const DEMO_APPEALS: AppealRecord[] = [
  {
    appealId: 'DEMO-APPEAL-001',
    userId: 'DEMO-USER-001',
    interventionId: 'DEMO-INTERVENTION-002',
    submittedAt: isoAgo(hour(2)),
    acknowledgedAt: isoAgo(hour(1.9)),
    status: AppealStatus.InReview,
    resolution: null,
    resolvedAt: null,
    resolvedBy: null,
    originalEvidencePackageId: 'DEMO-EVIDENCE-001',
    slaDeadline: new Date(Date.now() + hour(22)).toISOString(),
    ttl: Math.floor((Date.now() + day(2)) / 1000),
  },
  {
    appealId: 'DEMO-APPEAL-002',
    userId: 'DEMO-USER-002',
    interventionId: 'DEMO-INTERVENTION-003',
    submittedAt: isoAgo(hour(18)),
    acknowledgedAt: isoAgo(hour(17.9)),
    status: AppealStatus.Resolved,
    resolution: AppealResolution.Reversed,
    resolvedAt: isoAgo(hour(14)),
    resolvedBy: 'DEMO-REVIEWER-001',
    originalEvidencePackageId: 'DEMO-EVIDENCE-002',
    slaDeadline: isoAgo(hour(6)),
    ttl: Math.floor((Date.now() + day(1)) / 1000),
  },
];

export const DEMO_SAFETY_SESSIONS: SafetySession[] = [
  {
    sessionId: 'DEMO-SAFETY-SESSION-001',
    userId: 'DEMO-USER-010',
    contactId: 'DEMO-CONTACT-010',
    contactRiskSummary: {
      compositeScore: 8,
      flaggedSignals: [],
    },
    meetingLocation: {
      label: 'Verified public meeting point',
      verified: true,
      locationRef: 'DEMO-LOCATION-REF-001',
    },
    status: SafetySessionStatus.Active,
    checkIns: [
      {
        promptedAt: isoAgo(minute(30)),
        respondedAt: isoAgo(minute(29)),
        response: CheckInResponse.Ok,
      },
    ],
    missedConsecutiveCheckIns: 0,
    emergencyContactRefs: ['DEMO-CONTACT-REF-001'],
    lastKnownLocationRef: 'DEMO-LOCATION-REF-001',
    startedAt: isoAgo(hour(1)),
    ttl: Math.floor((Date.now() + hour(4)) / 1000),
  },
  {
    sessionId: 'DEMO-SAFETY-SESSION-002',
    userId: 'DEMO-USER-011',
    contactId: 'DEMO-CONTACT-011',
    contactRiskSummary: {
      compositeScore: 54,
      flaggedSignals: [
        {
          signalType: 'connection_anomaly',
          severity: SignalSeverity.Medium,
          details: { source: 'synthetic_demo' },
          timestamp: isoAgo(day(1)),
        },
      ],
    },
    meetingLocation: {
      label: 'Unverified public meeting point',
      verified: false,
      locationRef: 'DEMO-LOCATION-REF-002',
    },
    status: SafetySessionStatus.Escalated,
    checkIns: [
      {
        promptedAt: isoAgo(minute(25)),
        respondedAt: null,
        response: null,
      },
      {
        promptedAt: isoAgo(minute(10)),
        respondedAt: null,
        response: null,
      },
    ],
    missedConsecutiveCheckIns: 2,
    emergencyContactRefs: ['DEMO-CONTACT-REF-002'],
    lastKnownLocationRef: 'DEMO-LOCATION-REF-002',
    startedAt: isoAgo(hour(1.5)),
    ttl: Math.floor((Date.now() + hour(3)) / 1000),
  },
];

export const DEMO_INCIDENTS: IncidentReport[] = [
  {
    reportId: 'DEMO-INCIDENT-001',
    sessionId: 'DEMO-SESSION-020',
    userId: 'DEMO-USER-020',
    incidentType: 'fraud',
    timestamp: isoAgo(minute(18)),
  },
  {
    reportId: 'DEMO-INCIDENT-002',
    sessionId: 'DEMO-SESSION-021',
    userId: 'DEMO-USER-021',
    incidentType: 'harassment',
    timestamp: isoAgo(hour(2)),
  },
];

export const DEMO_GRAPH_VERTICES: GraphVertex[] = [
  {
    id: 'DEMO-ACCOUNT-001',
    type: 'account',
    properties: { label: 'Synthetic account A', riskScore: 96, flagged: true },
  },
  {
    id: 'DEMO-ACCOUNT-002',
    type: 'account',
    properties: { label: 'Synthetic account B', riskScore: 89, flagged: true },
  },
  {
    id: 'DEMO-DEVICE-TOKEN-001',
    type: 'device_token',
    properties: { token: 'DEMO-DEVICE-REF-001' },
  },
  {
    id: 'DEMO-NETWORK-TOKEN-001',
    type: 'network_token',
    properties: { token: 'DEMO-NETWORK-REF-001' },
  },
  {
    id: 'DEMO-CONTENT-HASH-001',
    type: 'content_hash',
    properties: { hash: 'DEMO-CONTENT-REF-001', reusedCount: 3 },
  },
];

export const DEMO_GRAPH_EDGES: GraphEdge[] = [
  {
    source: 'DEMO-ACCOUNT-001',
    target: 'DEMO-DEVICE-TOKEN-001',
    label: 'uses_device_token',
    properties: { confidence: 0.97 },
  },
  {
    source: 'DEMO-ACCOUNT-002',
    target: 'DEMO-DEVICE-TOKEN-001',
    label: 'uses_device_token',
    properties: { confidence: 0.92 },
  },
  {
    source: 'DEMO-ACCOUNT-001',
    target: 'DEMO-NETWORK-TOKEN-001',
    label: 'uses_network_token',
    properties: { confidence: 0.88 },
  },
  {
    source: 'DEMO-ACCOUNT-002',
    target: 'DEMO-CONTENT-HASH-001',
    label: 'uses_content_hash',
    properties: { confidence: 0.9 },
  },
];

export const DEMO_EVIDENCE: EvidencePackage = {
  packageId: 'DEMO-EVIDENCE-001',
  caseId: 'DEMO-CASE-001',
  createdAt: isoAgo(minute(4)),
  targetAccounts: ['DEMO-ACCOUNT-001', 'DEMO-ACCOUNT-002'],
  interventionLevel: InterventionLevel.NetworkDisruption,
  compositeScoreAtIntervention: 96,
  signalBreakdown: {
    visual: {
      score: 82,
      signals: [
        {
          signalType: 'content_reuse',
          severity: SignalSeverity.High,
          details: { source: 'synthetic_demo' },
          timestamp: isoAgo(hour(1)),
        },
      ],
    },
    textual: {
      score: 91,
      signals: [
        {
          signalType: 'templated_messaging',
          severity: SignalSeverity.High,
          details: { source: 'synthetic_demo' },
          timestamp: isoAgo(minute(50)),
        },
      ],
    },
    behavioral: {
      score: 95,
      signals: [
        {
          signalType: 'connection_anomaly',
          severity: SignalSeverity.Critical,
          details: { source: 'synthetic_demo' },
          timestamp: isoAgo(minute(40)),
        },
      ],
    },
    temporal: {
      score: 70,
      signals: [
        {
          signalType: 'rapid_escalation',
          severity: SignalSeverity.Medium,
          details: { source: 'synthetic_demo' },
          timestamp: isoAgo(minute(30)),
        },
      ],
    },
  },
  conversationHistory: [
    {
      messageId: 'DEMO-MESSAGE-001',
      senderId: 'DEMO-ACCOUNT-001',
      content: '[Synthetic message content intentionally redacted]',
      timestamp: isoAgo(minute(20)),
    },
    {
      messageId: 'DEMO-MESSAGE-002',
      senderId: 'DEMO-USER-030',
      content: '[Synthetic reply intentionally redacted]',
      timestamp: isoAgo(minute(19)),
    },
  ],
  photoMetadata: [
    {
      contentRef: 'DEMO-CONTENT-REF-001',
      analysis: 'synthetic_only',
    },
  ],
  behavioralTimeline: [
    {
      event: 'connection_velocity_anomaly',
      count: 1,
      timestamp: isoAgo(hour(2)),
    },
    {
      event: 'template_reuse_detected',
      count: 3,
      timestamp: isoAgo(hour(1)),
    },
  ],
  crossReferences: [
    {
      type: 'device_token',
      value: 'DEMO-DEVICE-REF-001',
      linkedAccounts: ['DEMO-ACCOUNT-001', 'DEMO-ACCOUNT-002'],
    },
    {
      type: 'network_token',
      value: 'DEMO-NETWORK-REF-001',
      linkedAccounts: ['DEMO-ACCOUNT-001'],
    },
  ],
  networkGraph: {
    nodes: DEMO_GRAPH_VERTICES.map((vertex) => ({
      id: vertex.id,
      type: vertex.type,
    })),
    edges: DEMO_GRAPH_EDGES.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
  },
  chainOfCustody: {
    createdBy: 'DEMO-EVIDENCE-ASSEMBLER',
    createdAt: isoAgo(minute(4)),
    checksumSHA256:
      '0000000000000000000000000000000000000000000000000000000000000000',
    s3ObjectLockRetainUntil: new Date(Date.now() + day(30)).toISOString(),
  },
  aiResponseDrafts: [
    {
      draftId: 'DEMO-DRAFT-001',
      type: 'user_notice',
      content:
        'A synthetic safety event was detected. Review the evidence before taking any irreversible action.',
    },
  ],
};

let simulationCounter = 0;
let lastThreatUpdate = Date.now();
let lastAuditUpdate = Date.now();
let lastIncidentUpdate = Date.now();
let lastGraphUpdate = Date.now();
let lastEvidenceUpdate = Date.now();

let liveInterventions = [...DEMO_INTERVENTIONS];
let liveAuditLogs = [...DEMO_AUDIT_LOGS];
let liveAppeals = [...DEMO_APPEALS];
let liveSafetySessions = [...DEMO_SAFETY_SESSIONS];
let liveIncidents = [...DEMO_INCIDENTS];
let liveVertices = [...DEMO_GRAPH_VERTICES];
let liveEdges = [...DEMO_GRAPH_EDGES];
let liveEvidence = { ...DEMO_EVIDENCE };

export function getLiveInterventions(): ActiveIntervention[] {
  if (Date.now() - lastThreatUpdate > 5_000) {
    simulationCounter += 1;
    liveInterventions = [
      {
        interventionId: `DEMO-LIVE-INTERVENTION-${simulationCounter}`,
        threatType: 'synthetic_risk_signal',
        compositeScore: 64,
        interventionLevel: InterventionLevel.SafetyPrompt,
        status: 'monitoring',
      },
      ...liveInterventions,
    ].slice(0, 12);
    lastThreatUpdate = Date.now();
  }
  return [...liveInterventions];
}

export function getLiveAuditLogs(): AuditLogEntry[] {
  if (Date.now() - lastAuditUpdate > 5_000) {
    simulationCounter += 1;
    liveAuditLogs = [
      {
        interventionId: `DEMO-LIVE-INTERVENTION-${simulationCounter}`,
        timestamp: new Date().toISOString(),
        interventionLevel: InterventionLevel.SafetyPrompt,
        interventionType: 'safety_prompt',
        targetAccounts: [`DEMO-ACCOUNT-LIVE-${simulationCounter}`],
        triggeringScore: 64,
        actionTaken: 'Synthetic safety prompt queued',
        outcome: 'monitoring',
        humanReviewRequired: false,
      },
      ...liveAuditLogs,
    ].slice(0, 20);
    lastAuditUpdate = Date.now();
  }
  return [...liveAuditLogs];
}

export function getLiveAppeals(): AppealRecord[] {
  return liveAppeals.map((appeal) => ({ ...appeal }));
}

export function getLiveSafetySessions(): SafetySession[] {
  return liveSafetySessions.map((session) => ({
    ...session,
    checkIns: [...session.checkIns],
  }));
}

export function getLiveIncidents(): IncidentReport[] {
  if (Date.now() - lastIncidentUpdate > 7_000) {
    simulationCounter += 1;
    liveIncidents = [
      {
        reportId: `DEMO-LIVE-INCIDENT-${simulationCounter}`,
        sessionId: `DEMO-LIVE-SESSION-${simulationCounter}`,
        userId: `DEMO-LIVE-USER-${simulationCounter}`,
        incidentType: 'fraud' as const,
        timestamp: new Date().toISOString(),
      },
      ...liveIncidents,
    ].slice(0, 12);
    lastIncidentUpdate = Date.now();
  }
  return [...liveIncidents];
}

export function getLiveGraphVertices(): GraphVertex[] {
  if (Date.now() - lastGraphUpdate > 6_000) {
    simulationCounter += 1;
    const accountId = `DEMO-LIVE-ACCOUNT-${simulationCounter}`;
    liveVertices = [
      {
        id: accountId,
        type: 'account',
        properties: {
          label: `Synthetic account ${simulationCounter}`,
          riskScore: 61,
          flagged: true,
        },
      },
      ...liveVertices,
    ].slice(0, 16);
    liveEdges = [
      {
        source: accountId,
        target: 'DEMO-DEVICE-TOKEN-001',
        label: 'uses_device_token',
        properties: { confidence: 0.7 },
      },
      ...liveEdges,
    ].slice(0, 20);
    lastGraphUpdate = Date.now();
  }
  return liveVertices.map((vertex) => ({
    ...vertex,
    properties: { ...vertex.properties },
  }));
}

export function getLiveGraphEdges(): GraphEdge[] {
  return liveEdges.map((edge) => ({
    ...edge,
    properties: { ...edge.properties },
  }));
}

export function getLiveEvidence(): EvidencePackage {
  if (Date.now() - lastEvidenceUpdate > 8_000) {
    simulationCounter += 1;
    liveEvidence = {
      ...liveEvidence,
      behavioralTimeline: [
        ...liveEvidence.behavioralTimeline,
        {
          event: 'synthetic_signal_added',
          count: simulationCounter,
          timestamp: new Date().toISOString(),
        },
      ].slice(-8),
    };
    lastEvidenceUpdate = Date.now();
  }

  return {
    ...liveEvidence,
    conversationHistory: [...liveEvidence.conversationHistory],
    behavioralTimeline: [...liveEvidence.behavioralTimeline],
    crossReferences: [...liveEvidence.crossReferences],
    networkGraph: {
      nodes: [...liveEvidence.networkGraph.nodes],
      edges: [...liveEvidence.networkGraph.edges],
    },
  };
}
