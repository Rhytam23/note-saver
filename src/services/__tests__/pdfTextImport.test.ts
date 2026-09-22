import { describe, it, expect } from 'vitest';
import { pdfTextToHtml, type PdfTextResult } from '../pdfTextImport';

describe('pdfTextToHtml', () => {
  it('renders one heading and paragraph per page for a multi-page PDF', () => {
    const result: PdfTextResult = { pageCount: 2, pages: ['First page text', 'Second page text'] };
    const html = pdfTextToHtml(result, 'Chapter 3.pdf');
    expect(html).toContain('Chapter 3 — page 1');
    expect(html).toContain('First page text');
    expect(html).toContain('Chapter 3 — page 2');
    expect(html).toContain('Second page text');
  });

  it('uses a single heading with no page number for a one-page PDF', () => {
    const html = pdfTextToHtml({ pageCount: 1, pages: ['Only page'] }, 'Notes.pdf');
    expect(html).toContain('Notes</h3>');
    expect(html).not.toContain('page 1');
  });

  it('flags pages with no extractable text instead of showing a blank paragraph', () => {
    const html = pdfTextToHtml({ pageCount: 1, pages: [''] }, 'Scan.pdf');
    expect(html).toContain('No selectable text found');
  });

  it('escapes HTML in the extracted text and file name', () => {
    const html = pdfTextToHtml({ pageCount: 1, pages: ['<script>alert(1)</script>'] }, '<b>evil</b>.pdf');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>evil</b>');
    expect(html).toContain('&lt;script&gt;');
  });
});
