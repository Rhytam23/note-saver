// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  importSingleFile,
  importBatchFiles,
  detectImportFormat,
  parseMarkdownToHtml,
  parseTextToHtml,
  parseCsvToHtml,
  sanitizeImportHtml,
  type ImportFilePayload,
} from '../importPipeline';
import * as localDb from '../localDb';
import type { Note } from '../../types';

describe('Extensible Multi-Format Import Pipeline (P5.3)', () => {
  const userId = 'user-import-test';
  const mockNotesStore = new Map<string, Note>();

  beforeEach(() => {
    mockNotesStore.clear();

    vi.spyOn(localDb, 'putLocalNote').mockImplementation(async (_u, note) => {
      mockNotesStore.set(note.id, { ...note });
    });

    vi.spyOn(localDb, 'enqueueOp').mockImplementation(async (op) => {
      return {
        opId: `op-${Date.now()}`,
        userId: op.userId,
        entity: op.entity,
        entityId: op.entityId,
        action: op.action,
        baseVersion: op.baseVersion,
        attempts: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
      };
    });
  });

  it('1. Detects import formats accurately by extension and content', () => {
    expect(detectImportFormat('document.md', '# Hello')).toBe('markdown');
    expect(detectImportFormat('index.html', '<p>Hello</p>')).toBe('html');
    expect(detectImportFormat('data.csv', 'Name,Age')).toBe('csv');
    expect(detectImportFormat('data.json', '{"title":"Test"}')).toBe('json');
    expect(detectImportFormat('notes.txt', 'Plain text content')).toBe('text');
  });

  it('2. Parses Markdown text into HTML with stable block UUIDs and frontmatter tags', () => {
    const mdContent = `---
title: "Markdown Import Test"
tags: [engineering, architecture]
---
# Main Header
This is a paragraph.
- Bullet item 1
- Bullet item 2
> Blockquote text
`;

    const parsed = parseMarkdownToHtml(mdContent);
    expect(parsed.title).toBe('Markdown Import Test');
    expect(parsed.tags).toEqual(['engineering', 'architecture']);
    expect(parsed.html).toContain('<h1 data-block-id="blk_');
    expect(parsed.html).toContain('Main Header');
    expect(parsed.html).toContain('<ul data-block-id="blk_');
    expect(parsed.html).toContain('Bullet item 1');
    expect(parsed.html).toContain('<blockquote data-block-id="blk_');
  });

  it('3. Sanitizes imported HTML strings stripping XSS script tags and iframes', () => {
    const dangerousHtml = '<h1>Safe Header</h1><script>alert("XSS")</script><iframe src="malicious.html"></iframe><p onload="alert(1)">Text</p>';
    const sanitized = sanitizeImportHtml(dangerousHtml);

    expect(sanitized).toContain('<h1>Safe Header</h1>');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('onload');
  });

  it('4. Parses Plain Text into paragraphs with stable block UUIDs', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const html = parseTextToHtml(text);

    expect(html).toContain('<p data-block-id="blk_');
    expect(html).toContain('First paragraph.');
    expect(html).toContain('Second paragraph.');
  });

  it('5. Converts CSV content into structured HTML table with stable block UUIDs', () => {
    const csv = 'Name,Role,Location\nAlice,Engineer,San Francisco\nBob,Designer,London';
    const html = parseCsvToHtml(csv);

    expect(html).toContain('<table data-block-id="blk_');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>Alice</td>');
  });

  it('6. Imports a single Markdown file successfully into localDb', async () => {
    const payload: ImportFilePayload = {
      filename: 'architecture.md',
      content: '# Architecture Guide\n\nPreserves Note.content HTML as canonical format.',
      userId,
    };

    const res = await importSingleFile(payload);
    expect(res.success).toBe(true);
    expect(res.note).toBeDefined();
    expect(res.note?.title).toBe('Architecture Guide');
    expect(res.note?.content).toContain('<h1 data-block-id="blk_');

    expect(mockNotesStore.has(res.note!.id)).toBe(true);
  });

  it('7. Rejects oversized single files exceeding security limits', async () => {
    const hugePayload: ImportFilePayload = {
      filename: 'huge.txt',
      content: 'A',
      sizeBytes: 60 * 1024 * 1024, // 60MB > 50MB limit
      userId,
    };

    const res = await importSingleFile(hugePayload);
    expect(res.success).toBe(false);
    expect(res.error).toContain('exceeds maximum import limit of 50MB');
  });

  it('8. Processes batch imports in staged memory batches with isolated error handling', async () => {
    const files: ImportFilePayload[] = [
      { filename: 'file1.md', content: '# File 1', userId },
      { filename: 'file2.txt', content: 'File 2 text', userId },
      { filename: 'huge_invalid.txt', content: 'X', sizeBytes: 100 * 1024 * 1024, userId }, // fails
    ];

    const result = await importBatchFiles(files);
    expect(result.totalProcessed).toBe(3);
    expect(result.importedNotes.length).toBe(2);
    expect(result.failedFiles.length).toBe(1);
    expect(result.failedFiles[0].filename).toBe('huge_invalid.txt');
  });
});
