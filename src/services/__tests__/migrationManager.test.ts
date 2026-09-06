/**
 * NoteNirman 2.0 — P5.5 Migration Manager & Recovery Snapshot Tests
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const metaStore = new Map<string, unknown>();
let notesStore: any[] = [];
let calendarEventsStore: any[] = [];
let workspaceSettingsStore: any[] = [];

vi.mock('../localDb', () => ({
  getMeta: vi.fn(async (key: string) => metaStore.get(key)),
  setMeta: vi.fn(async (key: string, value: unknown) => {
    metaStore.set(key, value);
  }),
  getAllNotesRaw: vi.fn(async () => [...notesStore]),
  getAllCalendarEventsRaw: vi.fn(async () => [...calendarEventsStore]),
  getAllWorkspaceSettingsRaw: vi.fn(async () => [...workspaceSettingsStore]),
  restoreNotesRaw: vi.fn(async (notes: any[]) => {
    notesStore = [...notes];
  }),
  restoreCalendarEventsRaw: vi.fn(async (events: any[]) => {
    calendarEventsStore = [...events];
  }),
  restoreWorkspaceSettingsRaw: vi.fn(async (settings: any[]) => {
    workspaceSettingsStore = [...settings];
  }),
}));

import {
  getCurrentSchemaVersion,
  setCurrentSchemaVersion,
  runPendingMigrations,
  getMigrationJournalEntry,
  createPreMigrationSnapshot,
  restorePreMigrationSnapshot,
  setRegisteredMigrationSteps,
  resetRegisteredMigrationSteps,
} from '../migrationManager';

describe('MigrationManagerService — P5.5 Pre-Migration Snapshot & Recovery', () => {
  beforeEach(() => {
    metaStore.clear();
    notesStore = [];
    calendarEventsStore = [];
    workspaceSettingsStore = [];
    resetRegisteredMigrationSteps();
  });

  it('1. Reads and updates current schema version correctly', async () => {
    expect(await getCurrentSchemaVersion()).toBe(0);
    await setCurrentSchemaVersion(2);
    expect(await getCurrentSchemaVersion()).toBe(2);
  });

  it('2. Creates and restores pre-migration snapshot preserving Note.content, block UUIDs, calendar, and settings', async () => {
    const originalNote = {
      id: 'note_001',
      title: 'Pre-migration Note',
      content: '<p data-block-id="blk_001">Original block content</p>',
      createdAt: '2026-09-06T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
    };
    const originalCalEvent = {
      id: 'evt_001',
      title: 'Meeting',
      startAt: '2026-09-07T10:00:00Z',
    };
    const originalSettings = {
      workspaceId: 'ws_001',
      workspaceName: 'Test Workspace',
    };

    notesStore = [originalNote];
    calendarEventsStore = [originalCalEvent];
    workspaceSettingsStore = [originalSettings];

    // Create snapshot
    await createPreMigrationSnapshot(1);

    // Mutate data to simulate corrupted / failed migration state
    notesStore = [{ ...originalNote, content: '<p>Corrupted during failed migration</p>' }];
    calendarEventsStore = [];
    workspaceSettingsStore = [];

    // Execute recovery
    const restored = await restorePreMigrationSnapshot(1);
    expect(restored).toBe(true);

    // Verify complete data restoration
    expect(notesStore).toHaveLength(1);
    expect(notesStore[0].content).toContain('data-block-id="blk_001"');
    expect(notesStore[0].content).toContain('Original block content');
    expect(calendarEventsStore).toHaveLength(1);
    expect(calendarEventsStore[0].id).toBe('evt_001');
    expect(workspaceSettingsStore).toHaveLength(1);
    expect(workspaceSettingsStore[0].workspaceName).toBe('Test Workspace');
  });

  it('3. Automatically triggers recovery snapshot restoration when migration step fails', async () => {
    const originalNote = {
      id: 'note_002',
      title: 'Safe Note',
      content: '<p data-block-id="blk_safe">Safe content</p>',
    };
    notesStore = [originalNote];

    setRegisteredMigrationSteps([
      {
        version: 1,
        name: 'failing_step',
        async run() {
          // Mutate note then throw exception
          notesStore = [{ ...originalNote, content: 'DELETED' }];
          throw new Error('Simulated database write error');
        },
      },
    ]);

    const result = await runPendingMigrations(1, 1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('failing_step');
    expect(result.errors[0]).toContain('Pre-migration snapshot restored successfully');

    // Data should be restored to pre-migration state
    expect(notesStore[0].content).toBe('<p data-block-id="blk_safe">Safe content</p>');

    const journal = await getMigrationJournalEntry(1);
    expect(journal?.status).toBe('rolled_back');
  });

  it('4. Handles already-current schema version cleanly', async () => {
    await setCurrentSchemaVersion(1);
    const result = await runPendingMigrations(0, 1);
    expect(result.stepsRun).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('5. Detects unsupported future schema version and halts without mutating state', async () => {
    await setCurrentSchemaVersion(5);
    const result = await runPendingMigrations(0, 1);
    expect(result.stepsRun).toBe(0);
    expect(result.errors[0]).toContain('Unsupported future schema detected');
  });

  it('6. Aborts migration if quota safety check fails', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({
          quota: 1000,
          usage: 950, // 50 bytes free < 2.5 * 1024
        }),
      },
      writable: true,
      configurable: true,
    });

    setRegisteredMigrationSteps([
      {
        version: 1,
        name: 'step1',
        async run() {
          return { recordsProcessed: 1 };
        },
      },
    ]);

    const result = await runPendingMigrations(100, 1);
    expect(result.errors[0]).toContain('Quota safety check failed');
  });
});
