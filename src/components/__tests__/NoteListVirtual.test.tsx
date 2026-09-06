/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteListVirtual } from '../NoteListVirtual';
import type { Note } from '../../types';

describe('Phase 5 — Performance & Virtualization (P5.10)', () => {
  const mockNotes: Note[] = Array.from({ length: 100 }, (_, i) => ({
    id: `note_${i}`,
    title: `Note ${i}`,
    content: `<p>Content ${i}</p>`,
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
    updatedAt: new Date(Date.now() - i * 1000).toISOString(),
    tags: [],
    isPinned: false,
    priority: 'medium',
  }));

  it('renders only visible window items out of 100 synthetic notes', () => {
    const onSelectNote = vi.fn();
    render(
      <NoteListVirtual
        notes={mockNotes}
        onSelectNote={onSelectNote}
        containerHeight={300}
        itemHeight={50}
      />
    );

    const list = screen.getByTestId('virtual-note-list');
    expect(list).toBeDefined();

    // Out of 100 notes, only top items (index 0 to ~8) are rendered in DOM
    const item0 = screen.getByTestId('note-item-note_0');
    expect(item0).toBeDefined();

    // Deep element note_90 should not be rendered initially
    const item90 = screen.queryByTestId('note-item-note_90');
    expect(item90).toBeNull();
  });

  it('triggers selection handler when clicking note item', () => {
    const onSelectNote = vi.fn();
    render(
      <NoteListVirtual
        notes={mockNotes}
        onSelectNote={onSelectNote}
        containerHeight={300}
        itemHeight={50}
      />
    );

    const item0 = screen.getByTestId('note-item-note_0');
    fireEvent.click(item0);

    expect(onSelectNote).toHaveBeenCalledWith('note_0');
  });
});
