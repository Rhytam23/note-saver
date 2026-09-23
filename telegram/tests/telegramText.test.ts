import { describe, it, expect } from 'vitest';
import {
  chunkText,
  escapeLike,
  htmlToMarkdown,
  htmlToText,
  maskEmail,
  sanitizeFilename,
  snippet,
  textToHtml,
  timingSafeEqual,
  titleFromText,
} from '../bot/_shared/text';

describe('telegram text helpers', () => {
  it('turns plain text into escaped editor paragraphs', () => {
    expect(textToHtml('Line one\n\nLine <two> & more')).toBe('<p>Line one</p><p>Line &lt;two&gt; &amp; more</p>');
  });

  it('round-trips text through HTML', () => {
    const text = 'First\nSecond & third <b>';
    expect(htmlToText(textToHtml(text))).toBe(text);
  });

  it('cannot smuggle markup in through a note body', () => {
    expect(textToHtml('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('converts editor HTML to Markdown including task items', () => {
    const html =
      '<h2>Plan</h2><p>Intro</p><ul><li><p>one</p></li></ul>' +
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>todo</p></li>' +
      '<li data-type="taskItem" data-checked="true"><p>done</p></li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('## Plan');
    expect(md).toContain('- one');
    expect(md).toContain('- [ ] todo');
    expect(md).toContain('- [x] done');
  });

  it('escapes LIKE wildcards so user input matches literally', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('compares secrets without an early exit on length or content', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('splits long messages under the limit, preferring line breaks', () => {
    const text = Array.from({ length: 50 }, (_, i) => `line ${i} `.padEnd(100, 'x')).join('\n');
    const chunks = chunkText(text, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
    expect(chunks.join('\n').replace(/\n+/g, '\n')).toBe(text);
    expect(chunkText('', 1000)).toEqual([' ']);
  });

  it('builds safe filenames', () => {
    expect(sanitizeFilename('Physics: Chapter 3 / "Waves"!')).toBe('Physics-Chapter-3-Waves');
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFilename('!!!')).toBe('note');
  });

  it('masks emails', () => {
    expect(maskEmail('student@example.com')).toBe('st*****@example.com');
    expect(maskEmail(null)).toBe('unknown');
  });

  it('cuts /quick titles at a word boundary', () => {
    expect(titleFromText('Buy graph paper')).toBe('Buy graph paper');
    const long = titleFromText('Remember to submit the chemistry lab report before the deadline on Friday');
    expect(long.length).toBeLessThanOrEqual(44);
    expect(long.endsWith('...')).toBe(true);
  });

  it('shows context around a search hit', () => {
    const s = snippet('a'.repeat(100) + ' photosynthesis ' + 'b'.repeat(100), 'photosynthesis');
    expect(s).toContain('photosynthesis');
    expect(s.startsWith('...')).toBe(true);
  });
});
