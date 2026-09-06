import React, { useState, useRef, useCallback } from 'react';
import type { Note } from '../types';

export interface NoteListVirtualProps {
  notes: Note[];
  selectedNoteId?: string;
  onSelectNote: (noteId: string) => void;
  itemHeight?: number;
  containerHeight?: number;
}

export const NoteListVirtual: React.FC<NoteListVirtualProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  itemHeight = 64,
  containerHeight = 600,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = notes.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(
    notes.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 2
  );

  const visibleNotes = notes.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative',
        width: '100%',
      }}
      data-testid="virtual-note-list"
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleNotes.map((note, idx) => {
          const actualIndex = startIndex + idx;
          const top = actualIndex * itemHeight;
          const isSelected = note.id === selectedNoteId;

          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height: itemHeight,
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
              data-testid={`note-item-${note.id}`}
            >
              <div
                style={{
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '14px',
                  color: isSelected ? '#2563eb' : '#1f2937',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {note.title || 'Untitled Note'}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '2px',
                }}
              >
                {new Date(note.updatedAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
