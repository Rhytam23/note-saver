/**
 * NoteNirman 2.0 Phase 5 — Platform Layer Adapter Interfaces (P5.7)
 *
 * Typed interfaces enabling platform-agnostic core services.
 * Implementations:
 *  - WebAdapter: Web/PWA (Blob downloads, Web Notification API, File System Access API)
 *  - TauriAdapter: Tauri 2 desktop (plugin-fs, plugin-notification)
 *  - CapacitorAdapter: Capacitor 8 Android (@capacitor/filesystem, @capacitor/local-notifications)
 *
 * Core services in src/services/ depend ONLY on these interfaces — never on platform SDKs directly.
 * Platform implementations are loaded at runtime by platformAdapterFactory.ts.
 */

// ---------------------------------------------------------------------------
// IFilesystemAdapter
// ---------------------------------------------------------------------------

export interface WriteFileOptions {
  /** File path or name. Platforms interpret this differently:
   *  - Web: used as the download filename
   *  - Tauri: absolute or app-data-relative path
   *  - Capacitor: path within the app sandbox */
  path: string;
  /** File content as string or Uint8Array */
  data: string | Uint8Array;
  /** MIME type hint for blob creation (Web only) */
  mimeType?: string;
  /** Encoding for string data (default: 'utf-8') */
  encoding?: 'utf-8' | 'base64';
}

export interface ReadFileOptions {
  path: string;
  encoding?: 'utf-8' | 'base64';
}

export interface ReadFileResult {
  data: string;
}

export interface IFilesystemAdapter {
  /**
   * Write data to a file.
   * On Web: triggers a browser download via Blob URL.
   * On Tauri/Capacitor: writes to the native filesystem.
   */
  writeFile(options: WriteFileOptions): Promise<void>;

  /**
   * Read a file and return its content.
   * On Web: uses File System Access API (may prompt user for file picker).
   * On Tauri/Capacitor: reads from the native filesystem.
   */
  readFile(options: ReadFileOptions): Promise<ReadFileResult>;

  /**
   * Check if the adapter supports direct filesystem access.
   * Returns false for Web when File System Access API is unavailable.
   */
  isDirectFilesystemAvailable(): boolean;
}

// ---------------------------------------------------------------------------
// INotificationAdapter
// ---------------------------------------------------------------------------

export interface ScheduleNotificationOptions {
  /** Unique stable notification ID (used for deduplication and cancellation) */
  id: string;
  /** Short notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Delivery time as epoch milliseconds */
  scheduleAtMs: number;
  /** Optional action URL for Web notifications */
  actionUrl?: string;
  /** Optional tag/channel for grouping notifications */
  tag?: string;
}

export interface CancelNotificationOptions {
  id: string;
}

export interface INotificationAdapter {
  /**
   * Request notification permission from the user/OS.
   * Returns 'granted', 'denied', or 'default'.
   */
  requestPermission(): Promise<NotificationPermissionState>;

  /**
   * Schedule a future notification.
   * On Web: uses Service Worker push / setTimeout fallback.
   * On Tauri: uses plugin-notification.
   * On Capacitor: uses @capacitor/local-notifications.
   */
  scheduleNotification(options: ScheduleNotificationOptions): Promise<void>;

  /**
   * Cancel a previously scheduled notification by ID.
   */
  cancelNotification(options: CancelNotificationOptions): Promise<void>;

  /**
   * Cancel all scheduled notifications.
   */
  cancelAllNotifications(): Promise<void>;

  /**
   * Check whether notifications are available on this platform.
   */
  isAvailable(): boolean;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default';

// ---------------------------------------------------------------------------
// IStorageAdapter
// ---------------------------------------------------------------------------

export interface IStorageAdapter {
  /**
   * Read a value from persistent key-value storage.
   * On Web: localStorage.
   * On Tauri/Capacitor: native secure preferences storage.
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Write a value to persistent key-value storage.
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Remove a value from persistent key-value storage.
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clear all entries from persistent storage.
   */
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Combined Platform Adapters bundle
// ---------------------------------------------------------------------------

export interface PlatformAdapters {
  filesystem: IFilesystemAdapter;
  notification: INotificationAdapter;
  storage: IStorageAdapter;
}

export type PlatformTarget = 'web' | 'tauri' | 'capacitor';
