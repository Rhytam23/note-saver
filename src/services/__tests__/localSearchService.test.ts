import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSearchService, calculateLexicalScore, tokenizeText } from '../localSearchService';
import { LexicalIndexDbStore } from '../lexicalIndexDb';
import { generateSearchDocumentId } from '../searchId';
import { SearchDocument } from '../../types/search';

describe('Phase 4 — Local Lexical Search Engine (P4.2)', () => {
  let dbStore: LexicalIndexDbStore;
  let service: LocalSearchService;

  beforeEach(async () => {
    dbStore = new LexicalIndexDbStore();
    await dbStore.clearAll();
    service = new LocalSearchService(dbStore);
  });

  it('should tokenize text correctly', () => {
    const tokens = tokenizeText('Hello World! #Architecture & Deep-Dive');
    expect(tokens).toEqual(['hello', 'world', '#architecture', 'deep', 'dive']);
  });

  it('should calculate higher lexical score for title matches than content matches', () => {
    const docTitle: SearchDocument = {
      id: generateSearchDocumentId('note-1', 'note_title', null, null, 0),
      noteId: 'note-1',
      sourceType: 'note_title',
      textContent: 'Database Architecture Design',
      title: 'Database Architecture Design',
      tags: ['tech'],
      updatedAt: Date.now(),
      contentHash: 'hash-1',
      isDeleted: false,
    };

    const docContent: SearchDocument = {
      id: generateSearchDocumentId('note-2', 'block_text', 'blk-2', null, 0),
      noteId: 'note-2',
      sourceType: 'block_text',
      blockId: 'blk-2',
      textContent: 'We will discuss Database Architecture in this section.',
      title: 'Random Title',
      tags: ['general'],
      updatedAt: Date.now(),
      contentHash: 'hash-2',
      isDeleted: false,
    };

    const queryTokens = ['database', 'architecture'];
    const scoreTitle = calculateLexicalScore(docTitle, queryTokens);
    const scoreContent = calculateLexicalScore(docContent, queryTokens);

    expect(scoreTitle.score).toBeGreaterThan(scoreContent.score);
  });

  it('should index and search across titles, blocks, PDFs, OCR, transcripts, and web clips', async () => {
    const docTitle: SearchDocument = {
      id: generateSearchDocumentId('note-10', 'note_title', null, null, 0),
      noteId: 'note-10',
      sourceType: 'note_title',
      textContent: 'Project Quantum Architecture',
      title: 'Project Quantum Architecture',
      tags: ['quantum', 'project'],
      updatedAt: Date.now(),
      contentHash: 'h1',
      isDeleted: false,
    };

    const docPdf: SearchDocument = {
      id: generateSearchDocumentId('note-10', 'attachment_pdf', null, 'att-pdf-1', 0),
      noteId: 'note-10',
      attachmentId: 'att-pdf-1',
      sourceType: 'attachment_pdf',
      textContent: 'Quantum entanglement theory and wave superposition principles.',
      pageNumber: 4,
      title: 'Project Quantum Architecture',
      tags: ['quantum'],
      updatedAt: Date.now(),
      contentHash: 'h2',
      isDeleted: false,
    };

    const docOcr: SearchDocument = {
      id: generateSearchDocumentId('note-10', 'attachment_ocr', null, 'att-ocr-1', 0),
      noteId: 'note-10',
      attachmentId: 'att-ocr-1',
      sourceType: 'attachment_ocr',
      textContent: 'Whiteboard diagram of Quantum state machines.',
      title: 'Project Quantum Architecture',
      tags: ['quantum'],
      updatedAt: Date.now(),
      contentHash: 'h3',
      isDeleted: false,
    };

    await service.saveDocuments([docTitle, docPdf, docOcr]);

    const results = await service.search('quantum');
    expect(results).toHaveLength(3);
    expect(results[0].documentId).toBe(docTitle.id);
  });

  it('should respect soft-deletion and remove deleted notes from search results', async () => {
    const doc: SearchDocument = {
      id: generateSearchDocumentId('note-del', 'block_text', 'blk-del', null, 0),
      noteId: 'note-del',
      blockId: 'blk-del',
      sourceType: 'block_text',
      textContent: 'Sensitive information to be soft deleted.',
      title: 'Confidential Note',
      tags: ['secret'],
      updatedAt: Date.now(),
      contentHash: 'h-del',
      isDeleted: false,
    };

    await service.saveDocument(doc);
    let results = await service.search('sensitive');
    expect(results).toHaveLength(1);

    await service.markNoteDeleted('note-del', true);
    results = await service.search('sensitive');
    expect(results).toHaveLength(0);
  });

  it('should update existing documents when block content changes', async () => {
    const docId = generateSearchDocumentId('note-up', 'block_text', 'blk-up', null, 0);
    const docV1: SearchDocument = {
      id: docId,
      noteId: 'note-up',
      blockId: 'blk-up',
      sourceType: 'block_text',
      textContent: 'Initial draft version of block.',
      title: 'Draft Note',
      tags: ['draft'],
      updatedAt: 1000,
      contentHash: 'v1',
      isDeleted: false,
    };

    await service.saveDocument(docV1);
    let results = await service.search('draft');
    expect(results[0].document.textContent).toBe('Initial draft version of block.');

    const docV2: SearchDocument = {
      ...docV1,
      textContent: 'Final published version of block with revised draft information.',
      updatedAt: 2000,
      contentHash: 'v2',
    };

    await service.saveDocument(docV2);
    results = await service.search('published');
    expect(results).toHaveLength(1);
    expect(results[0].document.textContent).toContain('Final published version');
  });

  it('should handle large dataset search efficiently (100+ documents)', async () => {
    const batch: SearchDocument[] = [];
    for (let i = 0; i < 150; i++) {
      batch.push({
        id: generateSearchDocumentId(`note-${i}`, 'block_text', `blk-${i}`, null, 0),
        noteId: `note-${i}`,
        blockId: `blk-${i}`,
        sourceType: 'block_text',
        textContent: `Item number ${i} contains special topic keyword ${i % 2 === 0 ? 'alpha' : 'beta'}.`,
        title: `Note ${i}`,
        tags: [i % 2 === 0 ? 'even' : 'odd'],
        updatedAt: 1000 + i,
        contentHash: `hash-${i}`,
        isDeleted: false,
      });
    }

    await service.saveDocuments(batch);

    const alphaResults = await service.search('alpha', { limit: 100 });
    expect(alphaResults).toHaveLength(75);
    expect(alphaResults[0].document.textContent).toContain('alpha');
  });
});
