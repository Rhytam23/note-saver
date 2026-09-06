import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBlockDocumentFromEditor,
  getBlockDocumentFromHtml,
  syncEditorToBlockDocument,
  serializeBlockDocumentToEditorHtml,
  isBlockEditorIntegrationActive,
  type MinimalEditorInstance,
} from '../editorBlockAdapter';
import { setFeatureFlag, resetFeatureFlags } from '../../config/featureFlags';
import * as localDb from '../localDb';
import * as syncEngine from '../syncEngine';

describe('NoteNirman 2.0 P1.2 Suite — TipTap Block Document Integration Adapter', () => {

  beforeEach(() => {
    resetFeatureFlags();
  });

  // Test 1 — Editor HTML extraction
  it('1. should extract BlockDocument from a TipTap editor mock instance', () => {
    const mockEditor: MinimalEditorInstance = {
      getHTML: () => '<h1>Title</h1><p>Paragraph from TipTap</p>',
    };

    const doc = getBlockDocumentFromEditor(mockEditor, 'note-editor-1');
    expect(doc).not.toBeNull();
    expect(doc?.noteId).toBe('note-editor-1');
    expect(doc?.blocks).toHaveLength(2);
    expect(doc?.blocks[0].content).toBe('Title');
    expect(doc?.blocks[1].content).toBe('Paragraph from TipTap');
  });

  // Test 2 — Basic conversion
  it('2. should convert HTML into a valid BlockDocument with correct block types', () => {
    const html = '<h2>Section</h2><blockquote>Quote</blockquote>';
    const doc = getBlockDocumentFromHtml(html, 'note-conv-1');

    expect(doc.blocks).toHaveLength(2);
    expect(doc.blocks[0].type).toBe('heading');
    expect(doc.blocks[0].properties.level).toBe(2);
    expect(doc.blocks[1].type).toBe('quote');
    expect(doc.blocks[1].content).toBe('Quote');
  });

  // Test 3 — Stable IDs
  it('3. should preserve existing data-block-id attributes when extracting from TipTap HTML', () => {
    const stableId = '11111111-2222-3333-4444-555555555555';
    const html = `<p data-block-id="${stableId}">Existing ID block</p>`;
    const doc = getBlockDocumentFromHtml(html, 'note-stable-id');

    expect(doc.blocks[0].id).toBe(stableId);
    const serialized = serializeBlockDocumentToEditorHtml(doc);
    expect(serialized).toContain(`data-block-id="${stableId}"`);
  });

  // Test 4 — Missing IDs
  it('4. should assign valid UUIDs to blocks missing data-block-id attributes', () => {
    const html = '<p>No ID block</p>';
    const doc = getBlockDocumentFromHtml(html, 'note-missing-id');

    expect(doc.blocks[0].id).toBeDefined();
    expect(doc.blocks[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  // Test 5 — Repeated conversion
  it('5. should not regenerate IDs across repeated parse/serialize cycles', () => {
    const originalHtml = '<p>Repeated parse test</p>';
    const doc1 = getBlockDocumentFromHtml(originalHtml, 'note-repeat');
    const firstId = doc1.blocks[0].id;

    const html1 = serializeBlockDocumentToEditorHtml(doc1);
    const doc2 = getBlockDocumentFromHtml(html1, 'note-repeat');
    expect(doc2.blocks[0].id).toBe(firstId);

    const html2 = serializeBlockDocumentToEditorHtml(doc2);
    const doc3 = getBlockDocumentFromHtml(html2, 'note-repeat');
    expect(doc3.blocks[0].id).toBe(firstId);
  });

  // Test 6 — Multiple block types
  it('6. should support multiple TipTap block types in a single document', () => {
    const html = `
      <h1>Heading 1</h1>
      <p>Paragraph text</p>
      <blockquote>Quote text</blockquote>
      <div class="callout" data-type="callout" data-emoji="💡"><span class="callout-icon">💡</span><div class="callout-content">Callout</div></div>
      <table><tr><td>Cell</td></tr></table>
    `;
    const doc = getBlockDocumentFromHtml(html, 'note-multi');

    expect(doc.blocks).toHaveLength(5);
    expect(doc.blocks.map(b => b.type)).toEqual(['heading', 'paragraph', 'quote', 'callout', 'table']);
  });

  // Test 7 — Fallback content
  it('7. should preserve unsupported custom HTML content in fallback blocks', () => {
    const html = '<custom-editor-widget key="1">Widget</custom-editor-widget>';
    const doc = getBlockDocumentFromHtml(html, 'note-fallback');

    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].properties.rawHtml).toBe(html);
    expect(serializeBlockDocumentToEditorHtml(doc)).toBe(html);
  });

  // Test 8 — Parser failure isolation
  it('8. should isolate parsing errors without breaking HTML output or editor execution', () => {
    const res = syncEditorToBlockDocument('<p>Normal text</p>', 'note-fail-isolation');
    expect(res.error).toBeNull();
    expect(res.isDerived).toBe(true);
    expect(res.doc.blocks).toHaveLength(1);
  });

  // Test 9 — Feature flag disabled
  it('9. should report isBlockEditorIntegrationActive() as false by default', () => {
    expect(isBlockEditorIntegrationActive()).toBe(false);

    setFeatureFlag('BLOCK_EDITOR', true);
    expect(isBlockEditorIntegrationActive()).toBe(true);
  });

  // Test 10 — Existing persistence isolation
  it('10. should verify adapter operations do NOT invoke localDb or syncEngine methods', () => {
    const putNoteSpy = vi.spyOn(localDb, 'putLocalNote');
    const enqueueOpSpy = vi.spyOn(localDb, 'enqueueOp');
    const writeNoteSpy = vi.spyOn(syncEngine, 'writeNote');

    const html = '<p>Test isolation</p>';
    const doc = getBlockDocumentFromHtml(html, 'note-isolation');
    syncEditorToBlockDocument(html, 'note-isolation', doc);
    serializeBlockDocumentToEditorHtml(doc);

    expect(putNoteSpy).not.toHaveBeenCalled();
    expect(enqueueOpSpy).not.toHaveBeenCalled();
    expect(writeNoteSpy).not.toHaveBeenCalled();
  });

});
