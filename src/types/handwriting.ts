/**
 * NoteNirman 2.0 — Strongly Typed Handwriting & Vector Stroke Model
 * 
 * Invariants:
 * - Immutable, strongly-typed point and stroke interfaces.
 * - ZERO usage of `any`.
 * - Vector stroke data is preserved as primary source representation.
 */

export interface VectorPoint {
  readonly x: number;
  readonly y: number;
  readonly pressure: number; // 0.0 to 1.0 (default 0.5 if pointer device lacks pressure sensor)
  readonly timeOffsetMs: number; // Offset in milliseconds from stroke start
}

export interface VectorStrokeMetadata {
  readonly color: string;
  readonly toolType: 'pen' | 'highlighter' | 'eraser';
  readonly opacity: number;
}

export interface VectorStroke {
  readonly id: string; // UUID per stroke
  readonly points: ReadonlyArray<VectorPoint>;
  readonly width: number;
  readonly metadata: VectorStrokeMetadata;
}

export interface HandwritingCanvasDocument {
  readonly id: string; // UUID per drawing block
  readonly noteId: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly strokes: ReadonlyArray<VectorStroke>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
