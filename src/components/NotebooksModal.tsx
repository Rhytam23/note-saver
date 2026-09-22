import React, { useMemo, useState } from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import type { Tag } from '../types';
import { groupNotebooks, buildNotebookTagName } from '../services/notebooks';

interface NotebooksModalProps {
  customTags: Tag[];
  onAddChapter: (tag: Tag) => void;
  onOpenChapter: (tagName: string) => void;
  onClose: () => void;
}

const NotebooksModal: React.FC<NotebooksModalProps> = ({ customTags, onAddChapter, onOpenChapter, onClose }) => {
  const { colors } = useSeason();
  const notebooks = useMemo(() => groupNotebooks(customTags), [customTags]);
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');

  const create = () => {
    if (!subject.trim()) return;
    onAddChapter({ name: buildNotebookTagName(subject, chapter) });
    setSubject('');
    setChapter('');
  };

  const inputClass = `w-full px-2 py-1.5 rounded border bg-transparent text-sm ${colors.border}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Notebooks"
    >
      <div
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl p-5 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notebooks</h2>
          <button type="button" onClick={onClose} className={`px-2 py-1 rounded ${colors.hover}`} aria-label="Close">
            ✕
          </button>
        </div>
        <p className={`text-xs mb-4 ${colors.secondaryText}`}>
          Group notes by subject and chapter. Opening a chapter filters your notes to that tag, the same way clicking a tag in the sidebar does.
        </p>

        <div className={`mb-5 p-3 rounded-lg border space-y-2 ${colors.border}`}>
          <p className={`text-sm font-medium ${colors.secondaryText}`}>New chapter</p>
          <div className="flex gap-2">
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject, e.g. Physics" className={inputClass} />
            <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Chapter, e.g. Waves" className={inputClass} />
          </div>
          <button
            type="button"
            disabled={!subject.trim()}
            onClick={create}
            className="px-3 py-1.5 rounded text-sm font-semibold bg-accent text-primary-bg disabled:opacity-50"
          >
            Add chapter
          </button>
        </div>

        {notebooks.length === 0 && (
          <p className={`text-sm ${colors.secondaryText}`}>No notebooks yet. Add a subject and chapter above, then tag notes with it.</p>
        )}

        <div className="space-y-4">
          {notebooks.map(notebook => (
            <div key={notebook.subject}>
              <h3 className={`text-sm font-semibold mb-1.5 ${colors.primaryText}`}>{notebook.subject}</h3>
              <ul className="space-y-1">
                {notebook.chapters.map(ch => (
                  <li key={ch.tagName}>
                    <button
                      type="button"
                      onClick={() => onOpenChapter(ch.tagName)}
                      className={`text-sm underline-offset-2 hover:underline text-accent`}
                    >
                      {ch.chapter}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotebooksModal;
