import { describe, it, expect } from 'vitest';
import type { Attachment } from '../../types/attachment';
import { processPdfAttachment } from '../pdfPipeline';
import { processImageAttachment } from '../imageOcrPipeline';
import { createAudioBlocksFromTranscription } from '../transcriptionService';
import { handwritingService, createSamplePoint } from '../handwritingService';
import { createBookmarkBlockFromClip, isValidPublicUrl } from '../webClipper';

describe('NoteNirman 2.0 P3.3-P3.9 Suite — Multimodal Extraction & Block Pipelines', () => {

  const sampleAttachment: Attachment = {
    id: 'att-multi-1',
    noteId: 'note-multi-101',
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    checksumSha256: 'sha-multi-1',
    localUri: 'att-multi-1',
    status: 'local_only',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { pageCount: 2 },
  };

  it('1. [PDF Pipeline] should create parent PDF block and derived page text blocks with stable UUIDs', async () => {
    const { pdfBlock, derivedBlocks } = await processPdfAttachment(sampleAttachment);
    expect(pdfBlock.type).toBe('pdf');
    expect(pdfBlock.properties.attachmentId).toBe('att-multi-1');
    expect(derivedBlocks).toHaveLength(2);
    expect(derivedBlocks[0].parentId).toBe(pdfBlock.id);
    expect(derivedBlocks[0].properties.pageNumber).toBe(1);
  });

  it('2. [Image & OCR Pipeline] should create image block and derived OCR text block without overwriting original', async () => {
    const imgAtt: Attachment = {
      ...sampleAttachment,
      filename: 'receipt.png',
      mimeType: 'image/png',
      metadata: { extractedText: 'Total: $42.00' },
    };

    const { imageBlock, derivedBlocks } = await processImageAttachment(imgAtt);
    expect(imageBlock.type).toBe('image');
    expect(derivedBlocks).toHaveLength(1);
    expect(derivedBlocks[0].content).toBe('Total: $42.00');
  });

  it('3. [Audio & Transcription] should create audio block and timestamped transcript blocks', () => {
    const audioAtt: Attachment = {
      ...sampleAttachment,
      filename: 'interview.webm',
      mimeType: 'audio/webm',
      metadata: { durationSec: 10, waveform: [10, 50, 90] },
    };

    const { audioBlock, derivedBlocks } = createAudioBlocksFromTranscription(audioAtt, {
      fullText: 'Hello world',
      segments: [{ startTimeSec: 0, endTimeSec: 4, text: 'Hello world', speakerId: 'S1' }],
    });

    expect(audioBlock.type).toBe('audio');
    expect(derivedBlocks).toHaveLength(1);
    expect(derivedBlocks[0].content).toBe('[00:00] Hello world');
  });

  it('4. [Handwriting Service] should create canvas, add vector strokes, and render SVG block', () => {
    const canvas = handwritingService.createCanvas('note-multi-101', 500, 400);
    const stroke = {
      id: 'stroke-1',
      points: [createSamplePoint(10, 10), createSamplePoint(20, 20)],
      width: 3,
      metadata: { color: '#000000', toolType: 'pen' as const, opacity: 1 },
    };

    const updated = handwritingService.addStroke(canvas, stroke);
    expect(updated.strokes).toHaveLength(1);

    const block = handwritingService.createBlockFromCanvas(updated);
    expect(block.type).toBe('diagram');
    expect(block.content).toContain('<svg');
    expect(block.properties.isHandwriting).toBe(true);
  });

  it('5. [Web Clipper] should validate URLs and create bookmark block', () => {
    expect(isValidPublicUrl('https://example.com/article')).toBe(true);
    expect(isValidPublicUrl('http://localhost:8080')).toBe(false);

    const bookmark = createBookmarkBlockFromClip('note-multi-101', {
      url: 'https://example.com/article',
      title: 'Example Article',
      excerpt: 'Summary text',
    });

    expect(bookmark.type).toBe('bookmark');
    expect(bookmark.properties.title).toBe('Example Article');
  });

});
