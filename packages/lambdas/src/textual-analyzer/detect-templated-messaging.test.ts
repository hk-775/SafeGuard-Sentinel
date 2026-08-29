import { describe, it, expect, vi } from 'vitest';
import { detectTemplatedMessaging, hashMessageContent } from './detect-templated-messaging';
import type { MessageHistoryClient } from './types';

function makeMessageHistory(
  recentMessages: { recipientId: string; contentHash: string; timestamp: string }[] = [],
): MessageHistoryClient {
  return {
    getRecentMessagesByUser: vi.fn().mockResolvedValue(recentMessages),
    storeMessage: vi.fn().mockResolvedValue(undefined),
  };
}

describe('hashMessageContent', () => {
  it('produces consistent hashes for the same content', () => {
    const hash1 = hashMessageContent('Hello world');
    const hash2 = hashMessageContent('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('normalises whitespace before hashing', () => {
    const hash1 = hashMessageContent('Hello   world');
    const hash2 = hashMessageContent('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('is case-insensitive', () => {
    const hash1 = hashMessageContent('Hello World');
    const hash2 = hashMessageContent('hello world');
    expect(hash1).toBe(hash2);
  });

  it('trims leading/trailing whitespace', () => {
    const hash1 = hashMessageContent('  Hello world  ');
    const hash2 = hashMessageContent('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', () => {
    const hash1 = hashMessageContent('Hello world');
    const hash2 = hashMessageContent('Goodbye world');
    expect(hash1).not.toBe(hash2);
  });
});

describe('detectTemplatedMessaging', () => {
  it('does not flag when fewer than 3 recipients', async () => {
    const contentHash = hashMessageContent('Buy my product now!');
    const history = makeMessageHistory([
      { recipientId: 'r-1', contentHash, timestamp: '2025-01-15T12:00:00Z' },
      { recipientId: 'r-2', contentHash, timestamp: '2025-01-15T12:01:00Z' },
    ]);

    const result = await detectTemplatedMessaging(
      'user-1', 'r-3', 'Buy my product now!', '2025-01-15T12:02:00Z', history,
    );

    expect(result.templateDetected).toBe(false);
    expect(result.matchCount).toBe(2);
  });

  it('flags when 3+ recipients receive the same content', async () => {
    const contentHash = hashMessageContent('Buy my product now!');
    const history = makeMessageHistory([
      { recipientId: 'r-1', contentHash, timestamp: '2025-01-15T12:00:00Z' },
      { recipientId: 'r-2', contentHash, timestamp: '2025-01-15T12:01:00Z' },
      { recipientId: 'r-3', contentHash, timestamp: '2025-01-15T12:02:00Z' },
    ]);

    const result = await detectTemplatedMessaging(
      'user-1', 'r-4', 'Buy my product now!', '2025-01-15T12:03:00Z', history,
    );

    expect(result.templateDetected).toBe(true);
    expect(result.matchCount).toBe(3);
  });

  it('stores the current message before checking history', async () => {
    const history = makeMessageHistory([]);
    await detectTemplatedMessaging(
      'user-1', 'r-1', 'Hello', '2025-01-15T12:00:00Z', history,
    );

    expect(history.storeMessage).toHaveBeenCalledWith(
      'user-1', 'r-1', expect.any(String), '2025-01-15T12:00:00Z',
    );
  });

  it('counts distinct recipients only (deduplicates)', async () => {
    const contentHash = hashMessageContent('Spam message');
    const history = makeMessageHistory([
      { recipientId: 'r-1', contentHash, timestamp: '2025-01-15T12:00:00Z' },
      { recipientId: 'r-1', contentHash, timestamp: '2025-01-15T12:01:00Z' }, // duplicate
      { recipientId: 'r-2', contentHash, timestamp: '2025-01-15T12:02:00Z' },
    ]);

    const result = await detectTemplatedMessaging(
      'user-1', 'r-3', 'Spam message', '2025-01-15T12:03:00Z', history,
    );

    expect(result.matchCount).toBe(2); // r-1 and r-2 only
    expect(result.templateDetected).toBe(false);
  });

  it('returns safe result on error', async () => {
    const history: MessageHistoryClient = {
      getRecentMessagesByUser: vi.fn().mockRejectedValue(new Error('DynamoDB error')),
      storeMessage: vi.fn().mockRejectedValue(new Error('DynamoDB error')),
    };

    const result = await detectTemplatedMessaging(
      'user-1', 'r-1', 'Hello', '2025-01-15T12:00:00Z', history,
    );

    expect(result.templateDetected).toBe(false);
    expect(result.matchCount).toBe(0);
  });
});
