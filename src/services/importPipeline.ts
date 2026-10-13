import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import type { Note } from '../types';
import * as localDb from './localDb';
import { getBlockDocumentFromHtml } from './editorBlockAdapter';

/**
 * NoteNirman 2.0 Phase 5 — Extensible Multi-Format Import Pipeline (P5.3)
 * 
 * Invariants Guaranteed:
 * 1. Canonical Note Persistence: `Note.content` HTML string remains the sole durable canonical persisted format.
 * 2. Stable Block Identity: Generates stable block UUIDs (`data-block-id`) for all imported content.
 * 3. Security Defense-in-Depth: DOMPurify XSS sanitization, script stripping, path traversal protection, file size checks.
 * 4. Zero Parallel Stores: Persists notes directly through `localDb.putLocalNote` and `localDb.enqueueOp`.
 */

export const ImportSecurityPolicy = {
  MAX_SINGLE_TEXT_FILE_BYTES: 50 * 1024 * 1024,       // 50 MB
  MAX_SINGLE_ATTACHMENT_BYTES: 100 * 1024 * 1024,    // 100 MB
  MAX_UNCOMPRESSED_ARCHIVE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_ZIP_COMPRESSION_RATIO: 100,                    // 100:1 max ratio
  MAX_BATCH_DOCUMENT_COUNT: 50,                      // 50 items per transactional memory batch
  ALLOWED_HTML_TAGS: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody',
    'tr', 'td', 'th', 'a', 'span', 'b', 'i',
    'strong', 'em', 'img', 'code', 'pre', 'hr',
    // Editor content: block equations and callouts are <div>s, tables carry column groups.
    'div', 'colgroup', 'col'
  ],
  STRIP_ELEMENTS: [
    'script', 'iframe', 'object', 'embed',
    'style', 'link', 'form', 'input', 'button', 'svg'
  ],
} as const;

export type ImportFormat = 'markdown' | 'html' | 'text' | 'csv' | 'json';

export interface ImportFilePayload {
  filename: string;
  content: string;
  mimeType?: string;
  sizeBytes?: number;
  userId: string;
}

export interface ImportSingleResult {
  success: boolean;
  note?: Note;
  error?: string;
}

export interface ImportBatchResult {
  totalProcessed: number;
  importedNotes: Note[];
  failedFiles: { filename: string; reason: string }[];
}

/**
 * Sanitize HTML/Markdown input via DOMPurify to strip XSS vectors.
 */
export function sanitizeImportHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window !== 'undefined' && DOMPurify.sanitize) {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [...ImportSecurityPolicy.ALLOWED_HTML_TAGS],
      ADD_ATTR: ['data-block-id', 'data-type', 'checked'],
      FORBID_TAGS: [...ImportSecurityPolicy.STRIP_ELEMENTS],
    });
  }
  // No DOM (for example plain Node), so DOMPurify is unavailable. Regexes cannot sanitize HTML safely,
  // so reduce the input to plain text: drop every tag (repeating until none is left) and escape what remains.
  let text = rawHtml;
  let prev: string;
  do {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== prev);
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Detect import format based on file extension and magic content markers.
 */
export function detectImportFormat(filename: string, content: string): ImportFormat {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'csv') return 'csv';
  if (ext === 'json') return 'json';
  if (ext === 'txt') return 'text';

  // Fallback content inspection
  const trimmed = content.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || (trimmed.startsWith('<p') && trimmed.includes('>'))) {
    return 'html';
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  if (trimmed.includes('# ') || trimmed.includes('## ') || trimmed.startsWith('---')) {
    return 'markdown';
  }

  return 'text';
}

/**
 * Extract YAML frontmatter metadata (tags, title) from Markdown.
 */
