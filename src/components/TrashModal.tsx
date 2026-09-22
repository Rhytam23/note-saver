import React, { useCallback, useEffect, useState } from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import type { Note } from '../types';
import { getTrash, purgeNote, restoreNote, subscribeLocalChanges, TRASH_RETENTION_DAYS } from '../services/syncEngine';

interface TrashModalProps {
  userId: string;
  onClose: () => void;
}

const TrashModal: React.FC<TrashModalProps> = ({ userId, onClose }) => {
  const { colors } = useSeason();
  const [items, setItems] = useState<Note[] | null>(null);

  const refresh = useCallback(async () => {
    setItems(await getTrash(userId));
  }, [userId]);

  useEffect(() => {
    void refresh();
    return subscribeLocalChanges(userId, () => void refresh());
  }, [userId, refresh]);

  const buttonClass = `px-3 py-1.5 rounded border text-sm ${colors.border} ${colors.hover}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Trash"
    >
      <div
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl p-5 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Trash</h2>
          <button type="button" onClick={onClose} className={`px-2 py-1 rounded ${colors.hover}`} aria-label="Close">
            ✕
          </button>
        </div>
        <p className={`text-sm mb-4 ${colors.secondaryText}`}>
          Deleted notes stay here for {TRASH_RETENTION_DAYS} days, then are removed from this device.
        </p>

        {items === null && <p className={colors.secondaryText}>Loading…</p>}
        {items?.length === 0 && <p className={colors.secondaryText}>Trash is empty.</p>}

        <ul className="space-y-2">
          {items?.map(note => (
            <li key={note.id} className={`p-3 rounded-lg border ${colors.border}`}>
              <p className="font-medium truncate">{note.title || 'Untitled'}</p>
              <p className={`text-xs mb-2 ${colors.secondaryText}`}>
                Deleted {note.deletedAt ? new Date(note.deletedAt).toLocaleString() : ''}
              </p>
              <div className="flex gap-2">
                <button type="button" className={buttonClass} onClick={() => void restoreNote(userId, note.id)}>
                  Restore
                </button>
                <button
                  type="button"
                  className={`${buttonClass} text-red-500`}
                  onClick={() => {
                    if (window.confirm('Delete this note forever? This cannot be undone.')) void purgeNote(userId, note.id);
                  }}
                >
                  Delete forever
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TrashModal;
