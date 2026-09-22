import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { InlineMath, BlockMath } from '@tiptap/extension-mathematics';
import FindInNote, { findPluginKey } from '../../../extensions/FindInNote';
import { countWords } from '../EditorStats';
import { formatClock } from '../PomodoroTimer';

function makeEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, FindInNote, Table, TableRow, TableHeader, TableCell, InlineMath, BlockMath],
    content,
  });
}

describe('find in note', () => {
  it('finds matches case-insensitively and steps through them', () => {
    const editor = makeEditor('<p>Photosynthesis makes glucose. photosynthesis needs light.</p>');
    editor.commands.setFindQuery('PHOTOSYNTHESIS');

    let state = findPluginKey.getState(editor.state)!;
    expect(state.matches).toHaveLength(2);
    expect(state.current).toBe(0);

    editor.commands.findStep(1);
    state = findPluginKey.getState(editor.state)!;
    expect(state.current).toBe(1);

    editor.commands.findStep(1);
    expect(findPluginKey.getState(editor.state)!.current).toBe(0);
    editor.destroy();
  });

  it('never changes the note content', () => {
    const editor = makeEditor('<p>alpha beta alpha</p>');
    const before = editor.getHTML();
    editor.commands.setFindQuery('alpha');
    editor.commands.findStep(1);
    expect(editor.getHTML()).toBe(before);
    editor.destroy();
  });

  it('clears highlights for an empty query', () => {
    const editor = makeEditor('<p>alpha</p>');
    editor.commands.setFindQuery('alpha');
    editor.commands.setFindQuery('');
    expect(findPluginKey.getState(editor.state)!.matches).toHaveLength(0);
    editor.destroy();
  });
});

describe('tables', () => {
  it('inserts a table and round-trips through HTML', () => {
    const editor = makeEditor('<p>start</p>');
    editor.commands.insertTable({ rows: 2, cols: 3, withHeaderRow: true });
    const html = editor.getHTML();
    expect(html).toContain('<table');
    expect(html.match(/<th/g)).toHaveLength(3);

    const reloaded = makeEditor(html);
    expect(reloaded.getHTML()).toBe(html);
    editor.destroy();
    reloaded.destroy();
  });
});

describe('equations', () => {
  it('stores inline and block LaTeX and keeps it after a reload', () => {
    const editor = makeEditor('<p>x</p>');
    editor.commands.insertInlineMath({ latex: 'E = mc^2' });
    editor.commands.insertBlockMath({ latex: '\\int_0^1 x\\,dx' });
    const html = editor.getHTML();
    expect(html).toContain('E = mc^2');
    expect(html).toContain('\\int_0^1 x\\,dx');

    const reloaded = makeEditor(html);
    expect(reloaded.getHTML()).toContain('E = mc^2');
    editor.destroy();
    reloaded.destroy();
  });
});

describe('editor helpers', () => {
  it('counts words', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('one two  three\nfour')).toBe(4);
  });

  it('formats the timer clock', () => {
    expect(formatClock(25 * 60)).toBe('25:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(0)).toBe('00:00');
  });
});

import { sanitizeImportHtml } from '../../../services/importPipeline';

describe('backup and import keep the new content types', () => {
  it('keeps tables, inline equations, block equations and callouts through sanitising', () => {
    const editor = makeEditor('<p>x</p>');
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    editor.commands.insertInlineMath({ latex: 'a^2' });
    editor.commands.insertBlockMath({ latex: 'b^2' });
    const html = editor.getHTML();

    const cleaned = sanitizeImportHtml(html);
    expect(cleaned).toContain('<table');
    expect(cleaned).toContain('a^2');
    expect(cleaned).toContain('b^2');
    editor.destroy();
  });

  it('still strips scripts and event handlers', () => {
    const cleaned = sanitizeImportHtml('<div onclick="x()">hi<script>alert(1)</script></div>');
    expect(cleaned).not.toContain('script');
    expect(cleaned).not.toContain('onclick');
  });
});
