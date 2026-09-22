import { describe, it, expect } from 'vitest';
import { buildSharedNote } from '../sharedContent';

describe('buildSharedNote', () => {
  it('returns null when nothing was shared', () => {
    expect(buildSharedNote('')).toBeNull();
    expect(buildSharedNote('?other=1')).toBeNull();
  });

  it('builds a note from a shared page', () => {
    const note = buildSharedNote('?share_title=Krebs%20cycle&share_text=Notes%20from%20class&share_url=https%3A%2F%2Fexample.com%2Fbio');
    expect(note?.title).toBe('Krebs cycle');
    expect(note?.content).toContain('<p>Notes from class</p>');
    expect(note?.content).toContain('<a href="https://example.com/bio">https://example.com/bio</a>');
  });

  it('escapes HTML so shared text can never inject markup', () => {
    const note = buildSharedNote('?share_title=' + encodeURIComponent('<img src=x onerror=alert(1)>') + '&share_text=' + encodeURIComponent('<script>alert(1)</script>'));
    expect(note?.title).not.toContain('<script');
    expect(note?.content).not.toContain('<script');
    expect(note?.content).toContain('&lt;script&gt;');
  });

  it('drops links that are not http(s)', () => {
    const note = buildSharedNote('?share_text=hi&share_url=' + encodeURIComponent('javascript:alert(1)'));
    expect(note?.content).not.toContain('javascript:');
    expect(note?.content).not.toContain('<a ');
  });

  it('does not repeat a link that is already in the text', () => {
    const note = buildSharedNote('?share_text=' + encodeURIComponent('Read https://example.com') + '&share_url=' + encodeURIComponent('https://example.com'));
    expect(note?.content.match(/example\.com/g)).toHaveLength(1);
  });

  it('falls back to the first line of text, then the link, for the title', () => {
    expect(buildSharedNote('?share_text=' + encodeURIComponent('First line\nSecond'))?.title).toBe('First line');
    expect(buildSharedNote('?share_url=' + encodeURIComponent('https://example.com'))?.title).toBe('https://example.com');
  });

  it('keeps line breaks and paragraphs', () => {
    const note = buildSharedNote('?share_text=' + encodeURIComponent('a\nb\n\nc'));
    expect(note?.content).toBe('<p>a<br>b</p><p>c</p>');
  });
});