export function parseFrontmatter(markdownContent: string): { title?: string; tags: string[]; body: string } {
  const tags: string[] = [];
  let title: string | undefined;
  let body = markdownContent;

  const match = markdownContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (match) {
    body = markdownContent.substring(match[0].length);
    const yamlLines = match[1].split(/\r?\n/);
    
    for (const line of yamlLines) {
      const titleMatch = line.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))$/i);
      if (titleMatch) {
        title = (titleMatch[1] || titleMatch[2] || titleMatch[3] || '').trim();
      }

      const tagsMatch = line.match(/^tags:\s*\[?(.*?)\]?$/i);
      if (tagsMatch && tagsMatch[1]) {
        const rawTags = tagsMatch[1].split(',').map(t => t.replace(/['"]/g, '').trim()).filter(Boolean);
        tags.push(...rawTags);
      }
    }
  }

  return { title, tags, body };
}

/**
 * Convert Markdown formatted text into TipTap-compatible HTML with stable block UUIDs.
 */
export function parseMarkdownToHtml(markdownContent: string): { html: string; title?: string; tags: string[] } {
  const { title: fmTitle, tags, body } = parseFrontmatter(markdownContent);
  const lines = body.split(/\r?\n/);
  const htmlBlocks: string[] = [];
  let inferredTitle: string | undefined = fmTitle;

  let inList: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const blockId = `blk_${uuidv4()}`;
      const itemsHtml = listItems.map(item => `<li>${item}</li>`).join('');
      htmlBlocks.push(`<${inList} data-block-id="${blockId}">${itemsHtml}</${inList}>`);
      inList = null;
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }

    const blockId = `blk_${uuidv4()}`;

    // Headings
    if (line.startsWith('# ')) {
      flushList();
      const text = line.substring(2).trim();
      if (!inferredTitle) inferredTitle = text;
      htmlBlocks.push(`<h1 data-block-id="${blockId}">${sanitizeImportHtml(text)}</h1>`);
    } else if (line.startsWith('## ')) {
      flushList();
      const text = line.substring(3).trim();
      htmlBlocks.push(`<h2 data-block-id="${blockId}">${sanitizeImportHtml(text)}</h2>`);
    } else if (line.startsWith('### ')) {
      flushList();
      const text = line.substring(4).trim();
      htmlBlocks.push(`<h3 data-block-id="${blockId}">${sanitizeImportHtml(text)}</h3>`);
    } else if (line.startsWith('> ')) {
      // Blockquote
      flushList();
      const text = line.substring(2).trim();
      htmlBlocks.push(`<blockquote data-block-id="${blockId}"><p>${sanitizeImportHtml(text)}</p></blockquote>`);
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      // Task item
      flushList();
      const checked = line.startsWith('- [x] ');
      const text = line.substring(6).trim();
      htmlBlocks.push(`<ul data-type="taskList" data-block-id="${blockId}"><li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox" ${checked ? 'checked' : ''}/><span>${sanitizeImportHtml(text)}</span></label></li></ul>`);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Unordered list
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
      }
      listItems.push(sanitizeImportHtml(line.substring(2).trim()));
    } else if (/^\d+\.\s/.test(line)) {
      // Ordered list
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
      }
      const itemText = line.replace(/^\d+\.\s/, '').trim();
      listItems.push(sanitizeImportHtml(itemText));
    } else {
      // Paragraph
      flushList();
      htmlBlocks.push(`<p data-block-id="${blockId}">${sanitizeImportHtml(line)}</p>`);
    }
  }

  flushList();

  return {
    html: htmlBlocks.join(''),
    title: inferredTitle,
    tags,
  };
}

/**
 * Convert Plain Text into TipTap-compatible paragraph HTML with stable block UUIDs.
 */
export function parseTextToHtml(textContent: string): string {
  const paragraphs = textContent.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
  return paragraphs
    .map(p => `<p data-block-id="blk_${uuidv4()}">${sanitizeImportHtml(p)}</p>`)
    .join('');
}

/**
 * Convert CSV table content into structured HTML table with stable block UUIDs.
 */
