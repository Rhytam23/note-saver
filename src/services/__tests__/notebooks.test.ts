import { describe, it, expect } from 'vitest';
import { isNotebookTag, buildNotebookTagName, groupNotebooks } from '../notebooks';

describe('notebooks (built on tags, no schema change)', () => {
  it('recognizes notebook tags and ignores ordinary ones', () => {
    expect(isNotebookTag('notebook:Physics/Waves')).toBe(true);
    expect(isNotebookTag('study')).toBe(false);
    expect(isNotebookTag('notebook:')).toBe(false);
  });

  it('builds a stable, slash-free tag name from subject and chapter', () => {
    expect(buildNotebookTagName('Physics', 'Waves')).toBe('notebook:Physics/Waves');
    expect(buildNotebookTagName('Bio/Chem', 'Cells/Membranes')).toBe('notebook:Bio Chem/Cells Membranes');
  });

  it('groups chapters under their subject, alphabetically', () => {
    const notebooks = groupNotebooks([
      { name: 'notebook:Physics/Waves' },
      { name: 'notebook:Biology/Cells' },
      { name: 'notebook:Physics/Optics' },
      { name: 'study' },
      { name: 'notebook:' },
    ]);
    expect(notebooks.map(n => n.subject)).toEqual(['Biology', 'Physics']);
    expect(notebooks[1].chapters.map(c => c.chapter)).toEqual(['Optics', 'Waves']);
    expect(notebooks[1].chapters[0].tagName).toBe('notebook:Physics/Optics');
  });

  it('treats a subject with no chapter as its own single-chapter notebook', () => {
    const notebooks = groupNotebooks([{ name: 'notebook:Journal' }]);
    expect(notebooks).toEqual([{ subject: 'Journal', chapters: [{ tagName: 'notebook:Journal', chapter: 'Journal' }] }]);
  });
});
