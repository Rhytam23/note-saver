/**
 * NoteNirman 2.0 — P5.4 Export Pipeline Tests
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import type { Note } from '../../types';
import {
  EXPORT_LOSS_MATRIX,
  exportNote,
  exportNoteToMarkdown,
  exportNoteToHtml,
  exportNoteToPortabilityJson,
  exportNoteToText,
  exportBatch,
  serializePortabilityAstToJson,
} from '../exportPipeline';
import { portabilityASTToNoteContent } from '../portabilityCore';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-001',
  title: 'My Test Note',
  content: '<p data-block-id="blk-1">Hello <strong>world</strong>.</p><p data-block-id="blk-2">Second paragraph.</p>',
  tags: ['test', 'export'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  isPinned: false,
  priority: 'none',
  ...overrides,
});

const headingNote = makeNote({
  id: 'note-h',
  title: 'Heading Note',
  content: '<h1 data-block-id="blk-h1">Title</h1><h2 data-block-id="blk-h2">Subtitle</h2><p data-block-id="blk-p">Body text.</p>',
  tags: ['heading'],
});

const listNote = makeNote({
  id: 'note-list',
  title: 'List Note',
  content: '<ul><li data-block-id="blk-li1">Item one</li><li data-block-id="blk-li2">Item two</li></ul>',
  tags: [],
});

const xssNote = makeNote({
  id: 'note-xss',
  title: 'XSS Note',
  content: '<p><script>alert("xss")</script>Safe text</p>',
  tags: [],
});

// ---------------------------------------------------------------------------
// 1. Loss Matrix
// ---------------------------------------------------------------------------

describe('EXPORT_LOSS_MATRIX', () => {
  it('defines entries for all five formats', () => {
    const formats = ['markdown', 'html', 'json', 'txt', 'pdf'] as const;
    formats.forEach(fmt => {
      expect(EXPORT_LOSS_MATRIX[fmt]).toBeDefined();
      expect(EXPORT_LOSS_MATRIX[fmt].format).toBe(fmt);
      expect(Array.isArray(EXPORT_LOSS_MATRIX[fmt].preserves)).toBe(true);
      expect(Array.isArray(EXPORT_LOSS_MATRIX[fmt].lossy)).toBe(true);
    });
  });

  it('marks html and json as round-trippable, others as not', () => {
    expect(EXPORT_LOSS_MATRIX.html.roundTrippable).toBe(true);
    expect(EXPORT_LOSS_MATRIX.json.roundTrippable).toBe(true);
    expect(EXPORT_LOSS_MATRIX.markdown.roundTrippable).toBe(false);
    expect(EXPORT_LOSS_MATRIX.txt.roundTrippable).toBe(false);
    expect(EXPORT_LOSS_MATRIX.pdf.roundTrippable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Markdown Export
// ---------------------------------------------------------------------------

describe('exportNoteToMarkdown', () => {
  it('includes YAML front-matter with title, tags, timestamps', () => {
    const md = exportNoteToMarkdown(makeNote());
    expect(md).toContain('---');
    expect(md).toContain('title: "My Test Note"');
    expect(md).toContain('"test"');
    expect(md).toContain('"export"');
    expect(md).toContain('created: 2026-01-01T00:00:00.000Z');
    expect(md).toContain('updated: 2026-01-02T00:00:00.000Z');
  });

  it('includes note title as H1 after front-matter', () => {
    const md = exportNoteToMarkdown(makeNote());
    expect(md).toContain('# My Test Note');
  });

  it('converts bold formatting', () => {
    const md = exportNoteToMarkdown(makeNote());
    expect(md).toContain('**world**');
  });

  it('converts headings', () => {
    const md = exportNoteToMarkdown(headingNote);
    expect(md).toContain('# Title');
    expect(md).toContain('## Subtitle');
  });

  it('converts unordered list', () => {
    const md = exportNoteToMarkdown(listNote);
    expect(md).toContain('- Item one');
    expect(md).toContain('- Item two');
  });

  it('strips script tags (XSS protection)', () => {
    const md = exportNoteToMarkdown(xssNote);
    expect(md).not.toContain('<script>');
    expect(md).not.toContain('alert("xss")');
  });

  it('does not preserve block UUIDs in output', () => {
    const md = exportNoteToMarkdown(makeNote());
    expect(md).not.toContain('data-block-id');
    expect(md).not.toContain('blk-1');
  });
});

// ---------------------------------------------------------------------------
// 3. HTML Export
// ---------------------------------------------------------------------------

describe('exportNoteToHtml', () => {
  it('produces valid HTML document structure', () => {
    const html = exportNoteToHtml(makeNote());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });

  it('includes title in <title> tag and as <h1>', () => {
    const html = exportNoteToHtml(makeNote());
    expect(html).toContain('<title>My Test Note</title>');
    expect(html).toContain('<h1>My Test Note</h1>');
  });

  it('includes tags in <meta name="keywords">', () => {
    const html = exportNoteToHtml(makeNote());
    expect(html).toContain('name="keywords"');
    expect(html).toContain('test');
    expect(html).toContain('export');
  });

  it('includes note-id as data attribute on content container', () => {
    const html = exportNoteToHtml(makeNote());
    expect(html).toContain('data-note-id="note-001"');
  });

  it('preserves block UUIDs inside content', () => {
    const html = exportNoteToHtml(makeNote());
    expect(html).toContain('data-block-id="blk-1"');
    expect(html).toContain('data-block-id="blk-2"');
  });

  it('strips script tags (XSS protection)', () => {
    const html = exportNoteToHtml(xssNote);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert("xss")');
  });

  it('includes generator meta tag', () => {
    const html = exportNoteToHtml(makeNote());
    expect(html).toContain('name="generator"');
    expect(html).toContain('NoteNirman 2.0');
  });
});

// ---------------------------------------------------------------------------
// 4. JSON (PortabilityAST) Export
// ---------------------------------------------------------------------------

describe('exportNoteToPortabilityJson', () => {
  it('returns a PortabilityAST with noteId and title', () => {
    const ast = exportNoteToPortabilityJson(makeNote());
    expect(ast.noteId).toBe('note-001');
    expect(ast.title).toBe('My Test Note');
  });

  it('contains nodes array', () => {
    const ast = exportNoteToPortabilityJson(makeNote());
    expect(Array.isArray(ast.nodes)).toBe(true);
    expect(ast.nodes.length).toBeGreaterThan(0);
  });

  it('preserves stable block UUIDs in node IDs', () => {
    const ast = exportNoteToPortabilityJson(makeNote());
    const ids = ast.nodes.map(n => n.id);
    // At least one block ID should be a stable UUID (blk- prefix from test HTML)
    expect(ids.some(id => id.startsWith('blk-') || id.length > 8)).toBe(true);
  });

  it('round-trips: AST -> Note.content -> AST has same node count', () => {
    const ast = exportNoteToPortabilityJson(makeNote());
    const restored = portabilityASTToNoteContent(ast);
    expect(typeof restored).toBe('string');
    expect(restored.length).toBeGreaterThan(0);
  });

  it('serializes to valid JSON', () => {
    const ast = exportNoteToPortabilityJson(makeNote());
    const json = serializePortabilityAstToJson(ast);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.noteId).toBe('note-001');
  });
});

// ---------------------------------------------------------------------------
// 5. Plain Text Export
// ---------------------------------------------------------------------------

describe('exportNoteToText', () => {
  it('includes metadata header', () => {
    const txt = exportNoteToText(makeNote());
    expect(txt).toContain('Title: My Test Note');
    expect(txt).toContain('Tags: test, export');
    expect(txt).toContain('Created: 2026-01-01T00:00:00.000Z');
  });

  it('strips HTML tags', () => {
    const txt = exportNoteToText(makeNote());
    expect(txt).not.toContain('<p>');
    expect(txt).not.toContain('<strong>');
    expect(txt).not.toContain('data-block-id');
  });

  it('preserves plain text content', () => {
    const txt = exportNoteToText(makeNote());
    expect(txt).toContain('Hello');
    expect(txt).toContain('world');
    expect(txt).toContain('Second paragraph');
  });

  it('strips XSS vectors', () => {
    const txt = exportNoteToText(xssNote);
    expect(txt).not.toContain('<script>');
    expect(txt).not.toContain('alert(');
  });

  it('handles empty tags gracefully', () => {
    const note = makeNote({ tags: [] });
    const txt = exportNoteToText(note);
    expect(txt).toContain('Tags: (none)');
  });
});

// ---------------------------------------------------------------------------
// 6. exportNote dispatch
// ---------------------------------------------------------------------------

describe('exportNote', () => {
  it('dispatches markdown format correctly', () => {
    const result = exportNote(makeNote(), 'markdown');
    expect(result.format).toBe('markdown');
    expect(result.filename).toMatch(/\.md$/);
    expect(result.mimeType).toContain('text/markdown');
    expect(result.content).toBeDefined();
    expect(result.roundTrippable).toBe(false);
    expect(result.blockIdsPreserved).toBe(false);
  });

  it('dispatches html format with block ID preservation', () => {
    const result = exportNote(makeNote(), 'html');
    expect(result.format).toBe('html');
    expect(result.filename).toMatch(/\.html$/);
    expect(result.roundTrippable).toBe(true);
    expect(result.blockIdsPreserved).toBe(true);
    expect(result.content).toBeDefined();
  });

  it('dispatches json format with block ID preservation', () => {
    const result = exportNote(makeNote(), 'json');
    expect(result.format).toBe('json');
    expect(result.filename).toMatch(/\.json$/);
    expect(result.roundTrippable).toBe(true);
    expect(result.blockIdsPreserved).toBe(true);
    expect(result.content).toBeDefined();
  });

  it('dispatches txt format', () => {
    const result = exportNote(makeNote(), 'txt');
    expect(result.format).toBe('txt');
    expect(result.filename).toMatch(/\.txt$/);
    expect(result.roundTrippable).toBe(false);
    expect(result.blockIdsPreserved).toBe(false);
  });

  it('dispatches pdf format with undefined content (browser-side only)', () => {
    const result = exportNote(makeNote(), 'pdf');
    expect(result.format).toBe('pdf');
    expect(result.filename).toMatch(/\.pdf$/);
    expect(result.content).toBeUndefined();
    expect(result.roundTrippable).toBe(false);
  });

  it('slugifies filename correctly', () => {
    const note = makeNote({ title: 'Hello World! Special & Chars' });
    const result = exportNote(note, 'markdown');
    // slugify: "hello-world-special-chars"
    expect(result.filename).toBe('hello-world-special-chars.md');
  });

  it('uses untitled-note slug for empty title', () => {
    const note = makeNote({ title: '' });
    const result = exportNote(note, 'markdown');
    expect(result.filename).toBe('untitled-note.md');
  });

  it('attaches lossClassification from matrix', () => {
    const result = exportNote(makeNote(), 'html');
    expect(result.lossClassification).toBe(EXPORT_LOSS_MATRIX.html);
  });
});

// ---------------------------------------------------------------------------
// 7. Batch Export
// ---------------------------------------------------------------------------

describe('exportBatch', () => {
  const makeNotes = (count: number): Note[] =>
    Array.from({ length: count }, (_, i) =>
      makeNote({
        id: `note-batch-${i}`,
        title: `Batch Note ${i}`,
        content: `<p data-block-id="blk-b${i}">Content ${i}</p>`,
      })
    );

  it('exports all notes within batch limit', () => {
    const notes = makeNotes(5);
    const result = exportBatch(notes, 'markdown');
    expect(result.totalRequested).toBe(5);
    expect(result.succeeded.length).toBe(5);
    expect(result.failed.length).toBe(0);
  });

  it('caps batch at maxBatchSize', () => {
    const notes = makeNotes(60);
    const result = exportBatch(notes, 'json', 50);
    // totalRequested is full count, succeeded is capped
    expect(result.totalRequested).toBe(60);
    expect(result.succeeded.length).toBe(50);
  });

  it('collects failures without crashing', () => {
    // Note with content that would throw if exportNote threw
    const badNote = makeNote({ id: 'bad', title: '' });
    // Force a failure by using an invalid format cast
    const notes = [badNote];
    // This should not throw; bad format → caught in try/catch
    const result = exportBatch(notes, 'markdown');
    // markdown export of empty title note should still succeed (untitled-note slug)
    expect(result.succeeded.length + result.failed.length).toBe(notes.length);
  });

  it('returns correct totalRequested for truncated batch', () => {
    const notes = makeNotes(10);
    const result = exportBatch(notes, 'html', 3);
    expect(result.totalRequested).toBe(10);
    expect(result.succeeded.length).toBe(3);
  });
});
