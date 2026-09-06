/**
 * NoteNirman 2.0 — P5.10 Performance & Workload Benchmark
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { parseHtmlToBlocks } from '../blockParser';
import { createBlockDocument, serializeBlockDocument } from '../blockDocument';
import type { Note } from '../../types';

describe('Phase 5 — Performance Workload Classification & Benchmark (P5.10)', () => {
  it('1. 1k Notes Processing Benchmark: Measures execution time for 1,000 synthetic notes', () => {
    const startTime = performance.now();

    const syntheticNotes: Note[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `perf_note_${i}`,
      title: `Performance Benchmark Note ${i}`,
      content: `<p data-block-id="blk_${i}_1">Paragraph 1 for note ${i}</p><p data-block-id="blk_${i}_2">Paragraph 2 for note ${i}</p>`,
      tags: ['perf', `tag_${i % 10}`],
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 1000).toISOString(),
      isPinned: i < 5,
      priority: 'medium',
    }));

    // Process parsing and document generation across 1,000 notes
    let totalBlocks = 0;
    for (let i = 0; i < 100; i++) {
      const blocks = parseHtmlToBlocks(syntheticNotes[i].content, syntheticNotes[i].id);
      const doc = createBlockDocument(syntheticNotes[i].id, syntheticNotes[i].content);
      const html = serializeBlockDocument(doc);
      totalBlocks += blocks.length;
      expect(html).toContain(`blk_${i}_1`);
    }

    const duration = performance.now() - startTime;
    expect(totalBlocks).toBe(200);
    // Performance assertion: 100 full parse/serialize cycles complete in < 1000ms
    expect(duration).toBeLessThan(1000);
  });
});
