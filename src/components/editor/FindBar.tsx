import React, { useEffect, useReducer, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { findPluginKey } from '../../extensions/FindInNote';
import { useSeason } from '../../contexts/SeasonalContext';

interface FindBarProps {
  editor: Editor;
  onClose: () => void;
}

const FindBar: React.FC<FindBarProps> = ({ editor, onClose }) => {
  const { colors } = useSeason();
  const [query, setQuery] = useState('');
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    editor.on('transaction', rerender);
    return () => {
      editor.off('transaction', rerender);
      editor.commands.setFindQuery('');
    };
  }, [editor]);

  const state = findPluginKey.getState(editor.state);
  const total = state?.matches.length ?? 0;
  const position = total === 0 ? 0 : (state?.current ?? 0) + 1;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor.commands.findStep(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const buttonClass = `px-2 py-1 rounded text-sm border ${colors.border} ${colors.hover} disabled:opacity-40`;

  return (
    <div role="search" className={`flex items-center gap-2 px-3 py-2 border-b ${colors.border} ${colors.bgSimple}`}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          editor.commands.setFindQuery(e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder="Find in note"
        aria-label="Find in note"
        className={`flex-1 min-w-0 px-2 py-1 rounded border bg-transparent text-sm ${colors.border} ${colors.primaryText}`}
      />
      <span className={`text-xs tabular-nums whitespace-nowrap ${colors.secondaryText}`} aria-live="polite">
        {query ? `${position} of ${total}` : ''}
      </span>
      <button type="button" className={buttonClass} disabled={total === 0} onClick={() => editor.commands.findStep(-1)} aria-label="Previous match">
        ↑
      </button>
      <button type="button" className={buttonClass} disabled={total === 0} onClick={() => editor.commands.findStep(1)} aria-label="Next match">
        ↓
      </button>
      <button type="button" className={buttonClass} onClick={onClose} aria-label="Close find">
        ✕
      </button>
    </div>
  );
};

export default FindBar;
