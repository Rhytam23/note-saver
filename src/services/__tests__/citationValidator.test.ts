import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CitationValidator } from '../citationValidator';
import { LocalSearchService } from '../localSearchService';
import { RagContextItem } from '../../types/search';

describe('Phase 4 — Citation & Provenance Validation (P4.10)', () => {
  let mockLocalSearch: LocalSearchService;
  let validator: CitationValidator;

  beforeEach(() => {
    mockLocalSearch = {
      getDocument: vi.fn(),
    } as unknown as LocalSearchService;

    validator = new CitationValidator(mockLocalSearch);
  });

  it('should parse citation ref IDs accurately from response text', () => {
    const text = 'According to [Ref 1], quantum computing uses qubits. Furthermore, [2] and [Ref 3] explain superposition.';
    const refIds = validator.parseCitationRefIds(text);
    expect(refIds).toEqual([1, 2, 3]);
  });

  it('should validate citation references present in the exact context bundle', async () => {
    const contextItems: RagContextItem[] = [
      {
        documentId: 'doc-1',
        noteId: 'note-1',
        noteTitle: 'Quantum Tech',
        sourceType: 'note_title',
        snippetText: 'Quantum technology fundamentals',
        priority: 1,
        tokenEstimate: 5,
      },
      {
        documentId: 'doc-2',
        noteId: 'note-1',
        noteTitle: 'Quantum Tech',
        blockId: 'blk-2',
        sourceType: 'block_text',
        snippetText: 'Qubit superposition and entanglement details',
        priority: 1,
        tokenEstimate: 7,
      },
    ];

    vi.spyOn(mockLocalSearch, 'getDocument').mockImplementation(async (id) => {
      if (id === 'doc-1') {
        return {
          id: 'doc-1',
          noteId: 'note-1',
          sourceType: 'note_title',
          textContent: 'Quantum technology fundamentals',
          title: 'Quantum Tech',
          tags: [],
          updatedAt: 100,
          contentHash: 'h1',
          isDeleted: false,
        };
      }
      if (id === 'doc-2') {
        return {
          id: 'doc-2',
          noteId: 'note-1',
          blockId: 'blk-2',
          sourceType: 'block_text',
          textContent: 'Qubit superposition and entanglement details',
          title: 'Quantum Tech',
          tags: [],
          updatedAt: 100,
          contentHash: 'h2',
          isDeleted: false,
        };
      }
      return null;
    });

    const responseText = 'Qubits operate on superposition [Ref 2] as part of Quantum Tech [1].';
    const result = await validator.validateCitations(responseText, contextItems);

    expect(result.validCitations).toHaveLength(2);
    expect(result.rejectedCitations).toHaveLength(0);

    expect(result.validCitations[0].refId).toBe(1);
    expect(result.validCitations[0].source.documentId).toBe('doc-1');
    expect(result.validCitations[1].refId).toBe(2);
    expect(result.validCitations[1].source.documentId).toBe('doc-2');
  });

  it('should reject citations that were NOT part of the request context bundle', async () => {
    const contextItems: RagContextItem[] = [
      {
        documentId: 'doc-1',
        noteId: 'note-1',
        noteTitle: 'Title 1',
        sourceType: 'note_title',
        snippetText: 'Snippet 1',
        priority: 1,
        tokenEstimate: 2,
      },
    ];

    const responseText = 'Invalid citation [Ref 99] here.';
    const result = await validator.validateCitations(responseText, contextItems);

    expect(result.validCitations).toHaveLength(0);
    expect(result.rejectedCitations).toHaveLength(1);
    expect(result.rejectedCitations[0].refId).toBe(99);
  });

  it('should reject citations that point to soft-deleted notes', async () => {
    const contextItems: RagContextItem[] = [
      {
        documentId: 'doc-del',
        noteId: 'note-del',
        noteTitle: 'Deleted Note',
        sourceType: 'note_title',
        snippetText: 'Old snippet',
        priority: 1,
        tokenEstimate: 2,
      },
    ];

    vi.spyOn(mockLocalSearch, 'getDocument').mockResolvedValue({
      id: 'doc-del',
      noteId: 'note-del',
      sourceType: 'note_title',
      textContent: 'Old snippet',
      title: 'Deleted Note',
      tags: [],
      updatedAt: 100,
      contentHash: 'h-del',
      isDeleted: true, // Soft deleted!
    });

    const responseText = 'Referencing deleted content [Ref 1].';
    const result = await validator.validateCitations(responseText, contextItems);

    expect(result.validCitations).toHaveLength(0);
    expect(result.rejectedCitations).toHaveLength(1);
    expect(result.rejectedCitations[0].reason).toContain('deleted');
  });
});
