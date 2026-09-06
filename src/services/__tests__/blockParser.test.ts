import { describe, it, expect, beforeEach } from 'vitest';
import { parseHtmlToBlocks, parseBlocksToHtml } from '../blockParser';
import { getDerivedBlocksFromNote, updateNoteFromBlocks, verifyNoteConversionIntegrity } from '../migration';
import { isFeatureEnabled, setFeatureFlag, resetFeatureFlags } from '../../config/featureFlags';
import type { Note } from '../../types';

describe('NoteNirman 2.0 P0 Suite — Block Parser & Migration Safety', () => {

  beforeEach(() => {
    resetFeatureFlags();
  });

  // 1. Empty HTML
  it('1. should handle empty HTML strings gracefully', () => {
    expect(parseHtmlToBlocks('')).toEqual([]);
    expect(parseHtmlToBlocks('   ')).toEqual([]);
    expect(parseBlocksToHtml([])).toBe('');
  });

  // 2. Paragraphs
  it('2. should parse standard paragraph elements', () => {
    const html = '<p>Hello NoteNirman 2.0</p>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].content).toBe('Hello NoteNirman 2.0');
    expect(parseBlocksToHtml(blocks)).toContain('<p data-block-id="');
    expect(parseBlocksToHtml(blocks)).toContain('Hello NoteNirman 2.0</p>');
  });

  // 3. Headings
  it('3. should parse H1, H2, and H3 headings with levels', () => {
    const html = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].properties.level).toBe(1);
    expect(blocks[1].type).toBe('heading');
    expect(blocks[1].properties.level).toBe(2);
    expect(blocks[2].type).toBe('heading');
    expect(blocks[2].properties.level).toBe(3);
  });

  // 4. Lists
  it('4. should parse bullet and numbered lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Step 1</li></ol>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('bulletList');
    expect(blocks[1].type).toBe('numberedList');
  });

  // 5. Nested formatting
  it('5. should preserve nested formatting inline tags', () => {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em> and <u>underline</u></p>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].content).toContain('<strong>bold</strong>');
    expect(blocks[0].content).toContain('<em>italic</em>');
    expect(blocks[0].content).toContain('<u>underline</u>');
  });

  // 6. Links
  it('6. should parse anchor links cleanly', () => {
    const html = '<p>Check <a href="https://notenirman.app">NoteNirman</a></p>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].content).toContain('<a href="https://notenirman.app">NoteNirman</a>');
  });

  // 7. Images
  it('7. should parse image elements with src and caption properties', () => {
    const html = '<img src="https://example.com/logo.png" alt="Logo Caption" />';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('image');
    expect(blocks[0].properties.url).toBe('https://example.com/logo.png');
    expect(blocks[0].properties.caption).toBe('Logo Caption');
  });

  // 8. Code blocks
  it('8. should parse code blocks and preserve programming language class', () => {
    const html = '<pre><code class="language-typescript">const x: number = 42;</code></pre>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].properties.language).toBe('typescript');
    expect(blocks[0].content).toContain('const x: number = 42;');
  });

  // 9. Blockquotes
  it('9. should parse blockquote elements', () => {
    const html = '<blockquote>Knowledge is power.</blockquote>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].type).toBe('quote');
    expect(blocks[0].content).toBe('Knowledge is power.');
  });

  // 10. Tables
  it('10. should parse HTML table elements intact', () => {
    const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].type).toBe('table');
    expect(blocks[0].content).toContain('Cell 1');
  });

  // 11. Checklists / Tasks
  it('11. should parse TipTap task lists and task items', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">Completed task</li></ul>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].type).toBe('checklist');
    expect(blocks[0].content).toContain('Completed task');
  });

  // 12. Unsupported HTML (Fallback handling)
  it('12. should preserve unsupported custom HTML tags using non-destructive fallback', () => {
    const html = '<widget-custom-element data-foo="bar">Custom Widget</widget-custom-element>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].properties.rawHtml).toBe('<widget-custom-element data-foo="bar">Custom Widget</widget-custom-element>');
    expect(parseBlocksToHtml(blocks)).toBe(html);
  });

  // 13. Malformed HTML recovery
  it('13. should safely recover from unclosed or malformed HTML tags', () => {
    const html = '<p>Unclosed paragraph <b>bold';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].content).toContain('Unclosed paragraph');
  });

  // 14. Empty block filtering
  it('14. should assign correct sequential positions to parsed blocks', () => {
    const html = '<p>First</p><p>Second</p><p>Third</p>';
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].position).toBe(0);
    expect(blocks[1].position).toBe(1);
    expect(blocks[2].position).toBe(2);
  });

  // 15. Stable Block IDs (data-block-id attribute)
  it('15. should extract and preserve existing data-block-id attributes across parses', () => {
    const stableId = '550e8400-e29b-41d4-a716-446655440000';
    const html = `<p data-block-id="${stableId}">Persistent block</p>`;
    const blocks = parseHtmlToBlocks(html, 'note-1');
    expect(blocks[0].id).toBe(stableId);

    const reSerialized = parseBlocksToHtml(blocks);
    expect(reSerialized).toContain(`data-block-id="${stableId}"`);
  });

  // 16. Deterministic conversion idempotency
  it('16. should perform idempotent roundtrip conversion HTML -> Block -> HTML -> Block', () => {
    const inputHtml = '<p>Idempotency test</p>';
    const blocks1 = parseHtmlToBlocks(inputHtml, 'note-1');
    const html1 = parseBlocksToHtml(blocks1);

    const blocks2 = parseHtmlToBlocks(html1, 'note-1');
    expect(blocks2[0].id).toBe(blocks1[0].id); // ID stability check
    expect(blocks2[0].content).toBe(blocks1[0].content);
  });

  // 17. Roundtrip fidelity (HTML -> Block[] -> HTML)
  it('17. should maintain roundtrip content fidelity', () => {
    const originalHtml = '<h1>Title</h1><p>Body paragraph</p><div class="callout"><span class="callout-icon">💡</span><div class="callout-content">Callout text</div></div>';
    const blocks = parseHtmlToBlocks(originalHtml, 'note-1');
    const resultHtml = parseBlocksToHtml(blocks);

    expect(resultHtml).toContain('Title');
    expect(resultHtml).toContain('Body paragraph');
    expect(resultHtml).toContain('Callout text');
  });

  // 18. Migration non-destructiveness
  it('18. should leave original Note object content intact during derived block extraction', () => {
    const originalNote: Note = {
      id: 'note-123',
      title: 'Original Note',
      content: '<p>Original content</p>',
      tags: ['test'],
      createdAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z',
      isPinned: false,
      priority: 'none',
    };

    const derivedState = getDerivedBlocksFromNote(originalNote);
    expect(derivedState.isDerived).toBe(true);
    expect(derivedState.hasErrors).toBe(false);
    expect(derivedState.blocks).toHaveLength(1);
    expect(originalNote.content).toBe('<p>Original content</p>'); // Untouched
  });

  // 19. Feature Flag safety
  it('19. should enforce feature flags defaulting to false for 2.0 features', () => {
    expect(isFeatureEnabled('BLOCK_EDITOR')).toBe(false);
    expect(isFeatureEnabled('KNOWLEDGE_GRAPH')).toBe(false);
    expect(isFeatureEnabled('CANVAS')).toBe(false);
    expect(isFeatureEnabled('DATABASES')).toBe(false);
    expect(isFeatureEnabled('CRDT_COLLAB')).toBe(false);

    setFeatureFlag('BLOCK_EDITOR', true);
    expect(isFeatureEnabled('BLOCK_EDITOR')).toBe(true);
  });

  // 20. Existing Note behavior & Integrity verification
  it('20. should pass note conversion integrity verification for valid notes', () => {
    const note: Note = {
      id: 'note-456',
      title: 'Sample',
      content: '<h2>Heading</h2><p>Paragraph</p>',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      priority: 'high',
    };

    expect(verifyNoteConversionIntegrity(note)).toBe(true);
    const updated = updateNoteFromBlocks(note, parseHtmlToBlocks(note.content, note.id));
    expect(updated.id).toBe(note.id);
    expect(updated.title).toBe(note.title);
    expect(updated.content).toContain('Heading');
  });

});
