import { describe, it, expect } from 'vitest';
import { ocrTextToHtml } from '../imageTextImport';

describe('ocrTextToHtml', () => {
  it('splits recognized text into paragraphs by blank lines', () => {
    const html = ocrTextToHtml('First paragraph\nstill first\n\nSecond paragraph', 'whiteboard.jpg');
    expect(html).toContain('whiteboard</h3>');
    expect(html).toContain('First paragraph<br>still first');
    expect(html).toContain('Second paragraph');
  });

  it('says clearly when nothing was found instead of inserting an empty paragraph', () => {
    const html = ocrTextToHtml('', 'blank.png');
    expect(html).toContain('No text was found');
  });

  it('escapes HTML in both the recognized text and the file name', () => {
    const html = ocrTextToHtml('<script>alert(1)</script>', '<b>x</b>.png');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;script&gt;');
  });
});
