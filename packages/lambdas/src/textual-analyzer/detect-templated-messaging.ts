import type { MessageHistoryClient, MessageHistoryEntry } from './types';

/** Minimum number of recipients for a message to be flagged as templated. */
const TEMPLATE_MIN_RECIPIENTS = 3;

/** Result of templated messaging detection. */
export interface TemplatedMessagingResult {
  templateDetected: boolean;
  matchCount: number;
  contentHash: string;
}

/**
 * Simple hash function for message content.
 * Normalises whitespace and lowercases before hashing to catch near-identical messages.
 */
export function hashMessageContent(content: string): string {
  const normalised = content.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalised.length; i++) {
    const char = normalised.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detects templated messaging by hashing message content and comparing
 * against the user's recent message history.
 *
 * Flags when identical or near-identical messages are sent to 3+ distinct
 * recipients. Reports template signal with match count.
 *
 * On error returns a safe no-detection result so transient failures
 * do not block the rest of the analysis pipeline.
 */
export async function detectTemplatedMessaging(
  userId: string,
  recipientId: string,
  messageContent: string,
  timestamp: string,
  messageHistory: MessageHistoryClient,
): Promise<TemplatedMessagingResult> {
  try {
    const contentHash = hashMessageContent(messageContent);

    // Store the current message
    await messageHistory.storeMessage(userId, recipientId, contentHash, timestamp);

    // Retrieve recent messages from this user
    const recentMessages: MessageHistoryEntry[] = await messageHistory.getRecentMessagesByUser(userId);

    // Count distinct recipients who received the same content hash
    const recipientsWithSameHash = new Set(
      recentMessages
        .filter((m) => m.contentHash === contentHash)
        .map((m) => m.recipientId),
    );

    const matchCount = recipientsWithSameHash.size;

    return {
      templateDetected: matchCount >= TEMPLATE_MIN_RECIPIENTS,
      matchCount,
      contentHash,
    };
  } catch {
    return { templateDetected: false, matchCount: 0, contentHash: '' };
  }
}
