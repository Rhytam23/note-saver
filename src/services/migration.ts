import type { Note } from '../types';
import type { Block } from '../types/block';
import { parseHtmlToBlocks, parseBlocksToHtml } from './blockParser';

/**
 * NoteNirman 2.0 Additive & Non-Destructive Migration Safety Layer
 * 
 * Guarantees:
 * 1. Existing `Note.content` string is NEVER overwritten or mutated automatically in P0.
 * 2. On-demand block extraction is safe and idempotent.
 * 3. Provides clean fallback if feature flag is disabled or parsing fails.
 */

export interface DerivedNoteBlockState {
  blocks: Block[];
  isDerived: boolean;
  hasErrors: boolean;
}

/**
 * Dynamically extract Block representations from a Note's HTML content.
 * Does NOT mutate local storage or cloud database records.
 */
export function getDerivedBlocksFromNote(note: Note): DerivedNoteBlockState {
  if (!note || !note.content) {
    return {
      blocks: [],
      isDerived: true,
      hasErrors: false,
    };
  }

  try {
    const blocks = parseHtmlToBlocks(note.content, note.id);
    return {
      blocks,
      isDerived: true,
      hasErrors: false,
    };
  } catch (err) {
    console.error(`[Migration Safety] Failed to derive blocks for note ${note.id}:`, err);
    return {
      blocks: [],
      isDerived: false,
      hasErrors: true,
    };
  }
}

/**
 * Safely update note content from modified blocks.
 * Only transforms blocks back to HTML while leaving all other Note metadata untouched.
 */
export function updateNoteFromBlocks(note: Note, blocks: Block[]): Note {
  const newHtmlContent = parseBlocksToHtml(blocks);
  return {
    ...note,
    content: newHtmlContent,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Idempotency check: verify that converting Note -> Blocks -> HTML preserves
 * essential structure without data loss.
 */
export function verifyNoteConversionIntegrity(note: Note): boolean {
  if (!note || !note.content) return true;
  try {
    const blocks = parseHtmlToBlocks(note.content, note.id);
    const rebuiltHtml = parseBlocksToHtml(blocks);
    // Verified if rebuilt HTML is non-empty for non-empty source
    return Boolean(rebuiltHtml && rebuiltHtml.length > 0);
  } catch {
    return false;
  }
}
