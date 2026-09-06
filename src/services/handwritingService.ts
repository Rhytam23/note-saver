import { v4 as uuidv4 } from 'uuid';
import type { VectorPoint, VectorStroke, HandwritingCanvasDocument } from '../types/handwriting';
import type { Block } from '../types/block';

/**
 * NoteNirman 2.0 — Handwriting & Vector Stroke Service
 */
export class HandwritingService {
  public createCanvas(noteId: string, widthPx = 800, heightPx = 600): HandwritingCanvasDocument {
    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      noteId,
      widthPx,
      heightPx,
      strokes: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  public addStroke(doc: HandwritingCanvasDocument, stroke: VectorStroke): HandwritingCanvasDocument {
    return {
      ...doc,
      strokes: [...doc.strokes, stroke],
      updatedAt: new Date().toISOString(),
    };
  }

  public removeStroke(doc: HandwritingCanvasDocument, strokeId: string): HandwritingCanvasDocument {
    return {
      ...doc,
      strokes: doc.strokes.filter(s => s.id !== strokeId),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert vector stroke canvas to an SVG string fallback representation.
   */
  public renderToSvg(doc: HandwritingCanvasDocument): string {
    const strokePaths = doc.strokes.map(s => {
      if (s.points.length === 0) return '';
      const pathData = s.points.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
      }, '');
      return `<path d="${pathData}" stroke="${s.metadata.color}" stroke-width="${s.width}" stroke-opacity="${s.metadata.opacity}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.widthPx} ${doc.heightPx}" width="${doc.widthPx}" height="${doc.heightPx}">\n${strokePaths}\n</svg>`;
  }

  /**
   * Create a diagram block from a handwriting canvas document.
   */
  public createBlockFromCanvas(doc: HandwritingCanvasDocument): Block {
    const now = new Date().toISOString();
    const svg = this.renderToSvg(doc);
    return {
      id: doc.id,
      noteId: doc.noteId,
      parentId: null,
      type: 'diagram',
      content: svg,
      properties: {
        vectorCanvasId: doc.id,
        isHandwriting: true,
        strokeCount: doc.strokes.length,
        widthPx: doc.widthPx,
        heightPx: doc.heightPx,
        rawStrokes: JSON.stringify(doc.strokes),
      },
      position: 0,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export const handwritingService = new HandwritingService();

export function createSamplePoint(x: number, y: number, pressure = 0.5, timeOffsetMs = 0): VectorPoint {
  return Object.freeze({ x, y, pressure, timeOffsetMs });
}
