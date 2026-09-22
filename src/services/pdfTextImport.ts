/**
 * Real PDF text extraction using pdfjs-dist, run entirely on-device — the PDF
 * bytes never leave the browser.
 */

export interface PdfTextResult {
  pageCount: number;
  /** One string per page, in order. Empty pages (e.g. scanned images) come back as ''. */
  pages: string[];
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function extractPdfText(file: File | Blob): Promise<PdfTextResult> {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const pages: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim();
      pages.push(text);
    }
  } finally {
    await doc.destroy();
  }

  return { pageCount: doc.numPages, pages };
}

/** Turns extracted pages into HTML the TipTap editor can insert, one heading + paragraph per page. */
export function pdfTextToHtml(result: PdfTextResult, fileName: string): string {
  const title = fileName.replace(/\.pdf$/i, '');
  const parts = result.pages.map((text, i) => {
    const heading = result.pageCount > 1 ? `<h3>${escapeHtml(title)} — page ${i + 1}</h3>` : `<h3>${escapeHtml(title)}</h3>`;
    const body = text
      ? `<p>${escapeHtml(text)}</p>`
      : `<p><em>No selectable text found on this page (it may be a scanned image).</em></p>`;
    return heading + body;
  });
  return parts.join('');
}
