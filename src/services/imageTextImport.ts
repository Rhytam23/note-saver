/**
 * Real on-device OCR using tesseract.js.
 *
 * The image is processed in the browser — it is not uploaded anywhere. The first run on
 * a device does need the internet once, to download the English OCR model (a few MB);
 * the browser caches it after that.
 */

export interface OcrProgress {
  status: string;
  progress: number;
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// tesseract.js locates its own worker script by inspecting <script> tags on the page,
// which does not work under Vite (dev server or built output both serve it as a plain
// module, not a <script src>). workerPath pins it to the same jsDelivr URL tesseract.js's
// own browser default would resolve to for this exact version, so the rest of its internal
// path resolution (core, language data) proceeds exactly as it would unpatched.
const TESSERACT_VERSION = '5.1.1';

export async function extractImageText(file: File | Blob, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@v${TESSERACT_VERSION}/dist/worker.min.js`,
    logger: m => onProgress?.({ status: m.status, progress: m.progress }),
  });
  try {
    const { data } = await worker.recognize(file);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

/** Turns OCR output into HTML the TipTap editor can insert. */
export function ocrTextToHtml(text: string, fileName: string): string {
  const title = fileName.replace(/\.[a-z0-9]+$/i, '');
  if (!text) {
    return `<h3>${escapeHtml(title)}</h3><p><em>No text was found in this image.</em></p>`;
  }
  const paragraphs = text
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtml(block.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<h3>${escapeHtml(title)}</h3>${paragraphs}`;
}
