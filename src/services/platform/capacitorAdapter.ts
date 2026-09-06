/**
 * NoteNirman 2.0 Phase 5 — Capacitor 8 Android Platform Adapter (P5.7)
 *
 * Implements platform adapter interfaces using Capacitor 8 APIs.
 * @capacitor/core@^8.3.0 and @capacitor/android@^8.3.0 are already installed.
 *
 * Optional plugin dependencies:
 * - @capacitor/filesystem (NOT YET installed)
 * - @capacitor/local-notifications (NOT YET installed)
 * - @capacitor/preferences (NOT YET installed)
 *
 * All uninstalled plugin references are stubbed with Web API fallbacks.
 * When each plugin is installed, replace the stub comment with the actual import.
 *
 * IMPORTANT: Do NOT use dynamic import() with uninstalled packages — Vite's
 * import analysis resolves dynamic imports at build time and will fail if the
 * module does not exist in node_modules.
 */

import type {
  IFilesystemAdapter,
  INotificationAdapter,
  IStorageAdapter,
  WriteFileOptions,
  ReadFileOptions,
  ReadFileResult,
  ScheduleNotificationOptions,
  CancelNotificationOptions,
  NotificationPermissionState,
} from './platformInterfaces';
import { WebFilesystemAdapter, WebNotificationAdapter, WebStorageAdapter } from './webAdapter';

// ---------------------------------------------------------------------------
// Capacitor Detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the current runtime is a Capacitor Android context.
 * Capacitor injects the `Capacitor` global at runtime on native platforms.
 */
export function isCapacitorRuntime(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Capacitor Filesystem Adapter
// ---------------------------------------------------------------------------

/**
 * Capacitor 8 filesystem adapter.
 * Uses @capacitor/filesystem when available; falls back to WebFilesystemAdapter.
 *
 * STUB: @capacitor/filesystem is not yet installed.
 * When installed, implement writeFile/readFile using Filesystem.writeFile / Filesystem.readFile
 * from '@capacitor/filesystem' and remove the webFallback delegation.
 */
export class CapacitorFilesystemAdapter implements IFilesystemAdapter {
  private _webFallback = new WebFilesystemAdapter();

  isDirectFilesystemAvailable(): boolean {
    return isCapacitorRuntime();
  }

  async writeFile(options: WriteFileOptions): Promise<void> {
    // @capacitor/filesystem not yet installed — delegate to web adapter.
    // When installed:
    // const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    // await Filesystem.writeFile({ path, data, directory: Directory.Documents, encoding: Encoding.UTF8 });
    return this._webFallback.writeFile(options);
  }

  async readFile(options: ReadFileOptions): Promise<ReadFileResult> {
    // @capacitor/filesystem not yet installed — delegate to web adapter.
    return this._webFallback.readFile(options);
  }
}

// ---------------------------------------------------------------------------
// Capacitor Notification Adapter
// ---------------------------------------------------------------------------

/**
 * Capacitor 8 local notification adapter.
 * STUB: @capacitor/local-notifications is not yet installed.
 * Falls back to WebNotificationAdapter in all contexts.
 *
 * When installed:
 * - requestPermission: LocalNotifications.requestPermissions()
 * - scheduleNotification: LocalNotifications.schedule({ notifications: [...] })
 * - cancelNotification: LocalNotifications.cancel({ notifications: [{ id: hashCode(id) }] })
 */
export class CapacitorNotificationAdapter implements INotificationAdapter {
  private _webFallback = new WebNotificationAdapter();

  isAvailable(): boolean {
    return isCapacitorRuntime() || this._webFallback.isAvailable();
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    // @capacitor/local-notifications not yet installed — use web fallback.
    return this._webFallback.requestPermission();
  }

  async scheduleNotification(options: ScheduleNotificationOptions): Promise<void> {
    // @capacitor/local-notifications not yet installed — use web fallback.
    return this._webFallback.scheduleNotification(options);
  }

  async cancelNotification(options: CancelNotificationOptions): Promise<void> {
    return this._webFallback.cancelNotification(options);
  }

  async cancelAllNotifications(): Promise<void> {
    return this._webFallback.cancelAllNotifications();
  }
}

// ---------------------------------------------------------------------------
// Capacitor Storage Adapter
// ---------------------------------------------------------------------------

/**
 * Capacitor 8 storage adapter.
 * STUB: @capacitor/preferences is not yet installed.
 * Falls back to localStorage (WebStorageAdapter) in all contexts.
 *
 * When installed:
 * - getItem: Preferences.get({ key })
 * - setItem: Preferences.set({ key, value })
 * - removeItem: Preferences.remove({ key })
 * - clear: Preferences.clear()
 */
export class CapacitorStorageAdapter extends WebStorageAdapter implements IStorageAdapter {
  // Inherits WebStorageAdapter (localStorage) as the baseline implementation.
  // When @capacitor/preferences is installed, override each method to use
  // Preferences.get/set/remove/clear from '@capacitor/preferences'.
}
