import React from 'react';
import DOMPurify from 'dompurify';
import type { Block } from '../../types/block';

/**
 * SECURITY: All block HTML content MUST pass through sanitizeBlockHtml before
 * being set via dangerouslySetInnerHTML. This prevents stored XSS from
 * malicious note content reaching any viewer's browser.
 *
 * DOMPurify strips:
 *  - <script>, <iframe>, <object>, <embed>, <form>, <svg> tags
 *  - javascript:, vbscript:, data: URLs in href/src
 *  - inline event handlers (onerror, onload, onclick, etc.)
 *  - SVG/MathML script vectors
 */
const BLOCK_DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'strong', 'em', 'u', 's', 'span', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'a', 'img', 'hr',
  ] as string[],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'data-block-id', 'data-type', 'checked', 'class'] as string[],
  ALLOW_DATA_ATTR: false as const,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math', 'link'] as string[],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange'] as string[],
} as const;

function sanitizeBlockHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, BLOCK_DOMPURIFY_CONFIG) as string;
}

/**
 * SECURITY: Validate that a URL is safe to use as an img/audio/pdf src or href.
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 */
function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  return true;
}

interface BlockItemProps {
  block: Block;
  children?: React.ReactNode;
  isSelected?: boolean;
  onSelect?: (blockId: string) => void;
  onContentChange?: (blockId: string, newContent: string) => void;
}

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  children,
  isSelected,
  onSelect,
  onContentChange,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(block.id);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    onContentChange?.(block.id, e.currentTarget.innerHTML);
  };

  const containerClasses = `relative group rounded-md p-1.5 my-1 transition-all duration-150 ${
    isSelected ? 'bg-accent/10 ring-2 ring-accent/40' : 'hover:bg-black/5 dark:hover:bg-white/5'
  }`;

  return (
    <div
      data-block-id={block.id}
      data-block-type={block.type}
      className={containerClasses}
      onClick={handleClick}
    >
      {renderBlockContent(block, handleInput)}
      {children && <div className="ml-5 border-l-2 border-accent/20 pl-2 mt-1">{children}</div>}
    </div>
  );
};

