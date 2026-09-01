import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import type { AggregateSyncStatus } from '../hooks/useNotes';
import type { Note } from '../types';

interface SyncStatusIndicatorProps {
  status: AggregateSyncStatus;
  pendingCount: number;
  conflicts: Note[];
  onResolveConflict: (noteId: string, choice: 'local' | 'server' | 'both') => void;
}

const STATUS_COPY: Record<AggregateSyncStatus, { label: string; icon: string }> = {
  offline: { label: 'Offline', icon: '↻' },
  'saved-locally': { label: 'Saved locally · waiting for connection', icon: '↻' },
  syncing: { label: 'Synchronizing…', icon: '↻' },
  synced: { label: 'Synced', icon: '✓' },
  conflict: { label: 'Sync conflict', icon: '⚠' },
  'sync-failed': { label: 'Some changes won’t sync · saved locally', icon: '⚠' },
  'backend-unavailable': { label: 'Server unavailable · saved locally', icon: '⚠' },
  'auth-expired': { label: 'Sign-in expired · saved locally', icon: '⚠' },
};

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ status, pendingCount, conflicts, onResolveConflict }) => {
  const { colors } = useSeason();
  const copy = STATUS_COPY[status];
  const isSpinning = status === 'syncing' || status === 'saved-locally';
  const isWarning = status === 'conflict' || status === 'sync-failed' || status === 'backend-unavailable' || status === 'auth-expired';

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`pointer-events-auto max-w-xs rounded-xl border shadow-lg p-3 text-xs space-y-2 ${colors.surface} ${colors.border} ${colors.primaryText}`}
          >
            <p className="font-semibold">
              {conflicts.length} note{conflicts.length > 1 ? 's' : ''} changed on another device too
            </p>
            <p className={colors.secondaryText}>Both versions are kept until you pick one.</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => conflicts.forEach(n => onResolveConflict(n.id, 'local'))}
                className="px-2 py-1 rounded-full border text-[11px] font-medium hover:opacity-80 transition-opacity"
              >
                Keep mine
              </button>
              <button
                onClick={() => conflicts.forEach(n => onResolveConflict(n.id, 'server'))}
                className="px-2 py-1 rounded-full border text-[11px] font-medium hover:opacity-80 transition-opacity"
              >
                Keep server
              </button>
              <button
                onClick={() => conflicts.forEach(n => onResolveConflict(n.id, 'both'))}
                className="px-2 py-1 rounded-full border text-[11px] font-medium hover:opacity-80 transition-opacity"
              >
                Keep both
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm ${colors.surface} ${colors.border} ${isWarning ? 'text-amber-600 dark:text-amber-400' : colors.secondaryText}`}
        title={pendingCount > 0 ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync` : undefined}
      >
        <span className={isSpinning ? 'animate-spin inline-block' : 'inline-block'}>{copy.icon}</span>
        <span>{copy.label}</span>
      </motion.div>
    </div>
  );
};

export default SyncStatusIndicator;
