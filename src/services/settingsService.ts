import {
  getWorkspaceSettings,
  putWorkspaceSettings,
  getMeta,
  setMeta,
  type WorkspaceSettingsRow,
} from './localDb';

export interface DeviceSettings {
  deviceId: string;
  themeOverride?: 'light' | 'dark' | 'system';
  windowWidth?: number;
  windowHeight?: number;
  localCacheLimitMB?: number;
}

export interface AccountSettings {
  userId: string;
  language?: string;
  defaultFont?: string;
  aiCopilotEnabled?: boolean;
  aiCopilotTemperature?: number;
}

export interface ResolvedSettings {
  workspaceId: string;
  userId: string;
  deviceId: string;

  workspaceName: string;
  defaultBlockType: string;
  autoIndexSearch: boolean;
  defaultExportFormat: 'markdown' | 'html' | 'json' | 'pdf';
  calendarDefaultTimezone: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultFont: string;
  aiCopilotEnabled: boolean;
  aiCopilotTemperature: number;
  localCacheLimitMB: number;
}

export const DEFAULT_WORKSPACE_SETTINGS: Omit<WorkspaceSettingsRow, 'workspaceId' | 'userId'> = {
  workspaceName: 'My Workspace',
  defaultBlockType: 'paragraph',
  autoIndexSearch: true,
  defaultExportFormat: 'markdown',
  calendarDefaultTimezone: 'UTC',
  version: 1,
  updatedAt: Date.now(),
};

export const DEFAULT_ACCOUNT_SETTINGS: Omit<AccountSettings, 'userId'> = {
  language: 'en',
  defaultFont: 'Inter',
  aiCopilotEnabled: true,
  aiCopilotTemperature: 0.7,
};

export class SettingsService {
  /**
   * Get device-local settings. Never synced.
   */
  static async getDeviceSettings(deviceId: string): Promise<DeviceSettings> {
    const key = `deviceSettings:${deviceId}`;
    const stored = await getMeta<DeviceSettings>(key);
    return (
      stored || {
        deviceId,
        localCacheLimitMB: 500,
      }
    );
  }

  /**
   * Update device-local settings.
   */
  static async updateDeviceSettings(
    deviceId: string,
    updates: Partial<Omit<DeviceSettings, 'deviceId'>>
  ): Promise<DeviceSettings> {
    const current = await this.getDeviceSettings(deviceId);
    const updated: DeviceSettings = {
      ...current,
      ...updates,
      deviceId,
    };
    await setMeta(`deviceSettings:${deviceId}`, updated);
    return updated;
  }

  /**
   * Get account-level settings.
   */
  static async getAccountSettings(userId: string): Promise<AccountSettings> {
    const key = `accountSettings:${userId}`;
    const stored = await getMeta<AccountSettings>(key);
    return (
      stored || {
        userId,
        ...DEFAULT_ACCOUNT_SETTINGS,
      }
    );
  }

  /**
   * Update account-level settings.
   */
  static async updateAccountSettings(
    userId: string,
    updates: Partial<Omit<AccountSettings, 'userId'>>
  ): Promise<AccountSettings> {
    const current = await this.getAccountSettings(userId);
    const updated: AccountSettings = {
      ...current,
      ...updates,
      userId,
    };
    await setMeta(`accountSettings:${userId}`, updated);
    return updated;
  }

  /**
   * Get workspace-level settings.
   */
  static async getWorkspaceSettings(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceSettingsRow> {
    const stored = await getWorkspaceSettings(workspaceId);
    if (stored) return stored;

    const initial: WorkspaceSettingsRow = {
      workspaceId,
      userId,
      ...DEFAULT_WORKSPACE_SETTINGS,
      updatedAt: Date.now(),
    };
    await putWorkspaceSettings(initial);
    return initial;
  }

  /**
   * Update workspace-level settings.
   */
  static async updateWorkspaceSettings(
    workspaceId: string,
    userId: string,
    updates: Partial<Omit<WorkspaceSettingsRow, 'workspaceId' | 'userId' | 'version'>>
  ): Promise<WorkspaceSettingsRow> {
    const current = await this.getWorkspaceSettings(workspaceId, userId);
    const updated: WorkspaceSettingsRow = {
      ...current,
      ...updates,
      workspaceId,
      userId,
      version: current.version + 1,
      updatedAt: Date.now(),
    };
    await putWorkspaceSettings(updated);
    return updated;
  }

  /**
   * Resolves final settings according to hierarchy:
   * Device-Local > Workspace-Level > Account-Level
   */
  static async resolveSettings(
    workspaceId: string,
    userId: string,
    deviceId: string
  ): Promise<ResolvedSettings> {
    const [device, account, workspace] = await Promise.all([
      this.getDeviceSettings(deviceId),
      this.getAccountSettings(userId),
      this.getWorkspaceSettings(workspaceId, userId),
    ]);

    const theme = device.themeOverride || 'system';
    const language = account.language || DEFAULT_ACCOUNT_SETTINGS.language!;
    const defaultFont = account.defaultFont || DEFAULT_ACCOUNT_SETTINGS.defaultFont!;
    const aiCopilotEnabled =
      account.aiCopilotEnabled !== undefined
        ? account.aiCopilotEnabled
        : DEFAULT_ACCOUNT_SETTINGS.aiCopilotEnabled!;
    const aiCopilotTemperature =
      account.aiCopilotTemperature !== undefined
        ? account.aiCopilotTemperature
        : DEFAULT_ACCOUNT_SETTINGS.aiCopilotTemperature!;

    return {
      workspaceId,
      userId,
      deviceId,
      workspaceName: workspace.workspaceName,
      defaultBlockType: workspace.defaultBlockType,
      autoIndexSearch: workspace.autoIndexSearch,
      defaultExportFormat: workspace.defaultExportFormat,
      calendarDefaultTimezone: workspace.calendarDefaultTimezone,
      theme,
      language,
      defaultFont,
      aiCopilotEnabled,
      aiCopilotTemperature,
      localCacheLimitMB: device.localCacheLimitMB || 500,
    };
  }
}
