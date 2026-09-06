import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CopilotDrawer } from '../CopilotDrawer';

describe('Phase 4 — AI Copilot UI Component (P4.11)', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <CopilotDrawer isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render header, quick action buttons and input when isOpen is true', () => {
    render(
      <CopilotDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeNoteId="note-1"
        activeNoteTitle="Test Note"
      />
    );

    expect(screen.getByText('NoteNirman AI Copilot')).toBeTruthy();
    expect(screen.getByText(/Summarize Note/i)).toBeTruthy();
    expect(screen.getByText(/Action Items/i)).toBeTruthy();
    expect(screen.getByText(/Generate Outline/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Ask Copilot about notes or workspace/i)).toBeTruthy();
  });

  it('should render selection-specific action chips when text is selected', () => {
    render(
      <CopilotDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedBlockText="Highlighted snippet of text"
      />
    );

    expect(screen.getByText(/Explain Selection/i)).toBeTruthy();
    expect(screen.getByText(/Rewrite Selection/i)).toBeTruthy();
  });
});
