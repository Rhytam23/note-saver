import React, { useMemo } from 'react';
import type { Note } from '../../types';
import { useSeason } from '../../contexts/SeasonalContext';
import { findBacklinks, resolveOutgoingLinks } from '../../services/noteLinks';

interface LinkedNotesProps {
  note: Note;
  notes: Note[];
  onOpenNote: (id: string) => void;
  onCreateNote: (title: string) => void;
}

/** Shows [[wiki links]] from this note and the notes that link back to it. */
const LinkedNotes: React.FC<LinkedNotesProps> = ({ note, notes, onOpenNote, onCreateNote }) => {
  const { colors } = useSeason();
  const outgoing = useMemo(() => resolveOutgoingLinks(note, notes), [note, notes]);
  const backlinks = useMemo(() => findBacklinks(note, notes), [note, notes]);

  const linkButton = `text-left text-sm underline-offset-2 hover:underline text-accent`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Links in this note</h3>
        {outgoing.length === 0 ? (
          <p className={`text-xs ${colors.secondaryText}`}>
            Type [[Note title]] in the text to link to another note.
          </p>
        ) : (
          <ul className="space-y-1">
            {outgoing.map(link => (
              <li key={link.title} className="flex items-center gap-2">
                {link.target ? (
                  <button type="button" className={linkButton} onClick={() => onOpenNote(link.target!.id)}>
                    {link.target.title || link.title}
                  </button>
                ) : (
                  <>
                    <span className={`text-sm ${colors.secondaryText}`}>{link.title}</span>
                    <button
                      type="button"
                      className={`text-xs px-1.5 py-0.5 rounded border ${colors.border} ${colors.hover}`}
                      onClick={() => onCreateNote(link.title)}
                    >
                      Create
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Linked from</h3>
        {backlinks.length === 0 ? (
          <p className={`text-xs ${colors.secondaryText}`}>No other notes link here yet.</p>
        ) : (
          <ul className="space-y-1">
            {backlinks.map(other => (
              <li key={other.id}>
                <button type="button" className={linkButton} onClick={() => onOpenNote(other.id)}>
                  {other.title || 'Untitled'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LinkedNotes;
