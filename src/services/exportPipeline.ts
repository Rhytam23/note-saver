import type { Note } from '../types';
import DOMPurify from 'dompurify';
import { noteContentToPortabilityAST } from './portabilityCore';
import type { PortabilityAST } from '../types/portability';

/**
 * NoteNirman 2.0 Phase 5 — High-Fidelity Multi-Format Export Pipeline (P5.4)
 *
 * Builds upon the existing exportService.ts (which handles basic txt/md/pdf browser downloads)
 * by adding:
 *  - portabilityCore.ts AST-based conversions for structural fidelity
 *  - HTML export with full metadata
 *  - JSON (PortabilityAST) export for lossless round-trips
 *  - Batch export support with a per-format loss-classification matrix
 *  - Blob/string outputs suitable for Web File System, Tauri, or Capacitor adapters
 *
 * Invariants Preserved:
 * 1. Note.content remains the sole authoritative HTML representation.
 * 2. No IndexedDB writes; pipeline is read-only relative to persistence.
 * 3. PDF export delegates to existing exportService.ts to avoid duplication.
 * 4. All HTML outputs pass through DOMPurify before serialization.
 */

// ---------------------------------------------------------------------------
// Loss Classification Matrix
// ---------------------------------------------------------------------------

/**
 * Declares what fidelity is preserved or lost when exporting to each format.
 * This table is the authoritative reference for all P5.4 export guarantees.
 */
export const EXPORT_LOSS_MATRIX = {
  markdown: {
    format: 'markdown' as const,
    preserves: [
      'Heading hierarchy (H1–H6)',
      'Paragraph text',
      'Bold and italic inline formatting',
      'Ordered and unordered lists',
      'Blockquotes',
      'Code blocks (fenced)',
      'Horizontal rules',
      'Hyperlinks (href only)',
      'Note title (as H1)',
      'Tags (as YAML front-matter)',
    ],
    lossy: [
      'Stable block UUIDs (data-block-id attributes stripped)',
      'Table structure (rendered as plain rows)',
      'Inline images (replaced with alt-text or URL placeholder)',
      'Custom block properties and metadata',
      'TipTap node attributes beyond standard markdown',
      'Collaborative Yjs annotation anchors',
    ],
    roundTrippable: false,
  },
  html: {
    format: 'html' as const,
    preserves: [
      'Full semantic HTML structure',
      'Stable block UUIDs (data-block-id attributes)',
      'All heading levels (H1–H6)',
      'Inline formatting (bold, italic, underline, strikethrough)',
      'Lists (ordered, unordered, nested)',
      'Blockquotes and code blocks',
      'Tables (thead/tbody/tr/td/th)',
      'Hyperlinks and image src URLs',
      'Note title and metadata in <head>',
      'Tags encoded in <meta> keywords',
    ],
    lossy: [
      'Collaborative Yjs CRDT state (not HTML-serializable)',
      'Attachment binaries (referenced by URL, not embedded)',
      'Processing job queue state',
    ],
    roundTrippable: true,
  },
  json: {
    format: 'json' as const,
    preserves: [
      'Complete PortabilityAST (100% structural fidelity)',
      'Stable block UUIDs (id field per node)',
      'All block types and properties',
      'Note metadata (title, tags, timestamps)',
      'Block hierarchy and parent-child relationships',
      'Custom block metadata',
    ],
    lossy: [
      'Collaborative Yjs binary update blobs (separate .yjs files)',
      'Attachment binary data (metadata only)',
      'Processing job state',
    ],
    roundTrippable: true,
  },
  txt: {
    format: 'txt' as const,
    preserves: [
      'Plain text content of all block types',
      'Note title as first line',
      'Tags as comma-separated metadata line',
      'List items prefixed with bullet points',
      'Paragraph separators (blank lines)',
    ],
    lossy: [
      'All formatting (bold, italic, headings rendered as plain text)',
      'All block UUIDs and structure',
      'All metadata and properties',
      'Tables (columns merged into rows)',
      'Images (replaced with placeholder text)',
      'Hyperlinks (href discarded)',
    ],
    roundTrippable: false,
  },
  pdf: {
    format: 'pdf' as const,
    preserves: [
      'Rendered visual appearance of note content',
      'Note title as heading',
      'Sanitized HTML rendering (DOMPurify applied)',
    ],
    lossy: [
      'All structural block metadata',
      'All block UUIDs',
      'Machine-readable structure (PDF is presentation-only)',
      'Hyperlinks may lose interactivity depending on PDF viewer',
      'Multi-page cutoff for very long notes',
    ],
    roundTrippable: false,
  },
} as const;