function renderBlockContent(
  block: Block,
  handleInput: (e: React.FormEvent<HTMLElement>) => void
): React.ReactNode {
  // SECURITY: rawHtml must always be sanitized before rendering
  if (block.properties && block.properties.rawHtml) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.properties.rawHtml) }}
        className="prose dark:prose-invert max-w-none"
      />
    );
  }

  switch (block.type) {
    case 'heading': {
      const level = block.properties.level || 1;
      const Tag = (`h${level}` as unknown) as React.ElementType;
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold font-serif mb-1',
        2: 'text-xl font-bold font-serif mb-1',
        3: 'text-lg font-semibold font-serif mb-1',
        4: 'text-base font-semibold font-serif mb-1',
        5: 'text-sm font-semibold font-serif mb-1',
        6: 'text-xs font-semibold font-serif mb-1',
      };
      return (
        <Tag
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
          className={`${sizes[level]} outline-none`}
        />
      );
    }

    case 'quote':
      return (
        <blockquote
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
          className="border-l-4 border-accent pl-4 italic opacity-90 outline-none my-1"
        />
      );

    case 'callout':
      return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20 my-2">
          <span className="text-xl flex-shrink-0">{block.properties.emoji || '💡'}</span>
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
            className="flex-1 outline-none text-sm"
          />
        </div>
      );

    case 'bulletList':
      return (
        <div className="flex items-start gap-2">
          <span className="text-accent font-bold mt-0.5">•</span>
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
            className="flex-1 outline-none"
          />
        </div>
      );

    case 'numberedList':
      return (
        <div className="flex items-start gap-2">
          <span className="font-mono text-xs opacity-70 mt-1">{block.position + 1}.</span>
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
            className="flex-1 outline-none"
          />
        </div>
      );

    case 'checklist':
    case 'task':
      return (
        <div className="flex items-center gap-2.5 my-1">
          <input
            type="checkbox"
            checked={Boolean(block.properties.checked)}
            onChange={() => {}}
            className="h-4 w-4 rounded border-accent text-accent focus:ring-accent accent-accent cursor-pointer"
          />
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
            className={`flex-1 outline-none ${block.properties.checked ? 'line-through opacity-50' : ''}`}
          />
        </div>
      );

    case 'code':
      return (
        <div className="relative font-mono text-xs rounded-lg p-3 bg-black/80 text-green-400 my-2 overflow-x-auto">
          <span className="absolute top-2 right-3 text-[10px] text-gray-400 uppercase">
            {block.properties.language || 'plaintext'}
          </span>
          <pre
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
            className="outline-none"
          />
        </div>
      );

    case 'table':
      return (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
          className="my-2 overflow-x-auto border border-white/20 rounded-lg p-2"
        />
      );

    case 'image': {
      // SECURITY: validate src URL to block javascript:/data: injection
      const imgSrc = block.content || block.properties.url;
      return (
        <div className="my-2 text-center">
          {isSafeUrl(imgSrc) ? (
            <img
              src={imgSrc}
              alt={block.properties.caption || 'Image'}
              className="max-h-96 mx-auto rounded-lg shadow-md object-contain"
            />
          ) : (
            <div className="text-xs text-red-400 font-mono p-2">[Image blocked: unsafe URL]</div>
          )}
          {block.properties.caption && (
            <p className="text-xs opacity-60 mt-1 italic">{block.properties.caption}</p>
          )}
        </div>
      );
    }

    case 'pdf': {
      // SECURITY: validate href to block javascript: injection
      const pdfHref = block.content;
      return (
        <div className="my-2 p-3 rounded-lg border border-accent/30 bg-accent/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-red-500/20 text-red-400 font-mono font-bold text-xs rounded">PDF</span>
            <div>
              <p className="text-xs font-semibold">{block.properties.caption || 'PDF Document'}</p>
              <p className="text-[10px] opacity-60 font-mono">{block.properties.pageCount ? `${block.properties.pageCount} pages` : 'Document'}</p>
            </div>
          </div>
          {pdfHref && isSafeUrl(pdfHref) && (
            <a href={pdfHref} target="_blank" rel="noreferrer" className="text-xs text-accent underline">View PDF</a>
          )}
        </div>
      );
    }

    case 'audio': {
      // SECURITY: validate src URL
      const audioSrc = block.content;
      return (
        <div className="my-2 p-3 rounded-lg border border-accent/30 bg-accent/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-accent">AUDIO NOTE</span>
            <span className="opacity-60 font-mono">{block.properties.durationSec ? `${block.properties.durationSec}s` : ''}</span>
          </div>
          {audioSrc && isSafeUrl(audioSrc) && (
            <audio controls src={audioSrc} className="w-full h-8" />
          )}
        </div>
      );
    }

    case 'bookmark': {
      // SECURITY: validate bookmark URL to prevent javascript: href injection
      const bookmarkUrl = block.properties.url || block.content;
      const safeBookmarkUrl = isSafeUrl(bookmarkUrl) ? bookmarkUrl : '#';
      return (
        <div className="my-2 p-3 rounded-lg border border-accent/30 bg-black/10 dark:bg-white/5 space-y-1">
          <a href={safeBookmarkUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-accent hover:underline block truncate">
            {block.properties.title || block.content}
          </a>
          {block.properties.excerpt && (
            <p className="text-xs opacity-75 line-clamp-2">{block.properties.excerpt}</p>
          )}
          <span className="text-[10px] opacity-50 font-mono block">{block.properties.siteName || block.content}</span>
        </div>
      );
    }

    case 'diagram':
      if (block.properties.isHandwriting && block.content.startsWith('<svg')) {
        // SECURITY: SVG content must be sanitized — SVG can contain <script> elements
        return (
          <div className="my-2 p-2 rounded-lg border border-accent/20 bg-white dark:bg-black/40 text-center">
            <div dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }} className="max-h-80 mx-auto overflow-hidden" />
            <span className="text-[10px] opacity-50 font-mono block mt-1">Vector Handwriting Canvas</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-accent/40 bg-accent/5 my-2">
          <span className="text-xs px-2 py-0.5 rounded uppercase font-mono font-bold bg-accent/20 text-accent">diagram</span>
          <div className="flex-1 truncate text-xs font-mono opacity-80">{block.content || 'Diagram'}</div>
        </div>
      );

    case 'divider':
      return <hr className="my-4 border-t border-accent/30" />;

    case 'toggle':
      return (
        <details className="my-2 p-2 rounded-lg border border-accent/20">
          <summary className="font-semibold cursor-pointer outline-none">
            {block.properties.summary || 'Toggle Header'}
          </summary>
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
            className="mt-2 pl-4 outline-none"
          />
        </details>
      );

    case 'video':
    case 'file':
    case 'math':
    case 'embed':
    case 'database':
    case 'ai':
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-accent/40 bg-accent/5 my-2">
          <span className="text-xs px-2 py-0.5 rounded uppercase font-mono font-bold bg-accent/20 text-accent">
            {block.type}
          </span>
          <div className="flex-1 truncate text-xs font-mono opacity-80">
            {block.content || block.properties.url || `${block.type} structural block`}
          </div>
        </div>
      );

    default:
      return (
        <div
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: sanitizeBlockHtml(block.content) }}
          className="outline-none min-h-[1.5em]"
        />
      );
  }
}
