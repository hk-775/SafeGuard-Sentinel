import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createApiClient } from './client';

// Feature: safeguard-dashboard, Property 20: API client error handling returns structured errors
// **Validates: Requirements 13.3**
describe('API client error handling property tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return structured error with statusCode and message for any HTTP status >= 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1 }),
        async (statusCode, errorMessage) => {
          vi.mocked(globalThis.fetch).mockResolvedValue(
            new Response(errorMessage, { status: statusCode })
          );

          const client = createApiClient({ baseUrl: 'http://localhost' });
          const result = await client.fetchAggregateMetrics();

          expect(result.data).toBeNull();
          expect(result.error).not.toBeNull();
          expect(result.error!.statusCode).toBe(statusCode);
          expect(typeof result.error!.statusCode).toBe('number');
          expect(typeof result.error!.message).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return statusCode 0 and "Network error" message on network failure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (errorMsg) => {
        vi.mocked(globalThis.fetch).mockRejectedValue(new Error(errorMsg));

        const client = createApiClient({ baseUrl: 'http://localhost' });
        const result = await client.fetchAggregateMetrics();

        expect(result.data).toBeNull();
        expect(result.error).not.toBeNull();
        expect(result.error!.statusCode).toBe(0);
        expect(result.error!.message).toBe('Network error');
      }),
      { numRuns: 100 }
    );
  });
});
