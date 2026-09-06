import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { SearchDocument, SearchDocumentId } from '../types/search';

interface LexicalDB extends DBSchema {
  documents: {
    key: SearchDocumentId;
    value: SearchDocument;
    indexes: {
      'by-note': string;
      'by-deleted': number; // 0 for false, 1 for true
    };
  };
}

const DB_NAME = 'notenirman-lexical-index';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LexicalDB>> | null = null;

function isIndexedDbSupported(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined';
}

function getDB(): Promise<IDBPDatabase<LexicalDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LexicalDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-deleted', 'isDeleted' as any);
        }
      },
    });
  }
  return dbPromise;
}

export class LexicalIndexDbStore {
  private memDocs: Map<SearchDocumentId, SearchDocument> = new Map();

  public async saveDocument(doc: SearchDocument): Promise<void> {
    this.memDocs.set(doc.id, doc);
    if (!isIndexedDbSupported()) return;
    try {
      const db = await getDB();
      await db.put('documents', doc);
    } catch {
      // Memory fallback active
    }
  }

  public async saveDocuments(docs: SearchDocument[]): Promise<void> {
    for (const doc of docs) {
      this.memDocs.set(doc.id, doc);
    }
    if (!isIndexedDbSupported()) return;
    try {
      const db = await getDB();
      const tx = db.transaction('documents', 'readwrite');
      for (const doc of docs) {
        await tx.store.put(doc);
      }
      await tx.done;
    } catch {
      // Memory fallback active
    }
  }

  public async getDocument(id: SearchDocumentId): Promise<SearchDocument | null> {
    if (this.memDocs.has(id)) {
      return this.memDocs.get(id) || null;
    }
    if (!isIndexedDbSupported()) return null;
    try {
      const db = await getDB();
      const doc = await db.get('documents', id);
      if (doc) {
        this.memDocs.set(doc.id, doc);
        return doc;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  public async getDocumentsForNote(noteId: string): Promise<SearchDocument[]> {
    if (isIndexedDbSupported()) {
      try {
        const db = await getDB();
        const docs = await db.getAllFromIndex('documents', 'by-note', noteId);
        if (docs.length > 0) {
          for (const d of docs) this.memDocs.set(d.id, d);
          return docs;
        }
      } catch {
        // Memory fallback
      }
    }
    return Array.from(this.memDocs.values()).filter(d => d.noteId === noteId);
  }

  public async getAllDocuments(): Promise<SearchDocument[]> {
    if (isIndexedDbSupported()) {
      try {
        const db = await getDB();
        const docs = await db.getAll('documents');
        for (const d of docs) this.memDocs.set(d.id, d);
        return docs;
      } catch {
        // Memory fallback
      }
    }
    return Array.from(this.memDocs.values());
  }

  public async deleteDocument(id: SearchDocumentId): Promise<void> {
    this.memDocs.delete(id);
    if (!isIndexedDbSupported()) return;
    try {
      const db = await getDB();
      await db.delete('documents', id);
    } catch {
      // Memory fallback
    }
  }

  public async deleteDocumentsForNote(noteId: string): Promise<void> {
    const docs = await this.getDocumentsForNote(noteId);
    for (const d of docs) {
      this.memDocs.delete(d.id);
    }
    if (!isIndexedDbSupported()) return;
    try {
      const db = await getDB();
      const tx = db.transaction('documents', 'readwrite');
      for (const d of docs) {
        await tx.store.delete(d.id);
      }
      await tx.done;
    } catch {
      // Memory fallback
    }
  }

  public async clearAll(): Promise<void> {
    this.memDocs.clear();
    if (!isIndexedDbSupported()) return;
    try {
      const db = await getDB();
      await db.clear('documents');
    } catch {
      // Memory fallback
    }
  }
}

export const lexicalIndexDb = new LexicalIndexDbStore();
