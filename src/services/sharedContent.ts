export interface SharedNoteDraft {
  title: string;
  content: string;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const MAX_TEXT_LENGTH = 20000;
const MAX_TITLE_LENGTH = 120;

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Turns the query string of a "Share to NoteNirman" launch into a note.
 * Everything arrives from another app, so all of it is escaped and URLs must be http(s).
 * Returns null when nothing was shared.
 */
export function buildSharedNote(search: string): SharedNoteDraft | null {
  const params = new URLSearchParams(search);
  const title = (params.get('share_title') ?? '').trim();
  const text = (params.get('share_text') ?? '').trim().slice(0, MAX_TEXT_LENGTH);
  const url = (params.get('share_url') ?? '').trim();

  if (!title && !text && !url) return null;

  const paragraphs: string[] = [];
  if (text) {
    for (const block of text.split(/\n{2,}/)) {
      paragraphs.push(`<p>${escapeHtml(block.trim()).replace(/\n/g, '<br>')}</p>`);
    }
  }
  // Some apps put the link inside the text; only add it separately when it is not already there.
  if (url && isSafeHttpUrl(url) && !text.includes(url)) {
    const safe = escapeHtml(url);
    paragraphs.push(`<p><a href="${safe}">${safe}</a></p>`);
  }

  const fallbackTitle = text ? text.split('\n')[0] : url;
  return {
    title: (title || fallbackTitle || 'Shared note').slice(0, MAX_TITLE_LENGTH),
    content: paragraphs.join(''),
  };
}
