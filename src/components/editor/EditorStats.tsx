import React from 'react';
import { useSeason } from '../../contexts/SeasonalContext';

const WORDS_PER_MINUTE = 200;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Word count, character count and reading time for the open note. */
const EditorStats: React.FC<{ text: string }> = ({ text }) => {
  const { colors } = useSeason();
  const words = countWords(text);
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return (
    <p className={`text-xs tabular-nums ${colors.secondaryText}`} aria-label="Note statistics">
      {words} {words === 1 ? 'word' : 'words'} · {text.length} characters{words > 0 ? ` · ${minutes} min read` : ''}
    </p>
  );
};

export default EditorStats;
