import * as Y from 'yjs';

/**
 * NoteNirman 2.0 — Y.Doc Collaborative State Manager
 * 
 * Encapsulates the Yjs Y.Doc structure for a note:
 * 1. `blocks`: Y.Map<Y.Map<any>> mapping blockId -> Block fields
 * 2. `blockOrder`: Y.Array<string> holding ordered list of blockId UUIDs
 * 
 * Invariants:
 * - Stable block identity (blockId UUID is primary key).
 * - Array indexes are NEVER used as block identity.
 * - Framework-independent, pure CRDT wrapper.
 */
export class CollaborationDocument {
  private doc: Y.Doc;
  private destroyed = false;

  constructor(docName?: string) {
    this.doc = new Y.Doc({ gc: true });
    if (docName) {
      this.doc.clientID = Math.floor(Math.random() * 1000000);
    }
  }

  public getDoc(): Y.Doc {
    return this.doc;
  }

  public getBlocksMap(): Y.Map<Y.Map<any>> {
    return this.doc.getMap<Y.Map<any>>('blocks');
  }

  public getBlockOrderArray(): Y.Array<string> {
    return this.doc.getArray<string>('blockOrder');
  }

  /**
   * Apply an encoded Yjs update (Uint8Array) to this document safely.
   */
  public applyUpdate(update: Uint8Array, origin?: string): void {
    if (this.destroyed) return;
    Y.applyUpdate(this.doc, update, origin);
  }

  /**
   * Encode the current document state as a full Yjs update vector.
   */
  public encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  public destroy(): void {
    if (!this.destroyed) {
      this.doc.destroy();
      this.destroyed = true;
    }
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }
}
