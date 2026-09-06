/**
 * NoteNirman 2.0 Phase 5 — Web/PWA Platform Adapter (P5.7)
 *
 * Implements platform adapter interfaces using standard Web APIs:
 * - Filesystem: Blob download trigger + File System Access API (when available)
 * - Notification: Web Notification API + setTimeout scheduling fallback
 * - Storage: localStorage wrapper
 *
 * This adapter requires no additional npm packages — it uses only browser APIs.
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

// ---------------------------------------------------------------------------
// Web Filesystem Adapter
// ---------------------------------------------------------------------------

/**
 * Web/PWA filesystem adapter.
 *
 * writeFile: Creates a Blob and triggers a browser download via anchor click.
 * readFile: Uses File System Access API (showOpenFilePicker) when available;
 *           falls back to a file input element prompt.
 */
export class WebFilesystemAdapter implements IFilesystemAdapter {
  isDirectFilesystemAvailable(): boolean {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  }

  async writeFile(options: WriteFileOptions): Promise<void> {
    const { path: filename, data, mimeType = 'application/octet-stream' } = options;

    let blob: Blob;
    if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType });
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    // Use File System Access API saveFilePicker if available
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        // @ts-expect-error — File System Access API not in all TS lib versions
        const handle = await window.showSaveFilePicker({ suggestedName: filename });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: unknown) {
        // User cancelled or browser denied — fall through to Blob download
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // Fallback: trigger download via Blob URL
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async readFile(_options: ReadFileOptions): Promise<ReadFileResult> {
    // Use File System Access API if available
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        // @ts-expect-error — File System Access API not in all TS lib versions
        const [handle] = await window.showOpenFilePicker();
        const file: File = await handle.getFile();
        const text = await file.text();
        return { data: text };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('File selection cancelled by user');
        }
        throw err;
      }
    }

    // Fallback: use hidden file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        const text = await file.text();
        resolve({ data: text });
        document.body.removeChild(input);
      };
      input.oncancel = () => {
        reject(new Error('File selection cancelled'));
        document.body.removeChild(input);
      };
      document.body.appendChild(input);
      input.click();
    });
  }
}

// ---------------------------------------------------------------------------
// Web Notification Adapter
// ---------------------------------------------------------------------------

// In-memory map of scheduled timeout handles (keyed by notification ID)
const _scheduledTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Web/PWA notification adapter.
 *
 * Uses the Web Notification API. Scheduling is approximated via setTimeout —
 * notifications will only fire while the browser tab is open.
 * For persistent background notifications, a Service Worker is required (P5.8).
 */
export class WebNotificationAdapter implements INotificationAdapter {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isAvailable()) return 'denied';
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  }

  async scheduleNotification(options: ScheduleNotificationOptions): Promise<void> {
    if (!this.isAvailable()) return;

    const delayMs = Math.max(0, options.scheduleAtMs - Date.now());

    // Cancel any existing notification with the same ID (deduplication)
    this.cancelNotificationById(options.id);

    const timeoutId = setTimeout(async () => {
      if (Notification.permission !== 'granted') return;
      try {
        const notification = new Notification(options.title, {
          body: options.body,
          tag: options.tag ?? options.id,
        });
        if (options.actionUrl) {
          notification.onclick = () => {
            window.open(options.actionUrl, '_blank');
          };
        }
      } catch {
        // Notification creation may throw in some environments — safe to ignore
      }
      _scheduledTimeouts.delete(options.id);
    }, delayMs);

    _scheduledTimeouts.set(options.id, timeoutId);
  }

  async cancelNotification(options: CancelNotificationOptions): Promise<void> {
    this.cancelNotificationById(options.id);
  }

  async cancelAllNotifications(): Promise<void> {
    _scheduledTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    _scheduledTimeouts.clear();
  }

  private cancelNotificationById(id: string): void {
    const existing = _scheduledTimeouts.get(id);
    if (existing !== undefined) {
      clearTimeout(existing);
      _scheduledTimeouts.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Web Storage Adapter (localStorage wrapper)
// ---------------------------------------------------------------------------

/**
 * Web/PWA storage adapter wrapping localStorage.
 * Provides async interface matching IStorageAdapter for cross-platform consistency.
 */
export class WebStorageAdapter implements IStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage may be full or disabled — ignore silently
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
  }
}