export type ExportFormat = keyof typeof EXPORT_LOSS_MATRIX;

// ---------------------------------------------------------------------------
// Export Result Types
// ---------------------------------------------------------------------------

export interface ExportSingleResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  /** String content for text-based formats. Undefined for binary (pdf) — use browser trigger instead. */
  content?: string;
  /** Whether this export can be used as a lossless import source. */
  roundTrippable: boolean;
  /** Stable block UUIDs preserved in this output. */
  blockIdsPreserved: boolean;
  lossClassification: typeof EXPORT_LOSS_MATRIX[ExportFormat];
}

export interface ExportBatchResult {
  totalRequested: number;
  succeeded: ExportSingleResult[];
  failed: { noteId: string; noteTitle: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// Slug helper (mirrors existing exportService.ts to avoid duplication)
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-') || 'untitled-note';
}

// ---------------------------------------------------------------------------
// HTML sanitizer (read-only output, DOMPurify required)
// ---------------------------------------------------------------------------

function sanitizeOutputHtml(html: string): string {
  // When running in a non-browser context (unit tests with jsdom) DOMPurify
  // may behave differently, but it is always safe to call.
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'link', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

// ---------------------------------------------------------------------------
// Markdown Exporter
// ---------------------------------------------------------------------------

/**
 * Convert Note.content HTML to GitHub-Flavored Markdown.
 *
 * Loss classification: see EXPORT_LOSS_MATRIX.markdown
 * Block UUIDs are NOT preserved (intentionally stripped for human readability).
 */
export function exportNoteToMarkdown(note: Note): string {
  const tagsFrontMatter = note.tags.length > 0
    ? `tags: [${note.tags.map(t => JSON.stringify(t)).join(', ')}]`
    : 'tags: []';

  const frontMatter = [
    '---',
    `title: ${JSON.stringify(note.title)}`,
    tagsFrontMatter,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    `priority: ${note.priority}`,
    `pinned: ${note.isPinned}`,
    '---',
    '',
  ].join('\n');

  const markdown = htmlToMarkdown(note.content);
  return `${frontMatter}# ${note.title}\n\n${markdown}`;
}

/**
 * Convert an HTML string to Markdown using structural tag mapping.
 * This is an intentionally conservative converter — semantic structure is
 * preserved over visual fidelity, with explicit loss noted in EXPORT_LOSS_MATRIX.
 */
function htmlToMarkdown(html: string): string {
  const clean = sanitizeOutputHtml(html);

  // Parse in a temporary container (requires DOM — browser or jsdom)
  const container = document.createElement('div');
  container.innerHTML = clean;

  return nodeToMarkdown(container).trim();
}

function nodeToMarkdown(node: Element | Node): string {
  const parts: string[] = [];

  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push(child.textContent || '');
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    const inner = nodeToMarkdown(el);

    switch (tag) {
      case 'h1': parts.push(`# ${inner}\n\n`); break;
      case 'h2': parts.push(`## ${inner}\n\n`); break;
      case 'h3': parts.push(`### ${inner}\n\n`); break;
      case 'h4': parts.push(`#### ${inner}\n\n`); break;
      case 'h5': parts.push(`##### ${inner}\n\n`); break;
      case 'h6': parts.push(`###### ${inner}\n\n`); break;
      case 'p':  parts.push(`${inner}\n\n`); break;
      case 'strong':
      case 'b':  parts.push(`**${inner}**`); break;
      case 'em':
      case 'i':  parts.push(`*${inner}*`); break;
      case 's':
      case 'del': parts.push(`~~${inner}~~`); break;
      case 'code': parts.push(`\`${inner}\``); break;
      case 'pre':  parts.push(`\`\`\`\n${inner}\n\`\`\`\n\n`); break;
      case 'blockquote': parts.push(inner.split('\n').map(l => `> ${l}`).join('\n') + '\n\n'); break;
      case 'ul':  parts.push(listToMarkdown(el, false) + '\n'); break;
      case 'ol':  parts.push(listToMarkdown(el, true) + '\n'); break;
      case 'li':  parts.push(`- ${inner}\n`); break;
      case 'a': {
        const href = el.getAttribute('href') || '';
        parts.push(`[${inner}](${href})`);
        break;
      }
      case 'img': {
        const alt = el.getAttribute('alt') || 'image';
        const src = el.getAttribute('src') || '';
        parts.push(`![${alt}](${src})`);
        break;
      }
      case 'hr': parts.push('---\n\n'); break;
      case 'br': parts.push('\n'); break;
      // Tables: render as plain rows separated by pipes
      case 'table': parts.push(tableToMarkdown(el) + '\n\n'); break;
      case 'thead':
      case 'tbody':
      case 'tr':  parts.push(inner); break;
      case 'th':
      case 'td':  parts.push(`| ${inner} `); break;
      default:    parts.push(inner);
    }
  });

