import { describe, it, expect, vi } from 'vitest';
import { ThreatCategory } from '@safeguard-sentinel/shared';
import {
  selectPromptCategory,
  getPromptMessage,
  injectSafetyPrompt,
  type InjectSafetyPromptDeps,
} from './inject-safety-prompt';

// ---------------------------------------------------------------------------
// selectPromptCategory
// ---------------------------------------------------------------------------

describe('selectPromptCategory', () => {
  it('returns the first matching ThreatCategory from threat signals', () => {
    expect(selectPromptCategory(['relationship_scam'])).toBe(ThreatCategory.RelationshipScam);
    expect(selectPromptCategory(['financial_solicitation'])).toBe(ThreatCategory.FinancialSolicitation);
    expect(selectPromptCategory(['coercion'])).toBe(ThreatCategory.Coercion);
  });

  it('returns null when no signals match a ThreatCategory', () => {
    expect(selectPromptCategory([])).toBeNull();
    expect(selectPromptCategory(['unknown_signal'])).toBeNull();
  });

  it('returns the first matching category when multiple signals present', () => {
    const result = selectPromptCategory(['unknown', 'coercion', 'relationship_scam']);
    expect(result).toBe(ThreatCategory.Coercion);
  });
});

// ---------------------------------------------------------------------------
// getPromptMessage
// ---------------------------------------------------------------------------

describe('getPromptMessage', () => {
  it('returns a category-specific prompt for each ThreatCategory', () => {
    for (const category of Object.values(ThreatCategory)) {
      const message = getPromptMessage(category);
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('returns a default prompt when category is null', () => {
    const message = getPromptMessage(null);
    expect(message).toContain('Stay safe');
  });
});

// ---------------------------------------------------------------------------
// injectSafetyPrompt
// ---------------------------------------------------------------------------

describe('injectSafetyPrompt', () => {
  function makeDeps(): InjectSafetyPromptDeps {
    return {
      webSocket: { sendMessage: vi.fn().mockResolvedValue(undefined) },
    };
  }

  it('sends a prompt via WebSocket for a known threat signal', async () => {
    const deps = makeDeps();
    await injectSafetyPrompt('user-1', 'session-1', ['relationship_scam'], deps);

    expect(deps.webSocket.sendMessage).toHaveBeenCalledTimes(1);
    expect(deps.webSocket.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      expect.stringContaining('money'),
    );
  });

  it('sends a default prompt when no threat signal matches', async () => {
    const deps = makeDeps();
    await injectSafetyPrompt('user-1', 'session-1', ['unknown'], deps);

    expect(deps.webSocket.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      expect.stringContaining('Stay safe'),
    );
  });

  it('sends a prompt for financial solicitation signals', async () => {
    const deps = makeDeps();
    await injectSafetyPrompt('user-1', 'session-1', ['financial_solicitation'], deps);

    expect(deps.webSocket.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      expect.stringContaining('financial'),
    );
  });

  it('executes autonomously without requiring approval', async () => {
    const deps = makeDeps();
    // Should complete without any approval step
    await expect(
      injectSafetyPrompt('user-1', 'session-1', ['coercion'], deps),
    ).resolves.toBeUndefined();
  });
});
