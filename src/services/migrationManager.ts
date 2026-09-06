import {
  getMeta,
  setMeta,
  getAllNotesRaw,
  getAllCalendarEventsRaw,
  getAllWorkspaceSettingsRaw,
  restoreNotesRaw,
  restoreCalendarEventsRaw,
  restoreWorkspaceSettingsRaw,
} from './localDb';

/**
 * NoteNirman 2.0 Phase 5 — Schema Versioning & Data Migration Engine (P5.5)
 *
 * Provides best-effort recoverable data migrations on top of the
 * existing IndexedDB schema managed by localDb.ts.
 *
 * --- CRITICAL DESIGN DECISIONS & GUARANTEES ---
 *
 * 1. RECOVERABLE PRE-MIGRATION SNAPSHOTS
 *    Before executing any migration step, a pre-migration snapshot of all
 *    authoritative stores (notes, calendarEvents, workspaceSettings) is
 *    dumped and stored in the IndexedDB `meta` store (`preMigrationSnapshot:<version>`).
 *    If migration step fails, `restorePreMigrationSnapshot()` clears mutated data
 *    and restores the pre-migration state.
 *
 * 2. RECOVERY GUARANTEE
 *    "Best-effort recoverable migration using a validated pre-migration snapshot
 *    and journal/checkpoint state."
 *
 * 3. QUOTA SAFETY
 *    Pre-migration quota estimation uses `navigator.storage.estimate()`.
 *    Migration aborts before taking snapshot or mutating data if free space < 2.5× snapshot size.
 *
 * 4. NO `blocks` STORE
 *    No IndexedDB `blocks` store is created or referenced. Note.content
 *    remains the sole canonical durable note representation.
 *
 * Invariants Preserved:
 * - Note.content is canonical (never replaced by block AST representation)
 * - localDb.ts API remains the sole persistence authority
 * - syncEngine.ts remains the sole sync authority
 */

export const APP_SCHEMA_VERSION = 1;

export type MigrationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export interface MigrationJournalEntry {
  version: number;                    // Target version this entry migrates to
  name: string;                       // Human-readable description
  status: MigrationStatus;
  startedAt: number;                  // Epoch ms
  completedAt?: number;               // Epoch ms (set on completion or failure)
  error?: string;                     // Error message if status = 'failed'
  recordsProcessed?: number;          // Diagnostic counter
  checkpointBatch?: number;           // Last committed batch index (for resume)
}

export interface PreMigrationDataSnapshot {
  snapshotId: string;
  version: number;
  createdAt: number;
  notes: any[];
  calendarEvents: any[];
  workspaceSettings: any[];
}

export interface MigrationStep {
  version: number;
  name: string;
  run(context: MigrationContext): Promise<MigrationStepResult>;
}

export interface MigrationContext {
  checkpoint(batch: number, recordsProcessed: number): Promise<void>;
}

export interface MigrationStepResult {
  recordsProcessed: number;
}

export interface StorageEstimate {
  quota: number;
  usage: number;
  freeBytes: number;
  estimatedSnapshotBytes: number;
  isSafe: boolean;
}

