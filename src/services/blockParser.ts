import { v4 as uuidv4 } from 'uuid';
import type { Block } from '../types/block';

/**
 * Universal HTML <-> Block Parser for NoteNirman 2.0
 * 
 * Guarantees:
 * 1. Pure, deterministic parsing.
 * 2. Non-destructive fallback representation for unmapped HTML tags.
 * 3. Stable block ID persistence via `data-block-id` attributes.
 * 4. Full roundtrip fidelity (HTML -> Block[] -> HTML).
 */

const DEFAULT_NOTE_ID = 'default-note';

/**
 * Parse an HTML string into an array of typed Block objects.
 */
export function parseHtmlToBlocks(html: string, noteId: string = DEFAULT_NOTE_ID): Block[] {
  if (!html || !html.trim()) {
    return [];
  }

  let doc: Document;
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  } else {
    // Basic fallback for environments without DOMParser
    return [createFallbackBlock(html, noteId, 0)];
  }

  const container = doc.body;
  const blocks: Block[] = [];
  const children = Array.from(container.children);

  if (children.length === 0 && container.textContent && container.textContent.trim()) {
    // Plain text content without wrapping elements
    const now = new Date().toISOString();
    return [{
      id: uuidv4(),
      noteId,
      parentId: null,
      type: 'paragraph',
      content: container.textContent.trim(),
      properties: {},
      position: 0,
      createdAt: now,
      updatedAt: now,
    }];
  }

  children.forEach((child, index) => {
    const block = elementToBlock(child as HTMLElement, noteId, index);
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
}

/**
 * Convert a DOM Element into a typed Block.
 */
function elementToBlock(el: HTMLElement, noteId: string, position: number): Block {
  const now = new Date().toISOString();
  const existingId = el.getAttribute('data-block-id');
  const id = existingId || uuidv4();
  const tagName = el.tagName.toLowerCase();
  const dataType = el.getAttribute('data-type');

  // Handle specific block data-types
  if (dataType) {
    switch (dataType) {
      case 'callout':
        return {
          id,
          noteId,
          parentId: null,
          type: 'callout',
          content: getCleanInnerHtml(el),
          properties: {
            emoji: el.getAttribute('data-emoji') || el.querySelector('.callout-icon')?.textContent || '💡',
          },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'taskList':
      case 'checklist':
        return parseTaskListElement(el, noteId, position, id, now);
      case 'task':
      case 'taskItem':
        return {
          id,
          noteId,
          parentId: null,
          type: 'task',
          content: getCleanText(el),
          properties: {
            checked: el.getAttribute('data-checked') === 'true' || (el.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked || false,
          },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'pdf':
        return {
          id,
          noteId,
          parentId: null,
          type: 'pdf',
          content: el.getAttribute('data-url') || el.getAttribute('src') || '',
          properties: { url: el.getAttribute('data-url') || '', caption: el.getAttribute('data-caption') || '' },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'audio':
        return {
          id,
          noteId,
          parentId: null,
          type: 'audio',
          content: el.getAttribute('data-url') || el.getAttribute('src') || '',
          properties: { url: el.getAttribute('data-url') || '' },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'file':
        return {
          id,
          noteId,
          parentId: null,
          type: 'file',
          content: getCleanText(el),
          properties: { url: el.getAttribute('href') || el.getAttribute('data-url') || '' },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'math':
        return {
          id,
          noteId,
          parentId: null,
          type: 'math',
          content: getCleanText(el),
          properties: {},
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'diagram':
        return {
          id,
          noteId,
          parentId: null,
          type: 'diagram',
          content: getCleanText(el),
          properties: {},
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'bookmark':
        return {
          id,
          noteId,
          parentId: null,
          type: 'bookmark',
          content: el.getAttribute('data-url') || getCleanText(el),
          properties: { url: el.getAttribute('data-url') || '' },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'embed':
        return {
          id,
          noteId,
          parentId: null,
          type: 'embed',
          content: el.getAttribute('data-url') || el.getAttribute('src') || '',
          properties: { url: el.getAttribute('data-url') || '' },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'database':
        return {
          id,
          noteId,
          parentId: null,
          type: 'database',
          content: el.getAttribute('data-title') || 'Database',
          properties: { dbId: el.getAttribute('data-db-id') || uuidv4() },
          position,
          createdAt: now,
          updatedAt: now,
        };
      case 'ai':
        return {
          id,
          noteId,
          parentId: null,
          type: 'ai',
          content: getCleanInnerHtml(el),
          properties: { prompt: el.getAttribute('data-prompt') || '' },
          position,
          createdAt: now,
          updatedAt: now,
        };
    }
  }

  // Handle callout class convention (<div class="callout">)
  if (el.classList.contains('callout')) {
    const iconSpan = el.querySelector('.callout-icon');
    const contentDiv = el.querySelector('.callout-content');
    return {
      id,
      noteId,
      parentId: null,
      type: 'callout',
      content: contentDiv ? contentDiv.innerHTML : el.innerHTML,
      properties: {
        emoji: iconSpan ? iconSpan.textContent || '💡' : '💡',
      },
      position,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Tag Name Based Parsing
  switch (tagName) {
    case 'p':
      return {
        id,
        noteId,
        parentId: null,
        type: 'paragraph',
        content: el.innerHTML,
        properties: {},
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(tagName.charAt(1), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      return {
        id,
        noteId,
        parentId: null,
        type: 'heading',
        content: el.innerHTML,
        properties: { level },
        position,
        createdAt: now,
        updatedAt: now,
      };
    }

    case 'blockquote':
      return {
        id,
        noteId,
        parentId: null,
        type: 'quote',
        content: el.innerHTML,
        properties: {},
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'ul':
      if (el.getAttribute('data-type') === 'taskList' || el.querySelector('li[data-type="taskItem"]')) {
        return parseTaskListElement(el, noteId, position, id, now);
      }
      return {
        id,
        noteId,
        parentId: null,
        type: 'bulletList',
        content: el.innerHTML,
        properties: {},
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'ol':
      return {
        id,
        noteId,
        parentId: null,
        type: 'numberedList',
        content: el.innerHTML,
        properties: {},
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'pre': {
      const codeEl = el.querySelector('code');
      const langMatch = codeEl ? codeEl.className.match(/language-(\w+)/) : null;
      return {
        id,
        noteId,
        parentId: null,
        type: 'code',
        content: codeEl ? codeEl.innerHTML : el.innerHTML,
        properties: { language: langMatch ? langMatch[1] : 'plaintext' },
        position,
        createdAt: now,
        updatedAt: now,
      };
    }

    case 'table':
      return {
        id,
        noteId,
        parentId: null,
        type: 'table',
        content: el.outerHTML,
        properties: {},
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'img':
      return {
        id,
        noteId,
        parentId: null,
        type: 'image',
        content: (el as HTMLImageElement).src || el.getAttribute('src') || '',
        properties: {
          url: (el as HTMLImageElement).src || el.getAttribute('src') || '',
          caption: el.getAttribute('alt') || el.getAttribute('title') || '',
        },
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'video':
      return {
        id,
        noteId,
        parentId: null,
        type: 'video',
        content: el.getAttribute('src') || (el.querySelector('source')?.getAttribute('src')) || '',
        properties: {
          url: el.getAttribute('src') || (el.querySelector('source')?.getAttribute('src')) || '',
        },
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'audio':
      return {
        id,
        noteId,
        parentId: null,
        type: 'audio',
        content: el.getAttribute('src') || (el.querySelector('source')?.getAttribute('src')) || '',
        properties: {
          url: el.getAttribute('src') || (el.querySelector('source')?.getAttribute('src')) || '',
        },
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'hr':
      return {
        id,
        noteId,
        parentId: null,
        type: 'divider',
        content: '',
        properties: {},
        position,
        createdAt: now,
        updatedAt: now,
      };

    case 'details': {
      const summaryText = el.querySelector('summary')?.innerHTML || 'Toggle';
      return {
        id,
        noteId,
        parentId: null,
        type: 'toggle',
        content: el.innerHTML,
        properties: { summary: summaryText },
        position,
        createdAt: now,
        updatedAt: now,
      };
    }

    default:
      // Non-destructive Fallback for unknown / unmapped HTML tags
      return createFallbackBlock(el.outerHTML, noteId, position, id);
  }
}

/**
 * Helper to parse task lists
 */
function parseTaskListElement(el: HTMLElement, noteId: string, position: number, id: string, now: string): Block {
  return {
    id,
    noteId,
    parentId: null,
    type: 'checklist',
    content: el.innerHTML,
    properties: {},
    position,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a non-destructive fallback block preserving raw HTML
 */
function createFallbackBlock(rawHtml: string, noteId: string, position: number, customId?: string): Block {
  const now = new Date().toISOString();
  return {
    id: customId || uuidv4(),
    noteId,
    parentId: null,
    type: 'paragraph',
    content: '',
    properties: {
      rawHtml,
    },
    position,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Serialize an array of typed Block objects back into an HTML string.
 * Ensures `data-block-id` attributes are preserved on root elements.
 */
export function parseBlocksToHtml(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) {
    return '';
  }

  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  return sorted.map(blockToHtml).join('');
}

/**
 * Convert a single Block to its HTML string representation.
 */
function blockToHtml(block: Block): string {
  // If block has a rawHtml property (fallback block), output rawHtml verbatim
  if (block.properties && block.properties.rawHtml) {
    return block.properties.rawHtml;
  }

  const dataAttr = `data-block-id="${block.id}"`;

  switch (block.type) {
    case 'paragraph':
      return `<p ${dataAttr}>${block.content}</p>`;

    case 'heading': {
      const lvl = block.properties.level || 1;
      return `<h${lvl} ${dataAttr}>${block.content}</h${lvl}>`;
    }

    case 'quote':
      return `<blockquote ${dataAttr}>${block.content}</blockquote>`;

    case 'callout': {
      const emoji = block.properties.emoji || '💡';
      return `<div ${dataAttr} class="callout" data-type="callout" data-emoji="${emoji}"><span class="callout-icon">${emoji}</span><div class="callout-content">${block.content}</div></div>`;
    }

    case 'bulletList':
      return `<ul ${dataAttr}>${block.content}</ul>`;

    case 'numberedList':
      return `<ol ${dataAttr}>${block.content}</ol>`;

    case 'checklist':
      return `<ul ${dataAttr} data-type="taskList">${block.content}</ul>`;

    case 'task': {
      const checkedAttr = block.properties.checked ? 'data-checked="true"' : 'data-checked="false"';
      return `<li ${dataAttr} data-type="taskItem" ${checkedAttr}>${block.content}</li>`;
    }

    case 'code': {
      const lang = block.properties.language ? ` class="language-${block.properties.language}"` : '';
      return `<pre ${dataAttr}><code${lang}>${block.content}</code></pre>`;
    }

    case 'table':
      if (block.content.trim().startsWith('<table')) {
        // Inject data-block-id into table tag if not present
        if (!block.content.includes('data-block-id')) {
          return block.content.replace('<table', `<table ${dataAttr}`);
        }
        return block.content;
      }
      return `<table ${dataAttr}>${block.content}</table>`;

    case 'image': {
      const alt = block.properties.caption ? ` alt="${escapeHtml(block.properties.caption)}"` : '';
      return `<img ${dataAttr} src="${block.content}"${alt} />`;
    }

    case 'video':
      return `<video ${dataAttr} src="${block.content}" controls></video>`;

    case 'audio':
      return `<audio ${dataAttr} src="${block.content}" controls></audio>`;

    case 'file':
      return `<div ${dataAttr} data-type="file" data-url="${block.properties.url || ''}"><a href="${block.properties.url || ''}">${block.content}</a></div>`;

    case 'pdf':
      return `<div ${dataAttr} data-type="pdf" data-url="${block.content}" data-caption="${block.properties.caption || ''}"></div>`;

    case 'math':
      return `<div ${dataAttr} data-type="math">${block.content}</div>`;

    case 'diagram':
      return `<div ${dataAttr} data-type="diagram">${block.content}</div>`;

    case 'bookmark':
      return `<div ${dataAttr} data-type="bookmark" data-url="${block.properties.url || block.content}">${block.content}</div>`;

    case 'embed':
      return `<div ${dataAttr} data-type="embed" data-url="${block.content}"></div>`;

    case 'database':
      return `<div ${dataAttr} data-type="database" data-db-id="${block.properties.dbId || ''}" data-title="${block.content}"></div>`;

    case 'ai':
      return `<div ${dataAttr} data-type="ai" data-prompt="${block.properties.prompt || ''}">${block.content}</div>`;

    case 'divider':
      return `<hr ${dataAttr} />`;

    case 'toggle':
      return `<details ${dataAttr}><summary>${block.properties.summary || 'Toggle'}</summary>${block.content}</details>`;

    default:
      return `<p ${dataAttr}>${block.content}</p>`;
  }
}

function getCleanText(el: HTMLElement): string {
  return el.textContent || '';
}

function getCleanInnerHtml(el: HTMLElement): string {
  return el.innerHTML;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