  return parts.join('');
}

function listToMarkdown(listEl: Element, ordered: boolean): string {
  const items = Array.from(listEl.children).filter(c =>
    c.tagName.toLowerCase() === 'li'
  );
  return items.map((li, idx) => {
    const prefix = ordered ? `${idx + 1}. ` : '- ';
    return `${prefix}${nodeToMarkdown(li).trim()}`;
  }).join('\n');
}

function tableToMarkdown(tableEl: Element): string {
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  const lines: string[] = [];
  rows.forEach((row, rowIdx) => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    const rowStr = '| ' + cells.map(c => (c.textContent || '').trim()).join(' | ') + ' |';
    lines.push(rowStr);
    // After header row, insert separator
    if (rowIdx === 0) {
      lines.push('| ' + cells.map(() => '---').join(' | ') + ' |');
    }
  });
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML Exporter (high-fidelity, block-UUID preserving)
// ---------------------------------------------------------------------------

/**
 * Export a Note as a self-contained HTML document, preserving block UUIDs.
 *
 * Loss classification: see EXPORT_LOSS_MATRIX.html
 * Block UUIDs ARE preserved in data-block-id attributes.
 */
export function exportNoteToHtml(note: Note): string {
  const sanitizedContent = sanitizeOutputHtml(note.content);
  const sanitizedTitle = DOMPurify.sanitize(note.title);
  const tagsMetaContent = note.tags.map(t => DOMPurify.sanitize(t)).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="NoteNirman 2.0">
  <meta name="keywords" content="${tagsMetaContent}">
  <meta name="created" content="${note.createdAt}">
  <meta name="updated" content="${note.updatedAt}">
  <meta name="priority" content="${note.priority}">
  <meta name="pinned" content="${note.isPinned}">
  <title>${sanitizedTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1 { border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
    .nn-tags { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .nn-content { margin-top: 1rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 0.125rem 0.25rem; border-radius: 2px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #555; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 0.5rem; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>${sanitizedTitle}</h1>
  <p class="nn-tags">Tags: ${tagsMetaContent || '(none)'}</p>
  <div class="nn-content" data-note-id="${note.id}">
    ${sanitizedContent}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON (PortabilityAST) Exporter — lossless round-trippable
// ---------------------------------------------------------------------------

/**
 * Export a Note as a PortabilityAST JSON object.
 *
 * Loss classification: see EXPORT_LOSS_MATRIX.json
 * Block UUIDs ARE preserved. This format supports lossless import via P5.3.
 */
export function exportNoteToPortabilityJson(note: Note): PortabilityAST {
  return noteContentToPortabilityAST(note.id, note.content, note.title);
}

/**
 * Serialize a PortabilityAST export to a pretty-printed JSON string.
 */
export function serializePortabilityAstToJson(ast: PortabilityAST): string {
  return JSON.stringify(ast, null, 2);
}

// ---------------------------------------------------------------------------
// Plain Text Exporter
// ---------------------------------------------------------------------------

/**
 * Export a Note as plain text.
 *
 * Loss classification: see EXPORT_LOSS_MATRIX.txt
 * Delegates to the DOM-based text extraction used in existing exportService.ts
 * for consistency, extended with YAML-style metadata header.
 */
export function exportNoteToText(note: Note): string {
  const container = document.createElement('div');
  container.innerHTML = sanitizeOutputHtml(note.content);

  // Preserve paragraph spacing
  container.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.appendChild(document.createTextNode('\n\n'));
  });
  container.querySelectorAll('br').forEach(el => {
    el.replaceWith(document.createTextNode('\n'));
  });
  container.querySelectorAll('li').forEach(el => {
    el.prepend(document.createTextNode('• '));
    el.appendChild(document.createTextNode('\n'));
  });

  const text = (container.textContent || '').replace(/ \n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const header = [
    `Title: ${note.title}`,
    `Tags: ${note.tags.join(', ') || '(none)'}`,
    `Created: ${note.createdAt}`,
    `Updated: ${note.updatedAt}`,
    '',
    '---',
    '',
  ].join('\n');

  return header + text;
}

// ---------------------------------------------------------------------------
// Core Single-Note Export Entry Point
// ---------------------------------------------------------------------------

/**
 * Export a single Note to the specified format.
 *
 * For 'pdf' format: content is undefined — use existing exportService.exportNote(note, 'pdf')
 * to trigger the browser download (html2canvas + jsPDF requires a live DOM).
 *
 * For all other formats: content is the serialized string ready for download or filesystem write.
 */
export function exportNote(note: Note, format: ExportFormat): ExportSingleResult {
  const slug = slugify(note.title);
  const loss = EXPORT_LOSS_MATRIX[format];

  switch (format) {
    case 'markdown': {
      return {
        format,
        filename: `${slug}.md`,
        mimeType: 'text/markdown;charset=utf-8',
        content: exportNoteToMarkdown(note),
        roundTrippable: loss.roundTrippable,
        blockIdsPreserved: false,
        lossClassification: loss,
      };
    }

    case 'html': {
      return {
        format,
        filename: `${slug}.html`,
        mimeType: 'text/html;charset=utf-8',
        content: exportNoteToHtml(note),
        roundTrippable: loss.roundTrippable,
        blockIdsPreserved: true,
        lossClassification: loss,
      };
    }

    case 'json': {
      const ast = exportNoteToPortabilityJson(note);
      return {
        format,
        filename: `${slug}.json`,
        mimeType: 'application/json;charset=utf-8',
        content: serializePortabilityAstToJson(ast),
        roundTrippable: loss.roundTrippable,
        blockIdsPreserved: true,
        lossClassification: loss,
      };
    }

    case 'txt': {
      return {
        format,
        filename: `${slug}.txt`,
        mimeType: 'text/plain;charset=utf-8',
        content: exportNoteToText(note),
        roundTrippable: loss.roundTrippable,
        blockIdsPreserved: false,
        lossClassification: loss,
      };
    }

    case 'pdf': {
      // PDF export requires live DOM (html2canvas + jsPDF).
      // The caller must invoke exportService.exportNote(note, 'pdf') directly.
      // We return metadata only here.
      return {
        format,
        filename: `${slug}.pdf`,
        mimeType: 'application/pdf',
        content: undefined,
        roundTrippable: loss.roundTrippable,
        blockIdsPreserved: false,
        lossClassification: loss,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Browser Download Trigger (Web / PWA adapter)
// ---------------------------------------------------------------------------

/**
 * Trigger a browser file download for the given export result.
 * This is the Web/PWA platform adapter. Tauri and Capacitor adapters
 * will instead use IFilesystemAdapter.writeFile() (P5.7).
 *
 * @throws {Error} if result.content is undefined (e.g. pdf format — use exportService instead)
 */
export function triggerBrowserDownload(result: ExportSingleResult): void {
  if (result.content === undefined) {
    throw new Error(
      `Cannot trigger browser download for format '${result.format}': content is undefined. ` +
      `Use exportService.exportNote(note, 'pdf') for PDF downloads.`
    );
  }

  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Batch Export
// ---------------------------------------------------------------------------

/**
 * Export multiple notes in the specified format.
 *
 * Security: batch size is capped at ImportSecurityPolicy.MAX_BATCH_DOCUMENT_COUNT (50).
 * For larger batches, the caller must paginate.
 *
 * @param notes - Array of notes to export
 * @param format - Target export format
 * @param maxBatchSize - Override batch cap (default: 50)
 */
export function exportBatch(
  notes: Note[],
  format: ExportFormat,
  maxBatchSize: number = 50
): ExportBatchResult {
  const batch = notes.slice(0, maxBatchSize);
  const succeeded: ExportSingleResult[] = [];
  const failed: { noteId: string; noteTitle: string; reason: string }[] = [];

  for (const note of batch) {
    try {
      const result = exportNote(note, format);
      succeeded.push(result);
    } catch (err) {
      failed.push({
        noteId: note.id,
        noteTitle: note.title,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    totalRequested: notes.length,
    succeeded,
    failed,
  };
}

// ---------------------------------------------------------------------------
// Re-export portabilityCore helpers for callers that need round-trip restore
// ---------------------------------------------------------------------------

export { portabilityASTToNoteContent } from './portabilityCore';
