import { describe, it, expect, vi } from 'vitest';
import {
  deployFriction,
  DEFAULT_FRICTION_DELAY_MS,
  FRICTION_NOTIFICATION_MESSAGE,
  type DeployFrictionDeps,
} from './deploy-friction';

function makeDeps(): DeployFrictionDeps {
  return {
    messageDelay: { applyDelay: vi.fn().mockResolvedValue(undefined) },
    userNotification: { sendNotification: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('deployFriction', () => {
  it('applies a message delivery delay', async () => {
    const deps = makeDeps();
    await deployFriction('user-1', 'session-1', deps);

    expect(deps.messageDelay.applyDelay).toHaveBeenCalledWith(
      'user-1',
      'session-1',
      DEFAULT_FRICTION_DELAY_MS,
    );
  });

  it('sends a verification notification to the user', async () => {
    const deps = makeDeps();
    await deployFriction('user-1', 'session-1', deps);

    expect(deps.userNotification.sendNotification).toHaveBeenCalledWith(
      'user-1',
      FRICTION_NOTIFICATION_MESSAGE,
    );
  });

  it('notification explains verification is in progress', () => {
    expect(FRICTION_NOTIFICATION_MESSAGE.toLowerCase()).toContain('verification');
  });

  it('executes autonomously without requiring approval', async () => {
    const deps = makeDeps();
    await expect(deployFriction('user-1', 'session-1', deps)).resolves.toBeUndefined();
  });

  it('calls delay before notification', async () => {
    const callOrder: string[] = [];
    const deps: DeployFrictionDeps = {
      messageDelay: {
        applyDelay: vi.fn().mockImplementation(async () => { callOrder.push('delay'); }),
      },
      userNotification: {
        sendNotification: vi.fn().mockImplementation(async () => { callOrder.push('notify'); }),
      },
    };

    await deployFriction('user-1', 'session-1', deps);
    expect(callOrder).toEqual(['delay', 'notify']);
  });
});
