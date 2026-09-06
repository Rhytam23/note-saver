/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaManager } from '../quotaManager';

const metaStore = new Map<string, unknown>();

vi.mock('../localDb', () => ({
  getMeta: vi.fn(async (key: string) => metaStore.get(key)),
  setMeta: vi.fn(async (key: string, value: unknown) => {
    metaStore.set(key, value);
  }),
}));

import { RecoveryService } from '../recoveryService';

describe('Phase 5 — Storage Quota & Reliability Manager (P5.11)', () => {
  beforeEach(() => {
    metaStore.clear();
    vi.restoreAllMocks();
  });

  it('estimates storage quota and detects warning thresholds correctly', async () => {
    // Mock navigator.storage.estimate
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({
          quota: 100 * 1024 * 1024, // 100 MB
          usage: 85 * 1024 * 1024,  // 85 MB (85%)
        }),
      },
      writable: true,
      configurable: true,
    });

    const estimate = await QuotaManager.getStorageEstimate();
    expect(estimate.quotaBytes).toBe(100 * 1024 * 1024);
    expect(estimate.usageBytes).toBe(85 * 1024 * 1024);
    expect(estimate.percentUsed).toBe(85);
    expect(estimate.isWarningThreshold).toBe(true);
    expect(estimate.isCriticalThreshold).toBe(false);
  });

  it('evaluates write safety based on available free space multiplier (2.5x safety margin)', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({
          quota: 100 * 1024 * 1024, // 100 MB
          usage: 95 * 1024 * 1024,  // 95 MB (5 MB remaining)
        }),
      },
      writable: true,
      configurable: true,
    });

    // Requesting 3 MB write when 5 MB remaining. 3 MB * 2.5 = 7.5 MB > 5 MB remaining -> unsafe!
    const safety = await QuotaManager.canSafelyWrite(3 * 1024 * 1024);
    expect(safety.safe).toBe(false);
    expect(safety.reason).toContain('Insufficient storage space');
  });

  it('saves, retrieves, and clears crash checkpoints cleanly', async () => {
    const noteId = 'note_crash_test';
    const draft = '<p>Unsaved draft content</p>';

    const saved = await RecoveryService.saveCheckpoint({
      noteId,
      draftContent: draft,
      reason: 'autosave',
    });

    expect(saved.id).toBeDefined();
    expect(saved.draftContent).toBe(draft);

    const fetched = await RecoveryService.getCheckpoint(noteId);
    expect(fetched).toBeDefined();
    expect(fetched?.draftContent).toBe(draft);

    await RecoveryService.clearCheckpoint(noteId);
    const cleared = await RecoveryService.getCheckpoint(noteId);
    expect(cleared).toBeNull();
  });
});
