import type { ConversationMessage } from '../types';

/**
 * Pure function that takes an array of ConversationMessages and returns
 * them sorted by timestamp ascending.
 */
export function sortConversation(messages: ConversationMessage[]): ConversationMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
