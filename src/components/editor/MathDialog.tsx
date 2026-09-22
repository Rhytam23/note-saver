import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { useSeason } from '../../contexts/SeasonalContext';

export interface MathDialogState {
  latex: string;
  block: boolean;
  /** Position of an existing node being edited; undefined when inserting. */
  pos?: number;
}

interface MathDialogProps {
  state: MathDialogState;
  onSubmit: (latex: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const PLACEHOLDER = 'LaTeX, for example x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';

const MathDialog: React.FC<MathDialogProps> = ({ state, onSubmit, onDelete, onCancel }) => {
  const { colors } = useSeason();
  const [latex, setLatex] = useState(state.latex);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  let previewHtml = '';
  try {
    previewHtml = katex.renderToString(latex || '\\square', { displayMode: state.block, throwOnError: false });
  } catch {
    previewHtml = '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onCancel} role="dialog" aria-modal="true" aria-label="Edit equation">
      <div className={`w-full max-w-md rounded-xl border shadow-2xl p-4 space-y-3 ${colors.surface} ${colors.border} ${colors.primaryText}`} onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold">{state.pos === undefined ? 'Insert equation' : 'Edit equation'}</h3>
        <textarea
          ref={inputRef}
          value={latex}
          onChange={e => setLatex(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit(latex.trim());
            if (e.key === 'Escape') onCancel();
          }}
          rows={3}
          placeholder={PLACEHOLDER}
          className={`w-full px-2 py-1.5 rounded border bg-transparent font-mono text-sm ${colors.border}`}
        />
        <div className={`min-h-[3rem] p-2 rounded border overflow-x-auto ${colors.border}`} aria-label="Preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        <div className="flex items-center justify-between">
          <div>
            {onDelete && (
              <button type="button" onClick={onDelete} className="text-sm text-red-500 hover:underline">Remove</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className={`px-3 py-1.5 rounded border text-sm ${colors.border} ${colors.hover}`}>Cancel</button>
            <button
              type="button"
              disabled={!latex.trim()}
              onClick={() => onSubmit(latex.trim())}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-accent text-primary-bg disabled:opacity-50"
            >
              {state.pos === undefined ? 'Insert' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathDialog;
