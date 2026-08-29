import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sortConversation } from './ConversationTimeline';
import type { ConversationMessage } from '../types';

// Feature: safeguard-dashboard, Property 15: Conversation history is rendered chronologically with required fields
// **Validates: Requirements 9.3**

const conversationMessageArb: fc.Arbitrary<ConversationMessage> = fc.record({
  messageId: fc.uuid(),
  senderId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
});

describe('ConversationTimeline sortConversation property tests', () => {
  it('should return messages sorted by timestamp ascending', () => {
    fc.assert(
      fc.property(
        fc.array(conversationMessageArb, { minLength: 2, maxLength: 30 }),
        (messages) => {
          const sorted = sortConversation(messages);
          for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1].timestamp).getTime();
            const curr = new Date(sorted[i].timestamp).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all messages (same length)', () => {
    fc.assert(
      fc.property(
        fc.array(conversationMessageArb, { minLength: 0, maxLength: 30 }),
        (messages) => {
          const sorted = sortConversation(messages);
          expect(sorted).toHaveLength(messages.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve senderId, content, and timestamp for each message', () => {
    fc.assert(
      fc.property(
        fc.array(conversationMessageArb, { minLength: 1, maxLength: 20 }),
        (messages) => {
          const sorted = sortConversation(messages);
          for (const msg of sorted) {
            expect(msg.senderId).toBeDefined();
            expect(msg.content).toBeDefined();
            expect(msg.timestamp).toBeDefined();
          }
          // All original messages should be present
          const originalIds = new Set(messages.map((m) => m.messageId));
          const sortedIds = new Set(sorted.map((m) => m.messageId));
          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(conversationMessageArb, { minLength: 1, maxLength: 20 }),
        (messages) => {
          const original = [...messages];
          sortConversation(messages);
          expect(messages).toEqual(original);
        }
      ),
      { numRuns: 100 }
    );
  });
});
