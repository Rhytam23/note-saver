import React, { useEffect, useRef, useState } from 'react';
import { useSeason } from '../contexts/SeasonalContext';

export interface PassphraseModalProps {
  /** 'create' asks for the passphrase twice and shows the no-recovery warning. 'unlock' asks once. */
  mode: 'create' | 'unlock';
  title: string;
  error?: string | null;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

const PassphraseModal: React.FC<PassphraseModalProps> = ({ mode, title, error, onSubmit, onCancel }) => {
  const { colors } = useSeason();
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (!value) return;
    if (mode === 'create') {
      if (value.length < 6) {
        setLocalError('Use at least 6 characters.');
        return;
      }
      if (value !== confirm) {
        setLocalError('The two entries do not match.');
        return;
      }
    }
    setLocalError(null);
    onSubmit(value);
  };

  const inputClass = `w-full px-2 py-1.5 rounded border bg-transparent text-sm ${colors.border}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full max-w-sm rounded-xl border shadow-2xl p-4 space-y-3 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
      >
        <h3 className="font-semibold">{title}</h3>
        {mode === 'create' && (
          <p className={`text-xs ${colors.secondaryText}`}>
            There is no way to recover this note if you forget this passphrase. Nobody, including us, can reset it.
          </p>
        )}
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Passphrase"
          className={inputClass}
        />
        {mode === 'create' && (
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm passphrase"
            className={inputClass}
          />
        )}
        {(localError || error) && <p className="text-sm text-red-500">{localError || error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className={`px-3 py-1.5 rounded border text-sm ${colors.border} ${colors.hover}`}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!value || (mode === 'create' && !confirm)}
            onClick={submit}
            className="px-3 py-1.5 rounded text-sm font-semibold bg-accent text-primary-bg disabled:opacity-50"
          >
            {mode === 'create' ? 'Lock note' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassphraseModal;
