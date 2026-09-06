import { v4 as uuidv4 } from 'uuid';
import type { Attachment } from '../types/attachment';
import type { Block } from '../types/block';

export interface ImageProcessingResult {
  width?: number;
  height?: number;
  ocrText?: string;
  previewUrl?: string;
}

/**
 * NoteNirman 2.0 — Image Capture & OCR Processing Pipeline
 * 
 * Invariants:
 * - Keeps original source image intact.
 * - OCR result becomes derived content.
 * - Large binary image data remains OUTSIDE Y.Doc and Note.content HTML strings.
 */
export async function processImageAttachment(
  attachment: Attachment,
  _imageData?: ArrayBuffer | Blob
): Promise<{ imageBlock: Block; derivedBlocks: Block[] }> {
  const now = new Date().toISOString();
  const imageBlockId = uuidv4();

  const width = attachment.metadata?.dimensions?.width || 800;
  const height = attachment.metadata?.dimensions?.height || 600;

  const imageBlock: Block = {
    id: imageBlockId,
    noteId: attachment.noteId,
    parentId: null,
    type: 'image',
    content: attachment.remoteUrl || attachment.localUri || '',
    properties: {
      attachmentId: attachment.id,
      url: attachment.remoteUrl || attachment.localUri || '',
      caption: attachment.filename,
      fileSizeBytes: attachment.sizeBytes,
      mimeType: attachment.mimeType,
      dimensions: { width, height },
    },
    position: 0,
    createdAt: now,
    updatedAt: now,
  };

  const derivedBlocks: Block[] = [];

  // Generate derived OCR text block if OCR text is available
  if (attachment.metadata?.extractedText) {
    derivedBlocks.push({
      id: uuidv4(),
      noteId: attachment.noteId,
      parentId: imageBlockId,
      type: 'paragraph',
      content: attachment.metadata.extractedText,
      properties: {
        attachmentId: attachment.id,
        extractedText: attachment.metadata.extractedText,
      },
      position: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { imageBlock, derivedBlocks };
}
