import type { ComprehendClient, ComprehendAnalysisResult } from './types';

/** Result of financial solicitation detection. */
export interface FinancialSolicitationResult {
  financialSolicitationDetected: boolean;
  matchedPatterns: string[];
  confidence: number; // 0-1
}

// ---------------------------------------------------------------------------
// Regex patterns for financial solicitation indicators
// ---------------------------------------------------------------------------

/** Bitcoin address: starts with 1, 3, or bc1, 26-62 chars. */
const BITCOIN_REGEX = /\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,62})\b/;

/** Ethereum address: 0x followed by 40 hex chars. */
const ETHEREUM_REGEX = /\b0x[0-9a-fA-F]{40}\b/;

/** Gift card references. */
const GIFT_CARD_REGEX = /\b(gift\s*card|itunes\s*card|google\s*play\s*card|amazon\s*card|steam\s*card|apple\s*card)\b/i;

/** Wire transfer keywords. */
const WIRE_TRANSFER_REGEX = /\b(wire\s*transfer|western\s*union|moneygram|bank\s*transfer|routing\s*number|swift\s*code|iban)\b/i;

/** General crypto references. */
const CRYPTO_REGEX = /\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency|usdt|tether|wallet\s*address|send\s*to\s*my\s*wallet)\b/i;

export const FINANCIAL_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'bitcoin_address', regex: BITCOIN_REGEX },
  { name: 'ethereum_address', regex: ETHEREUM_REGEX },
  { name: 'gift_card', regex: GIFT_CARD_REGEX },
  { name: 'wire_transfer', regex: WIRE_TRANSFER_REGEX },
  { name: 'crypto_reference', regex: CRYPTO_REGEX },
];

/**
 * Detects financial solicitation patterns in message content using
 * regex pattern matching for crypto wallet addresses, gift card references,
 * and wire transfer keywords, combined with Comprehend entity analysis.
 *
 * On error returns a safe no-detection result so transient failures
 * do not block the rest of the analysis pipeline.
 */
export async function detectFinancialSolicitation(
  messageContent: string,
  comprehend: ComprehendClient,
): Promise<FinancialSolicitationResult> {
  try {
    // Phase 1: Regex pattern matching
    const regexMatches: string[] = [];
    for (const pattern of FINANCIAL_PATTERNS) {
      if (pattern.regex.test(messageContent)) {
        regexMatches.push(pattern.name);
      }
    }

    // Phase 2: Comprehend entity analysis for financial entities
    const analysis: ComprehendAnalysisResult = await comprehend.analyzeSentimentAndEntities(messageContent);
    const financialEntities = analysis.entities.filter(
      (e) => e.type === 'QUANTITY' || e.type === 'OTHER',
    );

    const allMatches = [...regexMatches];
    if (financialEntities.length > 0) {
      allMatches.push('comprehend_financial_entity');
    }

    const detected = allMatches.length > 0;
    const confidence = detected
      ? Math.min(1, (regexMatches.length * 0.3 + financialEntities.length * 0.2))
      : 0;

    return {
      financialSolicitationDetected: detected,
      matchedPatterns: allMatches,
      confidence: Math.min(1, confidence),
    };
  } catch {
    return { financialSolicitationDetected: false, matchedPatterns: [], confidence: 0 };
  }
}
