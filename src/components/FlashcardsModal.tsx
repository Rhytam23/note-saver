import React, { useEffect, useMemo, useState } from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import type { Note } from '../types';
import * as localDb from '../services/localDb';
import {
  extractAllFlashcards, newCardState, scheduleReview, selectSession,
  type CardState, type Flashcard, type Grade,
} from '../services/flashcards';

interface FlashcardsModalProps {
  userId: string;
  notes: Note[];
  onClose: () => void;
}

// Deliberately not prefixed with "<userId>:" so signing out does not wipe review progress.
const progressKey = (userId: string) => `flashcards:${userId}`;

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
];

const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ userId, notes, onClose }) => {
  const { colors } = useSeason();
  const allCards = useMemo(() => extractAllFlashcards(notes), [notes]);
  const [states, setStates] = useState<Record<string, CardState> | null>(null);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [total, setTotal] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = (await localDb.getMeta<Record<string, CardState>>(progressKey(userId))) ?? {};
      if (cancelled) return;
      const session = selectSession(allCards, saved, Date.now());
      setStates(saved);
      setQueue(session);
      setTotal(session.length);
    })();
    return () => {
      cancelled = true;
    };
    // Build the session once when the modal opens; later note edits must not reshuffle it.
    // (allCards is intentionally excluded from the dependency array for that reason.)
  }, [userId]);

  const current = queue[0];

  const answer = async (grade: Grade) => {
    if (!current || !states) return;
    const now = Date.now();
    const next = scheduleReview(states[current.id] ?? newCardState(now), grade, now);
    const updated = { ...states, [current.id]: next };
    setStates(updated);
    setRevealed(false);
    // A card marked "Again" comes back later in this same session.
    setQueue(prev => (grade === 'again' ? [...prev.slice(1), current] : prev.slice(1)));
    await localDb.setMeta(progressKey(userId), updated);
  };

  const buttonClass = `px-4 py-2 rounded-lg border text-sm ${colors.border} ${colors.hover}`;
  const done = states !== null && queue.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Flashcards"
    >
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl p-5 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Flashcards</h2>
          <button type="button" onClick={onClose} className={`px-2 py-1 rounded ${colors.hover}`} aria-label="Close">
            ✕
          </button>
        </div>

        {states === null && <p className={colors.secondaryText}>Loading…</p>}

        {allCards.length === 0 && states !== null && (
          <div className={`space-y-2 text-sm ${colors.secondaryText}`}>
            <p>You have no flashcards yet.</p>
            <p>
              In any note, write a line like <span className="font-mono">Powerhouse of the cell:: Mitochondria</span>.
              Every line with <span className="font-mono">::</span> becomes a card.
            </p>
          </div>
        )}

        {allCards.length > 0 && done && (
          <p className={colors.secondaryText}>
            {total === 0
              ? 'Nothing is due right now. Come back later.'
              : `Done. You reviewed ${total} card${total === 1 ? '' : 's'}.`}
          </p>
        )}

        {current && (
          <div className="space-y-4">
            <p className={`text-xs ${colors.secondaryText}`}>
              {total - queue.length + 1} of {total} · from {current.noteTitle || 'Untitled'}
            </p>
            <div className={`p-5 rounded-lg border min-h-[7rem] ${colors.border}`}>
              <p className="text-lg">{current.question}</p>
              {revealed && <p className="mt-4 pt-4 border-t text-lg text-accent">{current.answer}</p>}
            </div>
            {!revealed ? (
              <button type="button" className={`${buttonClass} w-full`} onClick={() => setRevealed(true)}>
                Show answer
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(g => (
                  <button key={g.grade} type="button" className={buttonClass} onClick={() => void answer(g.grade)}>
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardsModal;
