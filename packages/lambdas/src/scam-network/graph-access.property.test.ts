// Feature: safeguard-sentinel, Property 17: Scam Network Financial Indicator Detection

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import type { SharesWalletEdge } from '@safeguard-sentinel/shared';
import type { ScamNetworkDeps, ScamNetworkNeptuneClient } from './types';
import { addSharesWalletEdge } from './graph-access';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(overrides: Partial<ScamNetworkNeptuneClient> = {}): ScamNetworkDeps {
  return {
    neptune: {
      addAccountVertex: vi.fn().mockResolvedValue(undefined),
      addPhotoVertex: vi.fn().mockResolvedValue(undefined),
      addWalletAddressVertex: vi.fn().mockResolvedValue(undefined),
      addMessageTemplateVertex: vi.fn().mockResolvedValue(undefined),
      addUsesPhotoEdge: vi.fn().mockResolvedValue(undefined),
      addSharesWalletEdge: vi.fn().mockResolvedValue(undefined),
      addSendsTemplateEdge: vi.fn().mockResolvedValue(undefined),
      addCorrelatedWithEdge: vi.fn().mockResolvedValue(undefined),
      addSameDeviceEdge: vi.fn().mockResolvedValue(undefined),
      getAccountVertex: vi.fn().mockResolvedValue(null),
      getEdgesForAccount: vi.fn().mockResolvedValue([]),
      getCorrelatedAccounts: vi.fn().mockResolvedValue([]),
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a non-empty account ID string. */
const arbAccountId = fc.stringMatching(/^acc-[a-z0-9]{1,20}$/);

/** Generates a cryptocurrency wallet address (Bitcoin-like or Ethereum-like). */
const arbWalletAddress = fc.oneof(
  // Bitcoin-style addresses (1 or 3 prefix, 25-34 alphanumeric chars)
  fc.stringMatching(/^[13][a-km-zA-HJ-NP-Z1-9]{24,33}$/),
  // Ethereum-style addresses (0x prefix + 40 hex chars)
  fc.stringMatching(/^0x[0-9a-fA-F]{40}$/),
);

/** Generates an ISO-8601 timestamp string. */
const arbTimestamp = fc.date({
  min: new Date('2020-01-01T00:00:00Z'),
  max: new Date('2030-12-31T23:59:59Z'),
}).map((d) => d.toISOString());

// ---------------------------------------------------------------------------
// Property 17: Scam Network Financial Indicator Detection
// ---------------------------------------------------------------------------

describe('Property 17: Scam Network Financial Indicator Detection', () => {
  // **Validates: Requirements 10.3**

  it('should record SHARES_WALLET edges for accounts sharing crypto wallet addresses', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAccountId,
        arbWalletAddress,
        arbTimestamp,
        async (accountId, walletAddress, detectedAt) => {
          const deps = makeDeps();

          const edge: SharesWalletEdge = {
            label: 'SHARES_WALLET',
            from: accountId,
            to: walletAddress,
            detectedAt,
          };

          await addSharesWalletEdge(edge, deps);

          // Verify the edge was recorded via the Neptune client
          expect(deps.neptune.addSharesWalletEdge).toHaveBeenCalledOnce();
          expect(deps.neptune.addSharesWalletEdge).toHaveBeenCalledWith(edge);

          // Verify the edge has the correct label
          const calledWith = vi.mocked(deps.neptune.addSharesWalletEdge).mock.calls[0][0];
          expect(calledWith.label).toBe('SHARES_WALLET');
          expect(calledWith.from).toBe(accountId);
          expect(calledWith.to).toBe(walletAddress);
          expect(calledWith.detectedAt).toBe(detectedAt);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should record SHARES_WALLET edges for multiple accounts sharing the same wallet', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbAccountId, { minLength: 2, maxLength: 10 }),
        arbWalletAddress,
        arbTimestamp,
        async (accountIds, sharedWallet, detectedAt) => {
          const deps = makeDeps();

          // Each account sharing the same wallet creates a SHARES_WALLET edge
          for (const accountId of accountIds) {
            const edge: SharesWalletEdge = {
              label: 'SHARES_WALLET',
              from: accountId,
              to: sharedWallet,
              detectedAt,
            };
            await addSharesWalletEdge(edge, deps);
          }

          // Verify all edges were recorded
          expect(deps.neptune.addSharesWalletEdge).toHaveBeenCalledTimes(accountIds.length);

          // Verify each edge points to the shared wallet with correct label
          const calls = vi.mocked(deps.neptune.addSharesWalletEdge).mock.calls;
          for (let i = 0; i < accountIds.length; i++) {
            const recorded = calls[i][0];
            expect(recorded.label).toBe('SHARES_WALLET');
            expect(recorded.from).toBe(accountIds[i]);
            expect(recorded.to).toBe(sharedWallet);
            expect(recorded.detectedAt).toBe(detectedAt);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should preserve the detectedAt timestamp for financial indicator edges', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAccountId,
        arbWalletAddress,
        arbTimestamp,
        async (accountId, walletAddress, detectedAt) => {
          const deps = makeDeps();

          const edge: SharesWalletEdge = {
            label: 'SHARES_WALLET',
            from: accountId,
            to: walletAddress,
            detectedAt,
          };

          await addSharesWalletEdge(edge, deps);

          const calledWith = vi.mocked(deps.neptune.addSharesWalletEdge).mock.calls[0][0];

          // The detectedAt timestamp must be preserved exactly
          expect(calledWith.detectedAt).toBe(detectedAt);
          // Verify it's a valid ISO-8601 string
          expect(new Date(calledWith.detectedAt).toISOString()).toBe(detectedAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});
