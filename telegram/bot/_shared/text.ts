// Pure text helpers for the Telegram bot. No Deno or Node APIs.

export const MAX_TITLE = 200;
export const MAX_BODY = 15000;
export const TG_MESSAGE_LIMIT = 4000; // Telegram's hard cap is 4096

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The editor stores notes as HTML, so a plain-text body becomes one <p> per line. */
export function textToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function htmlToText(html: string): string {
  return decodeEntities(
    (html || '')
      .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Good-enough Markdown for /export and /backup: headings, lists, task items, paragraphs. */
export function htmlToMarkdown(html: string): string {
  const md = (html || '')
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, inner) => `\n${'#'.repeat(Number(level))} ${inner}\n`)
    .replace(
      /<li[^>]*data-type="taskItem"[^>]*data-checked="(true|false)"[^>]*>([\s\S]*?)<\/li>/gi,
      (_m, checked, inner) => `\n- [${checked === 'true' ? 'x' : ' '}] ${inner}`,
    )
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner) => `\n- ${inner}`)
    .replace(/<\/(p|div|tr|blockquote|ul|ol|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[hd]>/gi, ' | ')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(md)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Escapes LIKE/ILIKE wildcards so user input is matched literally. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Splits long output into Telegram-sized chunks, preferring line breaks. */
export function chunkText(text: string, limit = TG_MESSAGE_LIMIT): string[] {
  if (text.length <= limit) return [text || ' '];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** Safe filename stem for /export: letters, digits, dash, underscore. */
export function sanitizeFilename(title: string): string {
  const stem = (title || 'note')
    .normalize('NFKD')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return stem || 'note';
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return 'unknown';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

/** One-line excerpt around the first match, for /search results. */
export function snippet(text: string, query: string, radius = 40): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return flat.slice(0, radius * 2);
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + query.length + radius);
  return `${start > 0 ? '...' : ''}${flat.slice(start, end)}${end < flat.length ? '...' : ''}`;
}

/** Title for /quick: the first ~40 characters, cut at a word boundary. */
export function titleFromText(text: string, max = 40): string {
  const firstLine = text.trim().split(/\r?\n/)[0];
  if (firstLine.length <= max) return firstLine;
  const cut = firstLine.lastIndexOf(' ', max);
  return firstLine.slice(0, cut > 10 ? cut : max).trim() + '...';
}
