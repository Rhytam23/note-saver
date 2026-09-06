import type { BlockDocument } from './blockDocument';
import { createBlockDocument, serializeBlockDocument } from './blockDocument';
import { isFeatureEnabled } from '../config/featureFlags';

/**
 * NoteNirman 2.0 P1.2 TipTap Block Document Integration Adapter
 * 
 * Controlled bridge between TipTap Rich Text Editor and Universal Block Model.
 * 
 * Guarantees:
 * 1. Storage Primacy: `Note.content` HTML string remains canonical.
 * 2. Error Isolation: Parser/adapter errors never block TipTap editor or note saving.
 * 3. Derived Model: `BlockDocument` is strictly a derived view.
 * 4. Stable IDs: `data-block-id` attributes preserved across cycles.
 */

export interface EditorAdapterResult {
  doc: BlockDocument;
  isDerived: boolean;
  changed: boolean;
  error: Error | null;
}

/**
 * Minimal editor interface to accept TipTap or lightweight mocks safely.
 */
export interface MinimalEditorInstance {
  getHTML: () => string;
  isEmpty?: boolean;
}

/**
 * Extract a derived BlockDocument from a TipTap editor instance safely.
 * Returns null if editor is null or uninitialized.
 */
export function getBlockDocumentFromEditor(
  editor: MinimalEditorInstance | null,
  noteId: string
): BlockDocument | null {
  if (!editor || typeof editor.getHTML !== 'function') {
    return null;
  }

  try {
    const html = editor.getHTML();
    return createBlockDocument(noteId, html);
  } catch (err) {
    console.error(`[EditorBlockAdapter] Failed to extract BlockDocument from editor for note ${noteId}:`, err);
    return null;
  }
}

/**
 * Extract a derived BlockDocument from an HTML string safely with complete error isolation.
 */
export function getBlockDocumentFromHtml(html: string, noteId: string): BlockDocument {
  try {
    return createBlockDocument(noteId, html || '');
  } catch (err) {
    console.error(`[EditorBlockAdapter] Failed to parse HTML into BlockDocument for note ${noteId}:`, err);
    return {
      noteId,
      blocks: [],
      version: 1,
      metadata: { parseError: String(err) },
    };
  }
}

/**
 * Synchronize TipTap HTML content with a derived BlockDocument.
 * Calculates change status and isolates errors so editor/saving flow is never broken.
 */
export function syncEditorToBlockDocument(
  html: string,
  noteId: string,
  currentDoc?: BlockDocument
): EditorAdapterResult {
  try {
    const newDoc = createBlockDocument(noteId, html || '');
    const changed = !currentDoc || currentDoc.blocks.length !== newDoc.blocks.length ||
      serializeBlockDocument(currentDoc) !== serializeBlockDocument(newDoc);

    return {
      doc: newDoc,
      isDerived: true,
      changed,
      error: null,
    };
  } catch (err) {
    const fallbackErr = err instanceof Error ? err : new Error(String(err));
    console.error(`[EditorBlockAdapter] Error syncing editor content to BlockDocument for note ${noteId}:`, fallbackErr);

    return {
      doc: currentDoc || { noteId, blocks: [], version: 1, metadata: { error: fallbackErr.message } },
      isDerived: false,
      changed: false,
      error: fallbackErr,
    };
  }
}

/**
 * Convert a BlockDocument back into TipTap-compatible HTML string.
 */
export function serializeBlockDocumentToEditorHtml(doc: BlockDocument): string {
  if (!doc) return '';
  try {
    return serializeBlockDocument(doc);
  } catch (err) {
    console.error(`[EditorBlockAdapter] Failed to serialize BlockDocument to HTML for note ${doc?.noteId}:`, err);
    return '';
  }
}

/**
 * Utility check: returns true if block editor functionality is active.
 * Defaults to false per feature flags setup.
 */
export function isBlockEditorIntegrationActive(): boolean {
  return isFeatureEnabled('BLOCK_EDITOR');
}
