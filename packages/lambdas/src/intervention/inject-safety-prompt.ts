import { ThreatCategory } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Safety prompt content mapped to each threat category
// ---------------------------------------------------------------------------

const SAFETY_PROMPTS: Record<ThreatCategory, string> = {
  [ThreatCategory.RelationshipScam]:
    'Safety tip: Be cautious of people who profess strong feelings very quickly or ask to move conversations off-platform. Never send money to someone you haven\'t met in person.',
  [ThreatCategory.FinancialSolicitation]:
    'Safety tip: Never share financial information or send money, gift cards, or cryptocurrency to someone you\'ve met online. Legitimate connections won\'t ask for financial help.',
  [ThreatCategory.Coercion]:
    'Safety tip: A healthy connection respects your boundaries. If someone is pressuring you, making threats, or trying to isolate you from friends and family, consider ending the conversation.',
  [ThreatCategory.TemplatedMessaging]:
    'Safety tip: Be wary of messages that feel generic or scripted. Genuine connections engage in personalised conversation.',
  [ThreatCategory.VelocityAnomaly]:
    'Safety tip: Take your time getting to know someone. Rushing interactions can be a sign of inauthentic behaviour.',
  [ThreatCategory.ConnectionAnomaly]:
    'Safety tip: Pay attention to profiles that seem too good to be true or show inconsistent information.',
  [ThreatCategory.AccountClustering]:
    'Safety tip: If you notice similar profiles or repeated patterns, report them to help keep the community safe.',
  [ThreatCategory.PhotoManipulation]:
    'Safety tip: Be cautious of profiles with photos that look altered or too polished. Consider a video call to verify identity.',
  [ThreatCategory.CrossAccountMatch]:
    'Safety tip: If someone\'s photos appear on multiple profiles, they may not be who they claim. Report suspicious profiles.',
  [ThreatCategory.RapidEscalation]:
    'Safety tip: Be cautious of people who push to exchange personal contact information very quickly. Take your time.',
  [ThreatCategory.TimezoneInconsistency]:
    'Safety tip: If someone\'s claimed location doesn\'t match their activity patterns, proceed with caution.',
  [ThreatCategory.VulnerabilityWindow]:
    'Safety tip: Late-night conversations can feel more intense. Take a moment to reflect before sharing personal information.',
};

/** Default prompt used when no specific threat category matches. */
const DEFAULT_SAFETY_PROMPT =
  'Safety tip: Stay safe by never sharing personal or financial information with someone you haven\'t met in person.';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the safety prompt category tag that matches the dominant threat
 * signal. This is the pure mapping used for Property 5 validation.
 */
export function selectPromptCategory(threatSignals: string[]): ThreatCategory | null {
  for (const signal of threatSignals) {
    if (Object.values(ThreatCategory).includes(signal as ThreatCategory)) {
      return signal as ThreatCategory;
    }
  }
  return null;
}

/**
 * Returns the safety prompt message for a given threat category.
 */
export function getPromptMessage(category: ThreatCategory | null): string {
  if (category && category in SAFETY_PROMPTS) {
    return SAFETY_PROMPTS[category];
  }
  return DEFAULT_SAFETY_PROMPT;
}

// ---------------------------------------------------------------------------
// Injectable WebSocket client interface
// ---------------------------------------------------------------------------

export interface WebSocketClient {
  sendMessage(userId: string, sessionId: string, message: string): Promise<void>;
}

export interface InjectSafetyPromptDeps {
  webSocket: WebSocketClient;
}

/**
 * Level 1 intervention — injects a contextual safety prompt into the user's
 * conversation based on the dominant threat signal.
 *
 * Executes autonomously without human approval.
 */
export async function injectSafetyPrompt(
  userId: string,
  sessionId: string,
  threatSignals: string[],
  deps: InjectSafetyPromptDeps,
): Promise<void> {
  const category = selectPromptCategory(threatSignals);
  const message = getPromptMessage(category);
  await deps.webSocket.sendMessage(userId, sessionId, message);
}
