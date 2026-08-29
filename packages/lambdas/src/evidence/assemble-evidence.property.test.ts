// Feature: safeguard-sentinel, Property 18: Evidence Package Completeness

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { InterventionLevel } from '@safeguard-sentinel/shared';
import { assembleEvidencePackage } from './assemble-evidence';
import type { AssembleEvidenceDeps } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbInterventionLevel = fc.constantFrom(
  InterventionLevel.None,
  InterventionLevel.SafetyPrompt,
  InterventionLevel.Friction,
  InterventionLevel.InteractionRestriction,
  InterventionLevel.NetworkDisruption,
);

const arbSessionId = fc.uuid();
const arbUserId = fc.uuid();
const arbTargetAccounts = fc.array(fc.uuid(), { minLength: 1, maxLength: 5 });

const arbScore = fc.integer({ min: 0, max: 100 });

const arbConversationMessage = fc.record({
  messageId: fc.uuid(),
  senderId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  timestamp: fc.constant('2024-01-01T00:00:00Z'),
});

const arbPhotoMetadata = fc.record({ photoId: fc.uuid() });
const arbTimelineEntry = fc.record({ event: fc.string(), ts: fc.constant('2024-01-01T00:00:00Z') });
const arbCrossRef = fc.record({ refId: fc.uuid() });
const arbNode = fc.record({ id: fc.uuid() });
const arbEdge = fc.record({ from: fc.uuid(), to: fc.uuid() });
const arbDraft = fc.record({ draftId: fc.uuid(), text: fc.string() });

// ---------------------------------------------------------------------------
// Helper: build mock deps from generated data
// ---------------------------------------------------------------------------

