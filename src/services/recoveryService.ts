import { getMeta, setMeta } from './localDb';

export interface CrashCheckpoint {
  id: string;
  noteId?: string;
  draftContent: string;
  timestamp: number;
  reason: 'autosave' | 'unexpected_close' | 'migration_backup';
}

export class RecoveryService {
  private static CHECKPOINT_KEY_PREFIX = 'crash_checkpoint:';

  /**
   * Saves a draft checkpoint before critical operations or autosaves.
   */
  static async saveCheckpoint(checkpoint: Omit<CrashCheckpoint, 'id' | 'timestamp'>): Promise<CrashCheckpoint> {
    const full: CrashCheckpoint = {
      ...checkpoint,
      id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
    };
    const key = `${this.CHECKPOINT_KEY_PREFIX}${full.noteId || 'global'}`;
    await setMeta(key, full);
    return full;
  }

  /**
   * Retrieves the last crash checkpoint for a note or global.
   */
  static async getCheckpoint(noteId?: string): Promise<CrashCheckpoint | undefined> {
    const key = `${this.CHECKPOINT_KEY_PREFIX}${noteId || 'global'}`;
    return getMeta<CrashCheckpoint>(key);
  }

  /**
   * Clears a checkpoint once saved successfully.
   */
  static async clearCheckpoint(noteId?: string): Promise<void> {
    const key = `${this.CHECKPOINT_KEY_PREFIX}${noteId || 'global'}`;
    await setMeta(key, null);
  }
}
