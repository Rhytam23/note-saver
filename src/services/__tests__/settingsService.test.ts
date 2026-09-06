/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const metaStore = new Map<string, unknown>();
const wsStore = new Map<string, any>();

vi.mock('../localDb', () => ({
  getMeta: vi.fn(async (key: string) => metaStore.get(key)),
  setMeta: vi.fn(async (key: string, value: unknown) => {
    metaStore.set(key, value);
  }),
  getWorkspaceSettings: vi.fn(async (workspaceId: string) => wsStore.get(workspaceId)),
  putWorkspaceSettings: vi.fn(async (settings: any) => {
    wsStore.set(settings.workspaceId, settings);
  }),
}));

import { SettingsService } from '../settingsService';

describe('Phase 5 — Three-Tier Settings & Preference System (P5.9)', () => {
  const userId = 'user_123';
  const workspaceId = 'ws_456';
  const deviceId = 'device_789';

  beforeEach(() => {
    metaStore.clear();
    wsStore.clear();
  });

  it('should return default device, account, and workspace settings when empty', async () => {
    const resolved = await SettingsService.resolveSettings(workspaceId, userId, deviceId);
    expect(resolved.workspaceId).toBe(workspaceId);
    expect(resolved.userId).toBe(userId);
    expect(resolved.deviceId).toBe(deviceId);
    expect(resolved.theme).toBe('system');
    expect(resolved.language).toBe('en');
    expect(resolved.workspaceName).toBe('My Workspace');
    expect(resolved.defaultBlockType).toBe('paragraph');
  });

  it('should respect preference precedence: Device-Local > Workspace-Level > Account-Level', async () => {
    // Set account language and font
    await SettingsService.updateAccountSettings(userId, {
      language: 'fr',
      defaultFont: 'Roboto',
    });

    // Set workspace name
    await SettingsService.updateWorkspaceSettings(workspaceId, userId, {
      workspaceName: 'Engineering Workspace',
    });

    // Set device theme override
    await SettingsService.updateDeviceSettings(deviceId, {
      themeOverride: 'dark',
    });

    const resolved = await SettingsService.resolveSettings(workspaceId, userId, deviceId);
    expect(resolved.theme).toBe('dark');
    expect(resolved.language).toBe('fr');
    expect(resolved.defaultFont).toBe('Roboto');
    expect(resolved.workspaceName).toBe('Engineering Workspace');
  });
});
