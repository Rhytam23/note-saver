/**
 * NoteNirman 2.0 — P5.7 Platform Adapter Tests
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectPlatform,
  createAdapters,
  getPlatformAdapters,
  resetAdapters,
} from '../platform/platformAdapterFactory';
import { WebFilesystemAdapter, WebNotificationAdapter, WebStorageAdapter } from '../platform/webAdapter';
import { isTauriRuntime } from '../platform/tauriAdapter';
import { isCapacitorRuntime } from '../platform/capacitorAdapter';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mockCapacitorRuntime(active: boolean) {
  if (active) {
    Object.defineProperty(window, 'Capacitor', {
      value: { isNativePlatform: () => true },
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(window, 'Capacitor', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }
}

function mockTauriRuntime(active: boolean) {
  if (active) {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {},
      configurable: true,
      writable: true,
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__;
  }
}

describe('Platform Adapter Factory — P5.7', () => {

  beforeEach(() => {
    resetAdapters();
    mockCapacitorRuntime(false);
    mockTauriRuntime(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetAdapters();
    mockCapacitorRuntime(false);
    mockTauriRuntime(false);
  });

  // -------------------------------------------------------------------------
  // 1. Platform Detection
  // -------------------------------------------------------------------------

  describe('detectPlatform', () => {
    it('returns web in jsdom (no Capacitor, no Tauri)', () => {
      expect(detectPlatform()).toBe('web');
    });

    it('returns capacitor when Capacitor.isNativePlatform() is true', () => {
      mockCapacitorRuntime(true);
      expect(detectPlatform()).toBe('capacitor');
    });

    it('returns tauri when __TAURI_INTERNALS__ is present', () => {
      mockTauriRuntime(true);
      expect(detectPlatform()).toBe('tauri');
    });

    it('prefers capacitor over tauri when both are present', () => {
      mockCapacitorRuntime(true);
      mockTauriRuntime(true);
      expect(detectPlatform()).toBe('capacitor');
    });
  });

  // -------------------------------------------------------------------------
  // 2. isCapacitorRuntime / isTauriRuntime
  // -------------------------------------------------------------------------

  describe('isCapacitorRuntime', () => {
    it('returns false in standard jsdom', () => {
      expect(isCapacitorRuntime()).toBe(false);
    });

    it('returns true when Capacitor global is mocked', () => {
      mockCapacitorRuntime(true);
      expect(isCapacitorRuntime()).toBe(true);
    });
  });

  describe('isTauriRuntime', () => {
    it('returns false in standard jsdom', () => {
      expect(isTauriRuntime()).toBe(false);
    });

    it('returns true when __TAURI_INTERNALS__ is mocked', () => {
      mockTauriRuntime(true);
      expect(isTauriRuntime()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 3. createAdapters
  // -------------------------------------------------------------------------

  describe('createAdapters', () => {
    it('creates web adapters for platform=web', () => {
      const adapters = createAdapters('web');
      expect(adapters.filesystem).toBeInstanceOf(WebFilesystemAdapter);
      expect(adapters.notification).toBeInstanceOf(WebNotificationAdapter);
      expect(adapters.storage).toBeInstanceOf(WebStorageAdapter);
    });

    it('creates tauri adapters for platform=tauri', () => {
      const adapters = createAdapters('tauri');
      expect(adapters.filesystem).toBeDefined();
      expect(adapters.notification).toBeDefined();
      expect(adapters.storage).toBeDefined();
    });

    it('creates capacitor adapters for platform=capacitor', () => {
      const adapters = createAdapters('capacitor');
      expect(adapters.filesystem).toBeDefined();
      expect(adapters.notification).toBeDefined();
      expect(adapters.storage).toBeDefined();
    });

    it('all adapters implement the correct interface methods', () => {
      const adapters = createAdapters('web');
      // IFilesystemAdapter
      expect(typeof adapters.filesystem.writeFile).toBe('function');
      expect(typeof adapters.filesystem.readFile).toBe('function');
      expect(typeof adapters.filesystem.isDirectFilesystemAvailable).toBe('function');
      // INotificationAdapter
      expect(typeof adapters.notification.requestPermission).toBe('function');
      expect(typeof adapters.notification.scheduleNotification).toBe('function');
      expect(typeof adapters.notification.cancelNotification).toBe('function');
      expect(typeof adapters.notification.cancelAllNotifications).toBe('function');
      expect(typeof adapters.notification.isAvailable).toBe('function');
      // IStorageAdapter
      expect(typeof adapters.storage.getItem).toBe('function');
      expect(typeof adapters.storage.setItem).toBe('function');
      expect(typeof adapters.storage.removeItem).toBe('function');
      expect(typeof adapters.storage.clear).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // 4. getPlatformAdapters (singleton)
  // -------------------------------------------------------------------------

  describe('getPlatformAdapters', () => {
    it('returns web adapters in jsdom environment', () => {
      const adapters = getPlatformAdapters();
      expect(adapters.filesystem).toBeInstanceOf(WebFilesystemAdapter);
    });

    it('returns the same instance on repeated calls (singleton)', () => {
      const first = getPlatformAdapters();
      const second = getPlatformAdapters();
      expect(first).toBe(second);
    });

    it('resetAdapters() causes re-initialization', () => {
      const first = getPlatformAdapters();
      resetAdapters();
      const second = getPlatformAdapters();
      // Different instances after reset
      expect(first).not.toBe(second);
    });
  });

  // -------------------------------------------------------------------------
  // 5. WebFilesystemAdapter
  // -------------------------------------------------------------------------

  describe('WebFilesystemAdapter', () => {
    it('isDirectFilesystemAvailable returns false in jsdom (no showOpenFilePicker)', () => {
      const adapter = new WebFilesystemAdapter();
      // jsdom does not implement showOpenFilePicker
      expect(adapter.isDirectFilesystemAvailable()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 6. WebNotificationAdapter
  // -------------------------------------------------------------------------

  describe('WebNotificationAdapter', () => {
    it('isAvailable reflects Notification API presence (platform-dependent)', () => {
      const adapter = new WebNotificationAdapter();
      // In jsdom, Notification is not implemented, so isAvailable() returns false.
      // On a real browser, this returns true when Notification is in window.
      // We verify the behavior is consistent with the environment.
      const expected = typeof window !== 'undefined' && 'Notification' in window;
      expect(adapter.isAvailable()).toBe(expected);
    });

    it('scheduleNotification returns without error in jsdom', async () => {
      const adapter = new WebNotificationAdapter();
      await expect(adapter.scheduleNotification({
        id: 'test-notif-1',
        title: 'Test',
        body: 'Test body',
        scheduleAtMs: Date.now() + 10000,
      })).resolves.toBeUndefined();
    });

    it('cancelNotification resolves without error', async () => {
      const adapter = new WebNotificationAdapter();
      await expect(adapter.cancelNotification({ id: 'test-notif-1' })).resolves.toBeUndefined();
    });

    it('cancelAllNotifications resolves without error', async () => {
      const adapter = new WebNotificationAdapter();
      await expect(adapter.cancelAllNotifications()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 7. WebStorageAdapter
  // -------------------------------------------------------------------------

  describe('WebStorageAdapter', () => {
    let adapter: WebStorageAdapter;

    beforeEach(() => {
      adapter = new WebStorageAdapter();
      window.localStorage.clear();
    });

    afterEach(() => {
      window.localStorage.clear();
    });

    it('setItem and getItem roundtrip', async () => {
      await adapter.setItem('nn-test-key', 'hello-world');
      const value = await adapter.getItem('nn-test-key');
      expect(value).toBe('hello-world');
    });

    it('removeItem deletes the key', async () => {
      await adapter.setItem('nn-del-key', 'to-be-deleted');
      await adapter.removeItem('nn-del-key');
      const value = await adapter.getItem('nn-del-key');
      expect(value).toBeNull();
    });

    it('getItem returns null for missing key', async () => {
      const value = await adapter.getItem('nn-missing-key-xyz');
      expect(value).toBeNull();
    });

    it('clear removes all items', async () => {
      await adapter.setItem('nn-key-a', 'a');
      await adapter.setItem('nn-key-b', 'b');
      await adapter.clear();
      expect(await adapter.getItem('nn-key-a')).toBeNull();
      expect(await adapter.getItem('nn-key-b')).toBeNull();
    });
  });

});