function makeDeps(opts: {
  conversationHistory: { messageId: string; senderId: string; content: string; timestamp: string }[];
  photoMetadata: Record<string, unknown>[];
  behavioralTimeline: Record<string, unknown>[];
  crossReferences: Record<string, unknown>[];
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  aiResponseDrafts: Record<string, unknown>[];
  compositeScore: number;
  visualScore: number;
  textualScore: number;
  behavioralScore: number;
  temporalScore: number;
}): AssembleEvidenceDeps {
  return {
    conversationHistory: { getHistory: vi.fn().mockResolvedValue(opts.conversationHistory) },
    photoMetadata: { getMetadata: vi.fn().mockResolvedValue(opts.photoMetadata) },
    behavioralTimeline: { getTimeline: vi.fn().mockResolvedValue(opts.behavioralTimeline) },
    crossReference: { getCrossReferences: vi.fn().mockResolvedValue(opts.crossReferences) },
    networkGraph: {
      getNetworkGraph: vi.fn().mockResolvedValue({ nodes: opts.nodes, edges: opts.edges }),
    },
    aiResponseDraft: { getDrafts: vi.fn().mockResolvedValue(opts.aiResponseDrafts) },
    threatScore: {
      getScoreRecord: vi.fn().mockResolvedValue({
        compositeScore: opts.compositeScore,
        visualScore: opts.visualScore,
        textualScore: opts.textualScore,
        behavioralScore: opts.behavioralScore,
        temporalScore: opts.temporalScore,
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Property 18: Evidence Package Completeness
// ---------------------------------------------------------------------------

describe('Property 18: Evidence Package Completeness', () => {
  // **Validates: Requirements 12.2, 13.5, 14.1, 14.2**

  it('assembled evidence package always contains all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSessionId,
        arbUserId,
        arbTargetAccounts,
        arbInterventionLevel,
        fc.array(arbConversationMessage, { minLength: 0, maxLength: 5 }),
        fc.array(arbPhotoMetadata, { minLength: 0, maxLength: 5 }),
        fc.array(arbTimelineEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbCrossRef, { minLength: 0, maxLength: 5 }),
        fc.array(arbNode, { minLength: 0, maxLength: 5 }),
        fc.array(arbEdge, { minLength: 0, maxLength: 5 }),
        fc.array(arbDraft, { minLength: 0, maxLength: 5 }),
        arbScore,
        arbScore,
        arbScore,
        arbScore,
        arbScore,
        async (
          sessionId,
          userId,
          targetAccounts,
          interventionLevel,
          convHistory,
          photoMeta,
          timeline,
          crossRefs,
          nodes,
          edges,
          drafts,
          compositeScore,
          visualScore,
          textualScore,
          behavioralScore,
          temporalScore,
        ) => {
          const deps = makeDeps({
            conversationHistory: convHistory,
            photoMetadata: photoMeta,
            behavioralTimeline: timeline,
            crossReferences: crossRefs,
            nodes,
            edges,
            aiResponseDrafts: drafts,
            compositeScore,
            visualScore,
            textualScore,
            behavioralScore,
            temporalScore,
          });

          const pkg = await assembleEvidencePackage(
            sessionId,
            userId,
            targetAccounts,
            interventionLevel,
            deps,
          );

          // --- Required top-level fields ---
          expect(pkg.packageId).toMatch(UUID_REGEX);
          expect(pkg.caseId).toMatch(UUID_REGEX);
          expect(pkg.createdAt).toMatch(ISO8601_REGEX);
          expect(pkg.targetAccounts).toEqual(targetAccounts);
          expect(pkg.interventionLevel).toBe(interventionLevel);
          expect(typeof pkg.compositeScoreAtIntervention).toBe('number');

          // --- Signal breakdown with all 4 domains ---
          expect(pkg.signalBreakdown).toBeDefined();
          expect(pkg.signalBreakdown.visual).toBeDefined();
          expect(typeof pkg.signalBreakdown.visual.score).toBe('number');
          expect(pkg.signalBreakdown.textual).toBeDefined();
          expect(typeof pkg.signalBreakdown.textual.score).toBe('number');
          expect(pkg.signalBreakdown.behavioral).toBeDefined();
          expect(typeof pkg.signalBreakdown.behavioral.score).toBe('number');
          expect(pkg.signalBreakdown.temporal).toBeDefined();
          expect(typeof pkg.signalBreakdown.temporal.score).toBe('number');

          // --- Data collection arrays ---
          expect(Array.isArray(pkg.conversationHistory)).toBe(true);
          expect(Array.isArray(pkg.photoMetadata)).toBe(true);
          expect(Array.isArray(pkg.behavioralTimeline)).toBe(true);
          expect(Array.isArray(pkg.crossReferences)).toBe(true);
          expect(Array.isArray(pkg.aiResponseDrafts)).toBe(true);

          // --- Network graph with nodes and edges ---
          expect(pkg.networkGraph).toBeDefined();
          expect(Array.isArray(pkg.networkGraph.nodes)).toBe(true);
          expect(Array.isArray(pkg.networkGraph.edges)).toBe(true);

          // --- Chain of custody ---
          expect(pkg.chainOfCustody).toBeDefined();
          expect(typeof pkg.chainOfCustody.createdBy).toBe('string');
          expect(pkg.chainOfCustody.createdAt).toMatch(ISO8601_REGEX);
          expect(pkg.chainOfCustody.checksumSHA256).toMatch(/^[0-9a-f]{64}$/);
          expect(pkg.chainOfCustody.s3ObjectLockRetainUntil).toMatch(ISO8601_REGEX);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('data collected from deps matches what appears in the package', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSessionId,
        arbUserId,
        arbTargetAccounts,
        arbInterventionLevel,
        fc.array(arbConversationMessage, { minLength: 0, maxLength: 3 }),
        fc.array(arbPhotoMetadata, { minLength: 0, maxLength: 3 }),
        fc.array(arbDraft, { minLength: 0, maxLength: 3 }),
        arbScore,
        arbScore,
        arbScore,
        arbScore,
        arbScore,
        async (
          sessionId,
          userId,
          targetAccounts,
          interventionLevel,
          convHistory,
          photoMeta,
          drafts,
          compositeScore,
          visualScore,
          textualScore,
          behavioralScore,
          temporalScore,
        ) => {
          const deps = makeDeps({
            conversationHistory: convHistory,
            photoMetadata: photoMeta,
            behavioralTimeline: [],
            crossReferences: [],
            nodes: [],
            edges: [],
            aiResponseDrafts: drafts,
            compositeScore,
            visualScore,
            textualScore,
            behavioralScore,
            temporalScore,
          });

          const pkg = await assembleEvidencePackage(
            sessionId,
            userId,
            targetAccounts,
            interventionLevel,
            deps,
          );

          // Verify data passthrough from deps
          expect(pkg.conversationHistory).toEqual(convHistory);
          expect(pkg.photoMetadata).toEqual(photoMeta);
          expect(pkg.aiResponseDrafts).toEqual(drafts);
          expect(pkg.compositeScoreAtIntervention).toBe(compositeScore);
          expect(pkg.signalBreakdown.visual.score).toBe(visualScore);
          expect(pkg.signalBreakdown.textual.score).toBe(textualScore);
          expect(pkg.signalBreakdown.behavioral.score).toBe(behavioralScore);
          expect(pkg.signalBreakdown.temporal.score).toBe(temporalScore);
        },
      ),
      { numRuns: 100 },
    );
  });
});
