import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attachment } from '../types/attachment';

export interface IAttachmentStorage {
  saveAttachment(attachment: Attachment, data: Blob | ArrayBuffer): Promise<Attachment>;
  readAttachmentData(attachmentId: string): Promise<Blob | null>;
  getAttachmentMeta(attachmentId: string): Promise<Attachment | null>;
  deleteAttachment(attachmentId: string): Promise<boolean>;
  listAttachmentsForNote(noteId: string): Promise<Attachment[]>;
}

interface AttachmentDB extends DBSchema {
  metadata: {
    key: string;
    value: Attachment;
    indexes: { 'by-note': string };
  };
  blobs: {
    key: string;
    value: Blob;
  };
}

const DB_NAME = 'notenirman-attachments-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AttachmentDB>> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function getDB(): Promise<IDBPDatabase<AttachmentDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AttachmentDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('metadata')) {
          const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
          metaStore.createIndex('by-note', 'noteId');
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs');
        }
      },
    });
  }
  return dbPromise;
}

export class HybridAttachmentStorage implements IAttachmentStorage {
  private memMeta: Map<string, Attachment> = new Map();
  private memBlobs: Map<string, Blob> = new Map();

  public async saveAttachment(attachment: Attachment, data: Blob | ArrayBuffer): Promise<Attachment> {
    const blob = data instanceof Blob ? data : new Blob([data], { type: attachment.mimeType });

    if (!isIndexedDbAvailable()) {
      this.memMeta.set(attachment.id, { ...attachment });
      this.memBlobs.set(attachment.id, blob);
      return { ...attachment };
    }

    const db = await getDB();
    const tx = db.transaction(['metadata', 'blobs'], 'readwrite');
    await tx.objectStore('metadata').put(attachment);
    await tx.objectStore('blobs').put(blob, attachment.id);
    await tx.done;

    return { ...attachment };
  }

  public async readAttachmentData(attachmentId: string): Promise<Blob | null> {
    if (!isIndexedDbAvailable()) {
      return this.memBlobs.get(attachmentId) || null;
    }

    const db = await getDB();
    const blob = await db.get('blobs', attachmentId);
    return blob || null;
  }

  public async getAttachmentMeta(attachmentId: string): Promise<Attachment | null> {
    if (!isIndexedDbAvailable()) {
      const meta = this.memMeta.get(attachmentId);
      return meta ? { ...meta } : null;
    }

    const db = await getDB();
    const meta = await db.get('metadata', attachmentId);
    return meta ? { ...meta } : null;
  }

  public async deleteAttachment(attachmentId: string): Promise<boolean> {
    if (!isIndexedDbAvailable()) {
      this.memMeta.delete(attachmentId);
      this.memBlobs.delete(attachmentId);
      return true;
    }

    const db = await getDB();
    const tx = db.transaction(['metadata', 'blobs'], 'readwrite');
    await tx.objectStore('metadata').delete(attachmentId);
    await tx.objectStore('blobs').delete(attachmentId);
    await tx.done;
    return true;
  }

  public async listAttachmentsForNote(noteId: string): Promise<Attachment[]> {
    if (!isIndexedDbAvailable()) {
      const list: Attachment[] = [];
      this.memMeta.forEach(meta => {
        if (meta.noteId === noteId) list.push({ ...meta });
      });
      return list;
    }

    const db = await getDB();
    const list = await db.getAllFromIndex('metadata', 'by-note', noteId);
    return list || [];
  }
}

export const attachmentStorage = new HybridAttachmentStorage();
