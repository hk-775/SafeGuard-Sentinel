import { describe, it, expect, vi } from 'vitest';
import { InterventionType } from '@safeguard-sentinel/shared';
import {
  buildNotificationMessage,
  isNotificationSafe,
  notifyUser,
  type NotifyUserDeps,
} from './notify-user';

// ---------------------------------------------------------------------------
// buildNotificationMessage
// ---------------------------------------------------------------------------

describe('buildNotificationMessage', () => {
  it('includes the action description for each intervention type', () => {
    for (const type of Object.values(InterventionType)) {
      const msg = buildNotificationMessage(type, 'test_reason');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('includes the reason category', () => {
    const msg = buildNotificationMessage(InterventionType.Friction, 'verification_required');
    expect(msg).toContain('verification_required');
  });

  it('includes appeal instructions', () => {
    const msg = buildNotificationMessage(InterventionType.SafetyPrompt, 'safety_concern');
    expect(msg.toLowerCase()).toContain('appeal');
  });

  it('does NOT contain detection methods or scores', () => {
    for (const type of Object.values(InterventionType)) {
      const msg = buildNotificationMessage(type, 'some_reason');
      expect(isNotificationSafe(msg)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// isNotificationSafe
// ---------------------------------------------------------------------------

describe('isNotificationSafe', () => {
  it('returns true for clean messages', () => {
    expect(isNotificationSafe('Your account has been restricted.')).toBe(true);
  });

  it('returns false when message contains confidence score', () => {
    expect(isNotificationSafe('Your confidence score was 85%')).toBe(false);
  });

  it('returns false when message contains signal weight', () => {
    expect(isNotificationSafe('Based on signal weight analysis')).toBe(false);
  });

  it('returns false when message contains detection method', () => {
    expect(isNotificationSafe('Our detection method flagged your account')).toBe(false);
  });

  it('returns false when message contains composite score', () => {
    expect(isNotificationSafe('Composite score exceeded threshold')).toBe(false);
  });

  it('returns false when message contains domain scores', () => {
    expect(isNotificationSafe('Your visual score was high')).toBe(false);
    expect(isNotificationSafe('Textual score analysis')).toBe(false);
    expect(isNotificationSafe('Behavioral score flagged')).toBe(false);
    expect(isNotificationSafe('Temporal score elevated')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notifyUser
// ---------------------------------------------------------------------------

describe('notifyUser', () => {
  function makeDeps(): NotifyUserDeps {
    return { sns: { publish: vi.fn().mockResolvedValue(undefined) } };
  }

  it('publishes a notification via SNS', async () => {
    const deps = makeDeps();
    await notifyUser('user-1', InterventionType.Friction, 'verification_required', deps);

    expect(deps.sns.publish).toHaveBeenCalledTimes(1);
    expect(deps.sns.publish).toHaveBeenCalledWith('user-1', expect.any(String));
  });

  it('notification contains action description, reason, and appeal instructions', async () => {
    const deps = makeDeps();
    await notifyUser('user-1', InterventionType.InteractionRestriction, 'account_restricted', deps);

    const message = (deps.sns.publish as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(message).toContain('restricted');
    expect(message).toContain('account_restricted');
    expect(message.toLowerCase()).toContain('appeal');
  });

  it('works for all intervention types', async () => {
    for (const type of Object.values(InterventionType)) {
      const deps = makeDeps();
      await expect(notifyUser('user-1', type, 'reason', deps)).resolves.toBeUndefined();
    }
  });
});
