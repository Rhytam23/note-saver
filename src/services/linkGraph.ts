import type { Note } from '../types';
import { resolveOutgoingLinks } from './noteLinks';

export interface GraphNode {
  id: string;
  title: string;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface LinkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Builds the graph of [[wiki links]] between notes. Only notes that link to or are
 * linked from at least one other note are included — an isolated note would just be a
 * lone dot, which is not useful in a graph view.
 */
export function buildLinkGraph(notes: Note[]): LinkGraph {
  const live = notes.filter(n => !n.deleted);
  const edges: GraphEdge[] = [];
  const connected = new Set<string>();

  for (const note of live) {
    for (const link of resolveOutgoingLinks(note, live)) {
      if (!link.target) continue;
      edges.push({ from: note.id, to: link.target.id });
      connected.add(note.id);
      connected.add(link.target.id);
    }
  }

  const nodes = live.filter(n => connected.has(n.id)).map(n => ({ id: n.id, title: n.title || 'Untitled' }));
  return { nodes, edges };
}

/** Simple deterministic circle layout — no physics simulation, so it is stable and testable. */
export function layoutCircular(nodes: GraphNode[], radius = 160): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const count = nodes.length;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2;
    positions[node.id] = { x: Math.round(radius * Math.cos(angle)), y: Math.round(radius * Math.sin(angle)) };
  });
  return positions;
}