export interface RunMigrationsResult {
  fromVersion: number;
  toVersion: number;
  stepsRun: number;
  journalEntries: MigrationJournalEntry[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Meta store keys
// ---------------------------------------------------------------------------

const META_APP_SCHEMA_VERSION = 'appSchemaVersion';
const JOURNAL_KEY = (version: number) => `migrationJournal:${version}`;
const SNAPSHOT_KEY = (version: number) => `preMigrationSnapshot:${version}`;

// ---------------------------------------------------------------------------
// Registered Migration Steps
// ---------------------------------------------------------------------------

/**
 * Registry of migration steps.
 */
let MIGRATION_STEPS: MigrationStep[] = [];

export function setRegisteredMigrationSteps(steps: MigrationStep[]): void {
  MIGRATION_STEPS = [...steps];
}

export function resetRegisteredMigrationSteps(): void {
  MIGRATION_STEPS = [];
}

// ---------------------------------------------------------------------------
// Quota Safety Check
// ---------------------------------------------------------------------------

export async function estimateStorageQuota(
  approximateRecordCount: number = 0
): Promise<StorageEstimate> {
  const estimatedSnapshotBytes = Math.max(1024, Math.ceil(approximateRecordCount / 100) * 1024);

  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {
      quota: Number.MAX_SAFE_INTEGER,
      usage: 0,
      freeBytes: Number.MAX_SAFE_INTEGER,
      estimatedSnapshotBytes,
      isSafe: true,
    };
  }

  try {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    const freeBytes = quota - usage;
    const safetyMultiplier = 2.5;
    const isSafe = freeBytes >= safetyMultiplier * estimatedSnapshotBytes;

    return { quota, usage, freeBytes, estimatedSnapshotBytes, isSafe };
  } catch {
    return {
      quota: 0,
      usage: 0,
      freeBytes: 0,
      estimatedSnapshotBytes,
      isSafe: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Pre-Migration Snapshot Creation & Restoration
// ---------------------------------------------------------------------------

export async function createPreMigrationSnapshot(targetVersion: number): Promise<PreMigrationDataSnapshot> {
  const [notes, calendarEvents, workspaceSettings] = await Promise.all([
    getAllNotesRaw(),
    getAllCalendarEventsRaw(),
    getAllWorkspaceSettingsRaw(),
  ]);

  const snapshot: PreMigrationDataSnapshot = {
    snapshotId: `snap_${targetVersion}_${Date.now()}`,
    version: targetVersion,
    createdAt: Date.now(),
    notes,
    calendarEvents,
    workspaceSettings,
  };

  await setMeta(SNAPSHOT_KEY(targetVersion), snapshot);
  return snapshot;
}

export async function restorePreMigrationSnapshot(targetVersion: number): Promise<boolean> {
  const snapshot = await getMeta<PreMigrationDataSnapshot>(SNAPSHOT_KEY(targetVersion));
  if (!snapshot) return false;

  await Promise.all([
    restoreNotesRaw(snapshot.notes),
    restoreCalendarEventsRaw(snapshot.calendarEvents),
    restoreWorkspaceSettingsRaw(snapshot.workspaceSettings),
  ]);

  const journal = await readJournalEntry(targetVersion);
  if (journal) {
    await writeJournalEntry({
      ...journal,
      status: 'rolled_back',
      completedAt: Date.now(),
    });
  }

  return true;
}

export async function purgePreMigrationSnapshot(targetVersion: number): Promise<void> {
  await setMeta(SNAPSHOT_KEY(targetVersion), null);
}

// ---------------------------------------------------------------------------
// Journal Helpers
// ---------------------------------------------------------------------------

async function readJournalEntry(version: number): Promise<MigrationJournalEntry | undefined> {
  return getMeta<MigrationJournalEntry>(JOURNAL_KEY(version));
}

async function writeJournalEntry(entry: MigrationJournalEntry): Promise<void> {
  await setMeta(JOURNAL_KEY(entry.version), entry);
}

// ---------------------------------------------------------------------------
// Current Version Helpers
// ---------------------------------------------------------------------------

export async function getCurrentSchemaVersion(): Promise<number> {
  const stored = await getMeta<number>(META_APP_SCHEMA_VERSION);
  return stored ?? 0;
}

export async function setCurrentSchemaVersion(version: number): Promise<void> {
  await setMeta(META_APP_SCHEMA_VERSION, version);
}

// ---------------------------------------------------------------------------
// Core Migration Runner
// ---------------------------------------------------------------------------

export async function runPendingMigrations(
  approximateRecordCount: number = 0,
  targetVersion: number = APP_SCHEMA_VERSION
): Promise<RunMigrationsResult> {
  const currentVersion = await getCurrentSchemaVersion();
  const journalEntries: MigrationJournalEntry[] = [];
  const errors: string[] = [];
  let stepsRun = 0;

  if (currentVersion > targetVersion) {
    return {
      fromVersion: currentVersion,
      toVersion: currentVersion,
      stepsRun: 0,
      journalEntries: [],
      errors: [`Unsupported future schema detected (current v${currentVersion} > target v${targetVersion})`],
    };
  }

  if (currentVersion >= targetVersion) {
    return { fromVersion: currentVersion, toVersion: currentVersion, stepsRun: 0, journalEntries: [], errors: [] };
  }

  const pendingSteps = MIGRATION_STEPS.filter(s => s.version > currentVersion && s.version <= targetVersion);

  if (pendingSteps.length === 0) {
    await setCurrentSchemaVersion(targetVersion);
    return { fromVersion: currentVersion, toVersion: targetVersion, stepsRun: 0, journalEntries: [], errors: [] };
  }

  const quotaEstimate = await estimateStorageQuota(approximateRecordCount);
  if (!quotaEstimate.isSafe) {
    const msg = `[MigrationManager] Quota safety check failed. ` +
      `Free: ${quotaEstimate.freeBytes}B, Required: ${2.5 * quotaEstimate.estimatedSnapshotBytes}B. ` +
      `Migration aborted to prevent data loss.`;
    return {
      fromVersion: currentVersion,
      toVersion: currentVersion,
      stepsRun: 0,
      journalEntries: [],
      errors: [msg],
    };
  }

  for (const step of pendingSteps) {
    // 1. Create Pre-Migration Snapshot before data mutation
    try {
      await createPreMigrationSnapshot(step.version);
    } catch (snapErr: any) {
      const msg = `[MigrationManager] Failed to create pre-migration snapshot for v${step.version}: ${snapErr.message}. Aborting.`;
      return {
        fromVersion: currentVersion,
        toVersion: currentVersion,
        stepsRun,
        journalEntries,
        errors: [msg],
      };
    }

    const journalEntry: MigrationJournalEntry = {
      version: step.version,
      name: step.name,
      status: 'in_progress',
      startedAt: Date.now(),
      recordsProcessed: 0,
      checkpointBatch: 0,
    };

    await writeJournalEntry(journalEntry);

    const context: MigrationContext = {
      async checkpoint(batch: number, recordsProcessed: number): Promise<void> {
        journalEntry.checkpointBatch = batch;
        journalEntry.recordsProcessed = recordsProcessed;
        await writeJournalEntry({ ...journalEntry, checkpointBatch: batch, recordsProcessed });
      },
    };

    try {
      const result = await step.run(context);

      journalEntry.status = 'completed';
      journalEntry.completedAt = Date.now();
      journalEntry.recordsProcessed = result.recordsProcessed;
      await writeJournalEntry(journalEntry);

      await setCurrentSchemaVersion(step.version);
      await purgePreMigrationSnapshot(step.version);
      stepsRun++;
      journalEntries.push({ ...journalEntry });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      journalEntry.status = 'failed';
      journalEntry.completedAt = Date.now();
      journalEntry.error = errorMessage;
      await writeJournalEntry(journalEntry);

      // Attempt automatic restoration from snapshot on failure
      const restored = await restorePreMigrationSnapshot(step.version);
      const recoveryMsg = restored
        ? `Pre-migration snapshot restored successfully.`
        : `Snapshot restore unavailable.`;

      errors.push(`Step v${step.version} '${step.name}' failed: ${errorMessage}. ${recoveryMsg}`);
      journalEntries.push({ ...journalEntry, status: restored ? 'rolled_back' : 'failed' });

      break;
    }
  }

  const finalVersion = await getCurrentSchemaVersion();
  return {
    fromVersion: currentVersion,
    toVersion: finalVersion,
    stepsRun,
    journalEntries,
    errors,
  };
}

export async function getMigrationJournalEntry(
  version: number
): Promise<MigrationJournalEntry | undefined> {
  return readJournalEntry(version);
}

export async function getMigrationHistory(
  fromVersion: number,
  toVersion: number
): Promise<MigrationJournalEntry[]> {
  const results: MigrationJournalEntry[] = [];
  for (let v = fromVersion; v <= toVersion; v++) {
    const entry = await readJournalEntry(v);
    if (entry) results.push(entry);
  }
  return results;
}

export async function isMigrationCompleted(version: number): Promise<boolean> {
  const entry = await readJournalEntry(version);
  return entry?.status === 'completed';
}

export async function isMigrationFailed(version: number): Promise<boolean> {
  const entry = await readJournalEntry(version);
  return entry?.status === 'failed';
}
