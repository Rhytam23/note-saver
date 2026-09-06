/**
 * NoteNirman 2.0 Phase 5 — Platform Adapter Factory (P5.7)
 *
 * Detects the current runtime platform and returns the appropriate
 * adapter implementations for filesystem, notifications, and storage.
 *
 * Detection order:
 * 1. Capacitor (native Android/iOS): window.Capacitor.isNativePlatform() === true
 * 2. Tauri 2 (desktop): window.__TAURI_INTERNALS__ present
 * 3. Web/PWA: fallback
 *
 * This factory is the ONLY place in the codebase that contains platform
 * detection logic. All other services receive adapters via this factory
 * and remain platform-agnostic.
 */

import type { PlatformAdapters, PlatformTarget } from './platformInterfaces';
import {
  WebFilesystemAdapter,
  WebNotificationAdapter,
  WebStorageAdapter,
} from './webAdapter';
import {
  TauriFilesystemAdapter,
  TauriNotificationAdapter,
  TauriStorageAdapter,
  isTauriRuntime,
} from './tauriAdapter';
import {
  CapacitorFilesystemAdapter,
  CapacitorNotificationAdapter,
  CapacitorStorageAdapter,
  isCapacitorRuntime,
} from './capacitorAdapter';

// ---------------------------------------------------------------------------
// Singleton — adapters are initialized once per application lifecycle
// ---------------------------------------------------------------------------

let _adapters: PlatformAdapters | null = null;

/**
 * Detect the current platform target.
 */
export function detectPlatform(): PlatformTarget {
  if (isCapacitorRuntime()) return 'capacitor';
  if (isTauriRuntime()) return 'tauri';
  return 'web';
}

/**
 * Get or create the platform adapter bundle for the current runtime.
 *
 * Adapters are memoized after first call — call resetAdapters() in tests
 * to force re-initialization with a different platform target.
 */
export function getPlatformAdapters(): PlatformAdapters {
  if (_adapters) return _adapters;

  const platform = detectPlatform();
  _adapters = createAdapters(platform);
  return _adapters;
}

/**
 * Create adapters for a specific platform target.
 * Exposed for testing and SSR scenarios where auto-detection may not work.
 */
export function createAdapters(platform: PlatformTarget): PlatformAdapters {
  switch (platform) {
    case 'tauri':
      return {
        filesystem: new TauriFilesystemAdapter(),
        notification: new TauriNotificationAdapter(),
        storage: new TauriStorageAdapter(),
      };

    case 'capacitor':
      return {
        filesystem: new CapacitorFilesystemAdapter(),
        notification: new CapacitorNotificationAdapter(),
        storage: new CapacitorStorageAdapter(),
      };

    case 'web':
    default:
      return {
        filesystem: new WebFilesystemAdapter(),
        notification: new WebNotificationAdapter(),
        storage: new WebStorageAdapter(),
      };
  }
}

/**
 * Reset the cached adapter singleton.
 * Use in tests to simulate different platform environments.
 */
export function resetAdapters(): void {
  _adapters = null;
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export type { PlatformAdapters, PlatformTarget } from './platformInterfaces';
export type {
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
