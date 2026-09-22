import { describe, it, expect } from 'vitest';
import type { Note } from '../../types';
import { buildLinkGraph, layoutCircular } from '../linkGraph';

const note = (id: string, title: string, content: string, extra: Partial<Note> = {}): Note =>
  ({ id, title, content, tags: [], isPinned: false, priority: 'none', createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z', ...extra } as Note);

describe('buildLinkGraph', () => {
  it('includes only notes that are actually linked, with one edge per resolved link', () => {
    const a = note('a', 'Physics', '<p>[[Chemistry]]</p>');
    const b = note('b', 'Chemistry', '<p>no links</p>');
    const c = note('c', 'Unrelated', '<p>nothing</p>');
    const graph = buildLinkGraph([a, b, c]);

    expect(graph.nodes.map(n => n.id).sort()).toEqual(['a', 'b']);
    expect(graph.edges).toEqual([{ from: 'a', to: 'b' }]);
  });

  it('ignores links to titles that do not match any note', () => {
    const a = note('a', 'Physics', '<p>[[Nonexistent]]</p>');
    expect(buildLinkGraph([a])).toEqual({ nodes: [], edges: [] });
  });

  it('excludes deleted notes from both nodes and edges', () => {
    const a = note('a', 'Physics', '<p>[[Chemistry]]</p>');
    const b = note('b', 'Chemistry', '', { deleted: true });
    expect(buildLinkGraph([a, b])).toEqual({ nodes: [], edges: [] });
  });
});

describe('layoutCircular', () => {
  it('places every node on the circle and gives each a distinct position', () => {
    const nodes = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }];
    const positions = layoutCircular(nodes, 100);
    expect(Object.keys(positions).sort()).toEqual(['a', 'b', 'c']);
    for (const p of Object.values(positions)) {
      expect(Math.round(Math.sqrt(p.x ** 2 + p.y ** 2))).toBeLessThanOrEqual(100);
    }
    expect(new Set(Object.values(positions).map(p => `${p.x},${p.y}`)).size).toBe(3);
  });

  it('handles an empty graph without dividing by zero', () => {
    expect(layoutCircular([])).toEqual({});
  });
});
