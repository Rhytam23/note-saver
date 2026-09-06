import type { BlockDocument } from '../services/blockDocument';
import { CollaborationDocument } from './collaborationDocument';
import { SupabaseRealtimeProvider } from './realtimeProvider';
import { AwarenessManager } from './awarenessManager';
import {
  blockDocumentToYdoc,
  ydocToBlockDocument,
  applyLocalBlockUpdateToYdoc,
  YJS_ORIGIN_LOCAL,
  YJS_ORIGIN_REMOTE,
} from './yjsBlockAdapter';
import type {
  ICollaborationProvider,
  CollaborationSessionConfig,
  CollaborationStatus,
  Collaborator,
} from './collaborationTypes';

/**
 * NoteNirman 2.0 — Collaboration Session Manager
 * 
 * Manages active collaboration session lifecycle:
 * - Prevents duplicate session creation for the same note.
 * - Bridges local BlockDocument edits to Y.Doc and realtime transport.
 * - Listens to remote Yjs updates and reconciles cleanly.
 * - Manages presence awareness.
 * - Ensures zero resource/listener leaks on close.
 */
export class CollaborationManager {
  private colDoc: CollaborationDocument | null = null;
  private provider: ICollaborationProvider | null = null;
  private awareness: AwarenessManager | null = null;
  private config: CollaborationSessionConfig | null = null;
  private currentBlockDoc: BlockDocument | null = null;

  private docChangeListeners: Set<(doc: BlockDocument) => void> = new Set();
  private cleanupUnsubs: Array<() => void> = [];

  public async openSession(
    config: CollaborationSessionConfig,
    initialDoc: BlockDocument,
    customProvider?: ICollaborationProvider
  ): Promise<void> {
    // Guard against duplicate session for same note
    if (this.config?.noteId === config.noteId && this.provider?.status === 'connected') {
      return;
    }

    await this.closeSession();

    this.config = config;
    this.currentBlockDoc = initialDoc;
    this.colDoc = new CollaborationDocument(config.noteId);

    // Initialize Y.Doc from initial BlockDocument
    blockDocumentToYdoc(initialDoc, this.colDoc.getDoc(), YJS_ORIGIN_LOCAL);

    // Initialize awareness
    this.awareness = new AwarenessManager({
      id: config.userId,
      name: config.userName,
      avatar: config.userAvatar,
      online: true,
      lastActiveAt: new Date().toISOString(),
    });

    // Listen to Y.Doc update events
    const ydoc = this.colDoc.getDoc();
    const handleYdocUpdate = (update: Uint8Array, origin: any) => {
      // Reconstruct local BlockDocument representation
      const updatedDoc = ydocToBlockDocument(config.noteId, ydoc);
      this.currentBlockDoc = updatedDoc;
      this.docChangeListeners.forEach(h => h(updatedDoc));

      // Broadcast remote update if origin was local
      if (origin !== YJS_ORIGIN_REMOTE && origin !== 'provider-remote' && this.provider) {
        this.provider.sendDocUpdate(update, YJS_ORIGIN_LOCAL);
      }
    };
    ydoc.on('update', handleYdocUpdate);
    this.cleanupUnsubs.push(() => ydoc.off('update', handleYdocUpdate));

    // Connect transport provider
    this.provider = customProvider || new SupabaseRealtimeProvider();

    // Subscribe to remote doc updates
    const unsubRemoteDoc = this.provider.onDocUpdate((update: Uint8Array) => {
      if (this.colDoc && !this.colDoc.isDestroyed()) {
        this.colDoc.applyUpdate(update, YJS_ORIGIN_REMOTE);
      }
    });
    this.cleanupUnsubs.push(unsubRemoteDoc);

    // Subscribe to remote awareness updates
    const unsubAwareness = this.provider.onAwareness((remoteCollaborators) => {
      this.awareness?.setRemoteCollaborators(remoteCollaborators);
    });
    this.cleanupUnsubs.push(unsubAwareness);

    await this.provider.connect(config);
  }

  public async closeSession(): Promise<void> {
    this.cleanupUnsubs.forEach(unsub => unsub());
    this.cleanupUnsubs = [];

    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
    }

    if (this.colDoc) {
      this.colDoc.destroy();
      this.colDoc = null;
    }

    if (this.awareness) {
      this.awareness.destroy();
      this.awareness = null;
    }

    this.config = null;
    this.currentBlockDoc = null;
    this.docChangeListeners.clear();
  }

  public updateLocalDocument(newDoc: BlockDocument): void {
    if (!this.colDoc || this.colDoc.isDestroyed()) return;
    this.currentBlockDoc = newDoc;
    applyLocalBlockUpdateToYdoc(this.colDoc.getDoc(), newDoc, YJS_ORIGIN_LOCAL);
  }

  public getLatestDocument(): BlockDocument | null {
    return this.currentBlockDoc;
  }

  public getStatus(): CollaborationStatus {
    return this.provider?.status || 'disconnected';
  }

  public getCollaborators(): Collaborator[] {
    return this.awareness?.getActiveCollaborators() || [];
  }

  public onDocumentChange(handler: (doc: BlockDocument) => void): () => void {
    this.docChangeListeners.add(handler);
    return () => this.docChangeListeners.delete(handler);
  }

  public onCollaboratorsChange(handler: (collaborators: Collaborator[]) => void): () => void {
    if (!this.awareness) return () => {};
    return this.awareness.subscribe(handler);
  }

  public onStatusChange(handler: (status: CollaborationStatus) => void): () => void {
    if (!this.provider) return () => {};
    return this.provider.onStatusChange(handler);
  }
}