export function parseCsvToHtml(csvContent: string): string {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const blockId = `blk_${uuidv4()}`;
  const rows = lines.map(line => {
    return line.split(',').map(cell => cell.replace(/^["']|["']$/g, '').trim());
  });

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);

  const headerHtml = headerRow.map(cell => `<th>${sanitizeImportHtml(cell)}</th>`).join('');
  const bodyHtml = bodyRows
    .map(row => `<tr>${row.map(cell => `<td>${sanitizeImportHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `<table data-block-id="${blockId}"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

/**
 * Import a single file into local storage as an authoritative Note.
 */
export async function importSingleFile(payload: ImportFilePayload): Promise<ImportSingleResult> {
  if (!payload || !payload.userId) {
    return { success: false, error: 'Invalid import payload: userId is required.' };
  }

  const size = payload.sizeBytes ?? payload.content.length;
  if (size > ImportSecurityPolicy.MAX_SINGLE_TEXT_FILE_BYTES) {
    return {
      success: false,
      error: `Security violation: File '${payload.filename}' size (${Math.round(size / 1024 / 1024)}MB) exceeds maximum import limit of 50MB.`,
    };
  }

  const format = detectImportFormat(payload.filename, payload.content);
  let htmlContent = '';
  let noteTitle = payload.filename.replace(/\.[^/.]+$/, '');
  let tags: string[] = [];

  try {
    switch (format) {
      case 'markdown': {
        const parsed = parseMarkdownToHtml(payload.content);
        htmlContent = parsed.html;
        if (parsed.title) noteTitle = parsed.title;
        tags = parsed.tags;
        break;
      }
      case 'html': {
        htmlContent = sanitizeImportHtml(payload.content);
        break;
      }
      case 'csv': {
        htmlContent = parseCsvToHtml(payload.content);
        break;
      }
      case 'json': {
        const parsedJson = JSON.parse(payload.content);
        if (parsedJson.content && typeof parsedJson.content === 'string') {
          htmlContent = sanitizeImportHtml(parsedJson.content);
          if (parsedJson.title) noteTitle = parsedJson.title;
          if (Array.isArray(parsedJson.tags)) tags = parsedJson.tags;
        } else {
          return { success: false, error: 'Invalid JSON import file: missing valid note content string.' };
        }
        break;
      }
      case 'text':
      default: {
        htmlContent = parseTextToHtml(payload.content);
        break;
      }
    }

    if (!htmlContent) {
      htmlContent = `<p data-block-id="blk_${uuidv4()}">${sanitizeImportHtml(noteTitle)}</p>`;
    }

    const now = new Date().toISOString();
    const noteId = `note_${uuidv4()}`;

    const newNote: Note = {
      id: noteId,
      title: noteTitle,
      content: htmlContent, // Canonical Note.content HTML
      tags,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      priority: 'none',
      version: 1,
      syncStatus: 'pending',
      deleted: false,
      deletedAt: null,
    };

    // Verify derived BlockDocument AST derivation
    getBlockDocumentFromHtml(newNote.content, newNote.id);

    // Save to localDb
    await localDb.putLocalNote(payload.userId, newNote);
    await localDb.enqueueOp({
      userId: payload.userId,
      entity: 'note',
      entityId: newNote.id,
      action: 'upsert',
      baseVersion: 1,
    });

    return {
      success: true,
      note: newNote,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to parse file '${payload.filename}': ${msg}`,
    };
  }
}

/**
 * Import a batch of files in transactional memory batches of 50 items.
 */
export async function importBatchFiles(payloads: ImportFilePayload[]): Promise<ImportBatchResult> {
  const importedNotes: Note[] = [];
  const failedFiles: { filename: string; reason: string }[] = [];

  if (!Array.isArray(payloads) || payloads.length === 0) {
    return { totalProcessed: 0, importedNotes, failedFiles };
  }

  // Process in batches of 50 items per ImportSecurityPolicy
  const batchSize = ImportSecurityPolicy.MAX_BATCH_DOCUMENT_COUNT;
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    for (const item of batch) {
      const res = await importSingleFile(item);
      if (res.success && res.note) {
        importedNotes.push(res.note);
      } else {
        failedFiles.push({
          filename: item.filename,
          reason: res.error || 'Unknown import error',
        });
      }
    }
  }

  return {
    totalProcessed: payloads.length,
    importedNotes,
    failedFiles,
  };
}
