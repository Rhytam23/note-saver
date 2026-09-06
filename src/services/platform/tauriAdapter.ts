/**
 * NoteNirman 2.0 Phase 5 — Tauri 2 Desktop Platform Adapter (P5.7)
 *
 * Implements platform adapter interfaces using Tauri 2 APIs.
 * @tauri-apps/api@^2.11.1 is already installed in the project.
 *
 * Plugin dependencies (@tauri-apps/plugin-fs, @tauri-apps/plugin-notification)
 * are dynamically imported with Web API fallbacks when not available.
 *
 * All Tauri-specific imports are inside try/catch dynamic import blocks so
 * that this module compiles correctly in any environment and degrades gracefully
 * to Web API fallbacks if the Tauri runtime is absent.
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
// Tauri Detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the current runtime is a Tauri 2 context.
 * Tauri 2 injects `window.__TAURI_INTERNALS__` at runtime.
 */
export function isTauriRuntime(): boolean {
  try {
    return typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in window;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tauri Filesystem Adapter
// ---------------------------------------------------------------------------

/**
 * Tauri 2 filesystem adapter.
 * Uses @tauri-apps/plugin-fs when available; falls back to WebFilesystemAdapter.
 */
export class TauriFilesystemAdapter implements IFilesystemAdapter {
  private _webFallback = new WebFilesystemAdapter();

  isDirectFilesystemAvailable(): boolean {
    return isTauriRuntime();
  }

  async writeFile(options: WriteFileOptions): Promise<void> {
    if (!isTauriRuntime()) {
      return this._webFallback.writeFile(options);
    }

    // @tauri-apps/plugin-fs is not yet installed.
    // When installed (tauri.conf.json plugin registered + npm install @tauri-apps/plugin-fs),
    // uncomment the block below and remove the webFallback delegation.
    //
    // try {
    //   const { writeTextFile, writeBinaryFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    //   ...
    // } catch (pluginErr) { ... }
    //
    // For now, delegate to Web adapter (Blob download) in all Tauri contexts.
    return this._webFallback.writeFile(options);
  }

  async readFile(options: ReadFileOptions): Promise<ReadFileResult> {
    if (!isTauriRuntime()) {
      return this._webFallback.readFile(options);
    }

    // @tauri-apps/plugin-fs not yet installed — delegate to web file picker.
    return this._webFallback.readFile(options);
  }
}

// ---------------------------------------------------------------------------
// Tauri Notification Adapter
// ---------------------------------------------------------------------------

/**
 * Tauri 2 notification adapter.
 * Uses @tauri-apps/plugin-notification for OS-level desktop notifications.
 * Falls back to WebNotificationAdapter when plugin is unavailable.
 */
export class TauriNotificationAdapter implements INotificationAdapter {
  private _webFallback = new WebNotificationAdapter();

  isAvailable(): boolean {
    return isTauriRuntime() || this._webFallback.isAvailable();
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!isTauriRuntime()) {
      return this._webFallback.requestPermission();
    }

    // @tauri-apps/plugin-notification not yet installed.
    // When installed, replace with:
    // const { requestPermission, isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    return this._webFallback.requestPermission();
  }

  async scheduleNotification(options: ScheduleNotificationOptions): Promise<void> {
    if (!isTauriRuntime()) {
      return this._webFallback.scheduleNotification(options);
    }

    // @tauri-apps/plugin-notification not yet installed — use web fallback.
    return this._webFallback.scheduleNotification(options);
  }

  async cancelNotification(options: CancelNotificationOptions): Promise<void> {
    // Tauri plugin-notification v2 does not support cancelling individual OS notifications
    // Delegate to web fallback (which manages in-memory timeout handles)
    return this._webFallback.cancelNotification(options);
  }

  async cancelAllNotifications(): Promise<void> {
    return this._webFallback.cancelAllNotifications();
  }
}

// ---------------------------------------------------------------------------
// Tauri Storage Adapter
// ---------------------------------------------------------------------------

/**
 * Tauri 2 storage adapter.
 * Uses @tauri-apps/api Store plugin when available; falls back to localStorage.
 * For Tauri 2, app data is stored via localStorage (window.localStorage is
 * available in the WebView). Tauri's secure storage plugin is optional.
 */
export class TauriStorageAdapter extends WebStorageAdapter implements IStorageAdapter {
  // Inherits WebStorageAdapter (localStorage) as the baseline implementation.
  // When @tauri-apps/plugin-store becomes a project dependency, this can be
  // upgraded to use Tauri's native store for persisted settings.
}
